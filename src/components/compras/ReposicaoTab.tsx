import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Search, RefreshCw, Copy, Check, ShieldAlert, TrendingDown, PackageX,
  Layers, AlertTriangle, Boxes, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiComprasReposicao, type ReposicaoItem, type ReposicaoResumo } from "@/lib/api";

type Vista = "comprar" | "ruptura" | "transito" | "excesso" | "todos";

const brNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const brMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function coberturaCor(dias: number | null) {
  if (dias == null) return "text-muted-foreground";
  if (dias <= 7) return "text-rose-500";
  if (dias <= 20) return "text-amber-500";
  return "text-emerald-500";
}

export function ReposicaoTab() {
  const [data, setData] = useState<ReposicaoItem[]>([]);
  const [resumo, setResumo] = useState<ReposicaoResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nivel, setNivel] = useState(95);
  const [cacheIdade, setCacheIdade] = useState<number | null>(null);

  const [vista, setVista] = useState<Vista>("comprar");
  const [busca, setBusca] = useState("");
  const [abcFiltro, setAbcFiltro] = useState<"todos" | "A" | "B" | "C">("todos");
  const [copiado, setCopiado] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await apiComprasReposicao({ nivel });
      if (r.computing) {
        setComputing(true);
        setLoading(true);
        pollRef.current = setTimeout(carregar, 5000); // aguarda o cálculo em background
        return;
      }
      setData(r.data || []);
      setResumo(r.resumo);
      setCacheIdade(r.cache?.idade_s ?? null);
      setComputing(false);
      setLoading(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o planejamento.");
      setLoading(false);
      setComputing(false);
    }
  }, [nivel]);

  useEffect(() => {
    setLoading(true);
    carregar();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [carregar]);

  // ── Prioridade de compra ────────────────────────────────────────────────────
  // "O que eu compro agora?". Score composto (maior = mais urgente), sempre sobre
  // o catálogo inteiro (independe de busca/filtro/vista):
  //   • Risco de prazo (PRINCIPAL): atraso = lead time − cobertura de estoque.
  //     Quanto maior o atraso, mais o estoque acaba antes de a reposição chegar.
  //   • Ruptura: item já sem estoque recebe um degrau forte pra frente.
  //   • Curva ABC e faturamento: dão preferência aos itens comercialmente pesados
  //     entre os de risco parecido (A/maior receita passam na frente).
  const { prioridade, proximos } = useMemo(() => {
    const cand = data.filter((x) => x.sugerido > 0 && x.d_dia > 0 && !x.irregular);
    if (cand.length === 0) return { prioridade: null, proximos: [] };

    const atrasoDe = (x: ReposicaoItem) => x.lead_time - (x.cobertura_dias ?? 0);
    const atrasos = cand.map(atrasoDe);
    const minAtraso = Math.min(...atrasos);
    const spanAtraso = Math.max(...atrasos) - minAtraso || 1;
    const maxReceita = Math.max(...cand.map((x) => x.receita || 0), 1);
    const abcPeso = (abc: string) => (abc === "A" ? 1 : abc === "B" ? 0.6 : 0.3);

    const score = (x: ReposicaoItem) => {
      const riscoPrazo = (atrasoDe(x) - minAtraso) / spanAtraso;   // 0..1 (considera lead time)
      const receita = (x.receita || 0) / maxReceita;               // 0..1 (faturamento)
      const emRuptura = x.saldo <= 0 || x.status === "RUPTURA";
      return (emRuptura ? 1 : 0) + 0.9 * riscoPrazo + 0.5 * abcPeso(x.abc) + 0.35 * receita;
    };

    const ranked = [...cand].sort((a, b) => score(b) - score(a));
    return { prioridade: ranked[0] ?? null, proximos: ranked.slice(1, 4) };
  }, [data]);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let arr = data.filter((x) => {
      if (abcFiltro !== "todos" && x.abc !== abcFiltro) return false;
      if (q && !(x.produto.toLowerCase().includes(q) || x.cod.includes(q) || x.fornecedor.toLowerCase().includes(q))) return false;
      if (vista === "comprar") return x.sugerido > 0;
      if (vista === "ruptura") return x.status === "RUPTURA";
      if (vista === "transito") return x.em_transito > 0; // já comprado, a caminho
      if (vista === "excesso") return x.status === "EXCESSO";
      return true;
    });
    if (vista === "excesso") arr.sort((a, b) => b.valor_estoque - a.valor_estoque);
    else if (vista === "ruptura") arr.sort((a, b) => (b.d_dia - a.d_dia));
    else if (vista === "transito") arr.sort((a, b) => b.em_transito - a.em_transito);
    else arr.sort((a, b) => b.valor_sugerido - a.valor_sugerido);
    return arr.slice(0, 400);
  }, [data, busca, abcFiltro, vista]);

  // O que já foi comprado e está a caminho (o backend só devolve o total somado
  // por produto — aqui consolidamos SKUs e unidades para o KPI e a vista Trânsito).
  const transito = useMemo(() => {
    const itens = data.filter((x) => x.em_transito > 0);
    return {
      skus: itens.length,
      unidades: itens.reduce((s, x) => s + x.em_transito, 0),
    };
  }, [data]);

  const copiarPedido = (x: ReposicaoItem) => {
    const txt = `🛒 *SUGESTÃO DE COMPRA - CARFLAX HUB*
────────────────────────────
📦 *Produto:* ${x.produto} (#${x.cod})${x.marca ? `\n🏷️ *Marca:* ${x.marca}` : ""}
🏬 *Fornecedor:* ${x.fornecedor || "A definir"} (lead time ~${brNum(x.lead_time, 0)}d)
🔢 *Quantidade Sugerida:* ${brNum(x.sugerido)} un.
📊 *Demanda:* ${brNum(x.d_dia, 1)} un/dia · Cobertura atual: ${x.cobertura_dias == null ? "—" : brNum(x.cobertura_dias) + " dias"}
📦 *Estoque:* ${brNum(x.saldo)} + ${brNum(x.em_transito)} em trânsito · ROP: ${brNum(x.rop)}
💰 *Custo estimado:* ${brMoney(x.valor_sugerido)}
Gerado via Carflax HUB · Reposição inteligente`;
    navigator.clipboard.writeText(txt);
    setCopiado(x.cod);
    setTimeout(() => setCopiado(null), 2500);
  };

  const [consolCopiado, setConsolCopiado] = useState(false);
  const copiarConsolidado = () => {
    // Agrupa a lista de compra (sugerido > 0) por fornecedor, respeitando filtro/busca atuais.
    const q = busca.trim().toLowerCase();
    const compra = data.filter((x) =>
      x.sugerido > 0 &&
      (abcFiltro === "todos" || x.abc === abcFiltro) &&
      (!q || x.produto.toLowerCase().includes(q) || x.cod.includes(q) || x.fornecedor.toLowerCase().includes(q))
    );
    if (compra.length === 0) { setConsolCopiado(false); return; }
    const grupos = new Map<string, ReposicaoItem[]>();
    for (const x of compra) {
      const k = x.fornecedor || "SEM FORNECEDOR";
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(x);
    }
    const blocos: string[] = [];
    for (const [forn, itens] of [...grupos.entries()].sort((a, b) =>
      b[1].reduce((s, x) => s + x.valor_sugerido, 0) - a[1].reduce((s, x) => s + x.valor_sugerido, 0))) {
      const total = itens.reduce((s, x) => s + x.valor_sugerido, 0);
      const linhas = itens
        .sort((a, b) => b.valor_sugerido - a.valor_sugerido)
        .map((x) => `• ${brNum(x.sugerido)} un — ${x.produto} (#${x.cod})${x.status === "RUPTURA" ? " 🔴" : ""}`)
        .join("\n");
      blocos.push(`🏬 *${forn}* — ~${brMoney(total)}\n${linhas}`);
    }
    const total = compra.reduce((s, x) => s + x.valor_sugerido, 0);
    const txt = `🛒 *PLANO DE COMPRAS CONSOLIDADO - CARFLAX HUB*
${new Date().toLocaleDateString("pt-BR")} · ${compra.length} itens · ~${brMoney(total)}
════════════════════════════
${blocos.join("\n\n")}
════════════════════════════
🔴 = ruptura · Gerado via Reposição inteligente`;
    navigator.clipboard.writeText(txt);
    setConsolCopiado(true);
    setTimeout(() => setConsolCopiado(false), 2500);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-primary">
          {computing ? "Gerando planejamento…" : "Carregando…"}
        </span>
        {computing && (
          <span className="text-[11px] text-muted-foreground max-w-xs">
            O motor está recalculando a demanda de todo o catálogo. Na primeira vez pode levar ~30s — depois fica instantâneo.
          </span>
        )}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 py-20 text-center">
        <PackageX className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-tight text-foreground">{erro}</p>
        <button onClick={carregar} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  const KPIS = [
    { label: "Ruptura", value: brNum(resumo?.ruptura ?? 0), icon: PackageX, tone: "text-rose-500 bg-rose-500/10", vista: "ruptura" as Vista },
    { label: "Abaixo do ROP", value: brNum(resumo?.abaixo_rop ?? 0), icon: TrendingDown, tone: "text-amber-500 bg-amber-500/10", vista: "comprar" as Vista },
    { label: "Comprar (estim.)", value: brMoney(resumo?.valor_comprar ?? 0), icon: ShieldAlert, tone: "text-primary bg-primary/10", vista: "comprar" as Vista },
    { label: "Já comprado (trânsito)", value: brNum(transito.skus), sub: `${brNum(transito.unidades)} un a caminho`, icon: Truck, tone: "text-blue-500 bg-blue-500/10", vista: "transito" as Vista },
    { label: "Capital parado", value: brMoney(resumo?.valor_parado ?? 0), icon: Boxes, tone: "text-indigo-500 bg-indigo-500/10", vista: "excesso" as Vista },
  ];

  return (
    <div className="space-y-4">
      {/* Prioridade de compra — primeira coisa que o comprador vê */}
      {prioridade && (
        <PrioridadeCard
          item={prioridade}
          proximos={proximos}
          copiado={copiado === prioridade.cod}
          onCopiar={() => copiarPedido(prioridade)}
          onVerProximo={(cod) => { setBusca(cod); setVista("comprar"); }}
        />
      )}

      {/* KPIs executivos (clicáveis → viram filtro) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <button key={k.label} onClick={() => setVista(k.vista)}
              className={cn("bg-card border rounded-2xl p-3.5 flex items-center gap-3 text-left transition-all hover:shadow-md",
                vista === k.vista ? "border-primary/50 ring-1 ring-primary/20" : "border-border")}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", k.tone)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg font-black text-foreground leading-tight truncate">{k.value}</p>
                {k.sub && <p className="text-[9px] font-bold text-muted-foreground truncate">{k.sub}</p>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de controles */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto, código ou fornecedor..."
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Vistas */}
          <div className="flex bg-card border border-border p-1 rounded-xl gap-1">
            {([["comprar", "Comprar"], ["ruptura", "Ruptura"], ["transito", "Trânsito"], ["excesso", "Excesso"], ["todos", "Todos"]] as [Vista, string][]).map(([v, lbl]) => (
              <button key={v} onClick={() => setVista(v)}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {lbl}
              </button>
            ))}
          </div>
          {/* ABC */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 h-10">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={abcFiltro} onChange={(e) => setAbcFiltro(e.target.value as "todos" | "A" | "B" | "C")}
              className="bg-transparent outline-none text-xs font-bold text-foreground cursor-pointer">
              <option value="todos">Curva ABC</option>
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </div>
          {/* Nível de serviço */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 h-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Serviço</span>
            <select value={nivel} onChange={(e) => setNivel(Number(e.target.value))}
              className="bg-transparent outline-none text-xs font-bold text-primary cursor-pointer">
              <option value={90}>90%</option><option value={95}>95%</option>
              <option value={98}>98%</option><option value={99}>99%</option>
            </select>
          </div>
          {/* Pedido consolidado por fornecedor */}
          <button onClick={copiarConsolidado}
            className={cn("h-10 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border transition-all",
              consolCopiado ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-primary text-primary-foreground border-primary hover:opacity-90")}>
            {consolCopiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Pedido p/ fornecedor</>}
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/30">
                <th className="py-3 px-4 text-left">Produto / Cód</th>
                <th className="py-3 px-3 text-center">ABC/XYZ</th>
                <th className="py-3 px-3 text-center">Demanda</th>
                <th className="py-3 px-3 text-center">Cobertura</th>
                <th className="py-3 px-3 text-center">Estoque · Trânsito</th>
                <th className="py-3 px-3 text-center">ROP (Seg.)</th>
                <th className="py-3 px-3 text-center">Sugerido</th>
                <th className="py-3 px-3 text-left">Fornecedor</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="py-14 text-center text-muted-foreground text-xs font-black uppercase tracking-wider">{vista === "transito" ? "Nenhuma compra a caminho" : "Nenhum item nesta vista"}</td></tr>
              ) : rows.map((x) => {
                const critico = x.status === "RUPTURA";
                return (
                  <tr key={x.cod} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {critico && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground leading-tight line-clamp-1">{x.produto || "—"}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            #{x.cod}{x.marca ? ` · ${x.marca}` : ""}
                            {x.irregular && <span className="ml-1 text-amber-500">· irregular</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black">
                        <span className={cn(x.abc === "A" ? "text-emerald-500" : x.abc === "B" ? "text-amber-500" : "text-muted-foreground")}>{x.abc}</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className={cn(x.xyz === "X" ? "text-emerald-500" : x.xyz === "Y" ? "text-amber-500" : "text-rose-400")}>{x.xyz}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-xs text-foreground">
                      {brNum(x.d_dia, 1)}<span className="text-muted-foreground text-[10px]">/dia</span>
                      {Math.abs(x.fator_sazonal - 1) >= 0.05 && (
                        <span className={cn("ml-1 text-[9px] font-black", x.fator_sazonal > 1 ? "text-emerald-500" : "text-amber-500")}
                          title={`Sazonalidade: ${x.fator_sazonal > 1 ? "alta" : "baixa"} temporada (fator ${brNum(x.fator_sazonal, 2)}) → previsão ${brNum(x.d_forecast, 1)}/dia`}>
                          {x.fator_sazonal > 1 ? "▲" : "▼"}{brNum(x.d_forecast, 1)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      <span className={cn("font-black text-xs", coberturaCor(x.cobertura_dias))}>
                        {x.cobertura_dias == null ? "—" : `${brNum(x.cobertura_dias)}d`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-xs">
                      <span className={cn(x.saldo <= 0 ? "text-rose-500 font-black" : "text-foreground")}>{brNum(x.saldo)}</span>
                      {x.em_transito > 0 && <span className="text-blue-500"> · +{brNum(x.em_transito)}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-xs text-muted-foreground">
                      {brNum(x.rop)} <span className="text-[10px]">({brNum(x.estoque_seguranca)})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {x.sugerido > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black text-xs border border-primary/20">{brNum(x.sugerido)}</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">{brMoney(x.valor_sugerido)}</span>
                        </div>
                      ) : x.irregular ? (
                        <span className="text-[9px] font-black text-amber-500 uppercase">avaliar</span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-left">
                      <p className="text-[11px] font-bold text-foreground line-clamp-1 max-w-[160px]">{x.fornecedor || "—"}</p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5" />~{brNum(x.lead_time)}d
                        {x.lead_time_estimado && <span className="text-amber-500">(estim.)</span>}
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button onClick={() => copiarPedido(x)}
                        className={cn("px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 border",
                          copiado === x.cod ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-card border-border text-foreground hover:bg-secondary")}>
                        {copiado === x.cod ? <><Check className="w-3 h-3 text-emerald-500" /> Ok</> : <><Copy className="w-3 h-3 text-blue-500" /> Pedido</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground font-medium px-1 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 opacity-80" />
        <span>
          ROP = demanda diária × lead time real do fornecedor + estoque de segurança estatístico (nível {nivel}%, considerando variação de demanda e de lead time). Posição desconta o que já está em trânsito. Itens de demanda irregular não recebem quantidade automática.
          {cacheIdade != null && <span className="ml-1 opacity-70">· dados de {cacheIdade < 60 ? "agora" : `${Math.round(cacheIdade / 60)} min atrás`}</span>}
        </span>
      </p>
    </div>
  );
}

// ── Card de prioridade ──────────────────────────────────────────────────────
// Destaca o item mais crítico a comprar. A urgência considera o lead time:
// folga = cobertura de estoque − lead time. Folga negativa = o pedido já deveria
// ter saído (o estoque acaba antes de a reposição chegar).
function PrioridadeCard({
  item, proximos, copiado, onCopiar, onVerProximo,
}: {
  item: ReposicaoItem;
  proximos: ReposicaoItem[];
  copiado: boolean;
  onCopiar: () => void;
  onVerProximo: (cod: string) => void;
}) {
  const emRuptura = item.saldo <= 0 || item.status === "RUPTURA";
  const folga = Math.round((item.cobertura_dias ?? 0) - item.lead_time);

  const urgencia = emRuptura
    ? "Sem estoque agora"
    : folga < 0
    ? `Pedido atrasado ${Math.abs(folga)}d`
    : folga === 0
    ? "Comprar hoje"
    : `Comprar em até ${folga}d`;

  // Crítico (vermelho): já rompeu ou o pedido está atrasado. Senão, atenção (âmbar).
  const critico = emRuptura || folga < 0;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl border p-5 md:p-6",
      critico
        ? "border-rose-500/30 bg-gradient-to-br from-rose-500/[0.07] via-card to-card"
        : "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] via-card to-card",
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", critico ? "bg-rose-500" : "bg-amber-500")} />

      <div className="flex flex-col lg:flex-row lg:items-center gap-5 pl-2">
        {/* Identidade do produto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", critico ? "bg-rose-500" : "bg-amber-500")} />
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", critico ? "bg-rose-500" : "bg-amber-500")} />
            </span>
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", critico ? "text-rose-500" : "text-amber-500")}>
              {emRuptura ? "Ruptura · comprar agora" : "Prioridade de compra"}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-foreground leading-tight line-clamp-2">
            {item.produto || "—"}
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
            #{item.cod}{item.marca ? ` · ${item.marca}` : ""} · curva {item.abc}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 text-sm">
            <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-bold text-foreground truncate">{item.fornecedor || "Fornecedor a definir"}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              · lead time ~{brNum(item.lead_time)}d{item.lead_time_estimado ? " (estim.)" : ""}
            </span>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4 lg:gap-6 shrink-0">
          <Metric
            label="Estoque"
            value={brNum(item.saldo)}
            sub={item.em_transito > 0 ? `+${brNum(item.em_transito)} trânsito` : "sem trânsito"}
            tone={item.saldo <= 0 ? "text-rose-500" : "text-foreground"}
          />
          <Metric label="Demanda" value={brNum(item.d_dia, 1)} sub="un/dia" />
          <Metric
            label="Cobertura"
            value={item.cobertura_dias == null ? "—" : `${brNum(item.cobertura_dias)}d`}
            sub={urgencia}
            tone={coberturaCor(item.cobertura_dias)}
          />
        </div>

        {/* Ação */}
        <div className="shrink-0 flex flex-col items-stretch lg:items-end gap-2 lg:pl-6 lg:border-l lg:border-border">
          <div className="text-center lg:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comprar</p>
            <p className="text-3xl font-black text-foreground leading-none">
              {brNum(item.sugerido)}<span className="text-base text-muted-foreground ml-1">un</span>
            </p>
            <p className="text-xs font-bold text-primary mt-0.5">{brMoney(item.valor_sugerido)}</p>
          </div>
          <button
            onClick={onCopiar}
            className={cn(
              "h-10 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 border transition-all",
              copiado
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-primary text-primary-foreground border-primary hover:opacity-90",
            )}
          >
            {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar pedido</>}
          </button>
        </div>
      </div>

      {/* Próximos da fila */}
      {proximos.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Na sequência</span>
          {proximos.map((p) => (
            <button
              key={p.cod}
              onClick={() => onVerProximo(p.cod)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/60 text-[11px] font-bold text-foreground transition-colors max-w-[240px]"
              title={p.produto}
            >
              {(p.saldo <= 0 || p.status === "RUPTURA") && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
              <span className="truncate">{p.produto || `#${p.cod}`}</span>
              <span className="text-muted-foreground whitespace-nowrap">· {brNum(p.sugerido)}un</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub, tone = "text-foreground" }: {
  label: string; value: string; sub: string; tone?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-black leading-tight tabular-nums", tone)}>{value}</p>
      <p className="text-[9px] font-bold text-muted-foreground mt-0.5 whitespace-nowrap">{sub}</p>
    </div>
  );
}
