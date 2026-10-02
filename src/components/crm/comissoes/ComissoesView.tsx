import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, Calendar, Check, ChevronDown, DollarSign, Download,
  Gift, Loader2, Lock, Percent, Search, Settings, SlidersHorizontal, TrendingUp, User, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  carregarComissoes, isDiretoria, podeVerComissoes,
  type ComissaoUserProfile, type DadosComissoes, type EquipeComissao,
  type LinhaComissao, type StatusBonus,
} from "./comissao-service";
import { ParametrosModal } from "./ParametrosModal";
import { exportarComissoes } from "./comissao-export";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

/** Atingimento em %, limitado para a barra não estourar o container. */
const atingimento = (realizado: number, alvo: number) => (alvo > 0 ? (realizado / alvo) * 100 : 0);

type FiltroPagamento = "todos" | "recebem" | "zerados";

const FILTROS: { id: FiltroPagamento; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "recebem", label: "Com valor a receber" },
  { id: "zerados", label: "Sem valor a receber" },
];

interface ComissoesViewProps {
  userProfile?: ComissaoUserProfile | null;
}

export function ComissoesView({ userProfile }: ComissoesViewProps) {
  const [mesRef, setMesRef] = useState<Date>(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [dados, setDados] = useState<DadosComissoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [paramsAberto, setParamsAberto] = useState(false);
  const [mesAberto, setMesAberto] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtro, setFiltro] = useState<FiltroPagamento>("todos");
  const [busca, setBusca] = useState("");
  const [equipeAtiva, setEquipeAtiva] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const permitido = podeVerComissoes(userProfile);
  const podeEditar = isDiretoria(userProfile);

  const perfilKey = [
    userProfile?.id, userProfile?.role, userProfile?.department,
    userProfile?.operator_code || userProfile?.operatorCode,
    userProfile?.is_admin, userProfile?.is_leader,
  ].join("|");

  useEffect(() => {
    if (!permitido || !userProfile) return;
    let cancelado = false;

    (async () => {
      try {
        const d = await carregarComissoes(mesRef, userProfile);
        if (cancelado) return;
        setDados(d);
        setErro(null);
        setEquipeAtiva((prev) => (prev && d.equipes.some((e) => e.id === prev) ? prev : d.equipes[0]?.id ?? null));
      } catch (err) {
        if (!cancelado) setErro(err instanceof Error ? err.message : "Erro ao carregar as comissões");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => { cancelado = true; };
    // userProfile sai das deps de propósito: o que importa dele está em perfilKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesRef, permitido, perfilKey, recarga]);

  const recarregar = () => { setLoading(true); setRecarga((n) => n + 1); };

  const equipe: EquipeComissao | null = useMemo(
    () => dados?.equipes.find((e) => e.id === equipeAtiva) ?? dados?.equipes[0] ?? null,
    [dados, equipeAtiva],
  );

  /** Vendedores da equipe em foco — os cards do topo falam dela, não da soma. */
  const daEquipe = useMemo(
    () => (dados?.linhas || []).filter((l) => !equipe || l.equipeId === equipe.id),
    [dados, equipe],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daEquipe.filter((l) => {
      if (termo && !l.nome.toLowerCase().includes(termo)) return false;
      if (filtro === "recebem") return l.resultado.total > 0;
      if (filtro === "zerados") return l.resultado.total <= 0;
      return true;
    });
  }, [daEquipe, busca, filtro]);

  const linha = useMemo(
    () => visiveis.find((l) => l.codVendedor === selecionado) ?? visiveis[0] ?? null,
    [visiveis, selecionado],
  );

  const totalPagar = useMemo(() => daEquipe.reduce((acc, l) => acc + l.resultado.total, 0), [daEquipe]);
  const comValor = useMemo(() => daEquipe.filter((l) => l.resultado.total > 0).length, [daEquipe]);

  if (!permitido) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Tela restrita</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          As comissões ficam visíveis apenas para a diretoria e para os supervisores,
          que veem os próprios liderados.
        </p>
      </div>
    );
  }

  const trocarMes = (ano: number, mes: number) => {
    setLoading(true);
    setMesAberto(false);
    setMesRef(new Date(ano, mes, 1));
  };

  const exportar = () =>
    dados && exportarComissoes({
      linhas: visiveis,
      equipes: dados.equipes,
      parametros: dados.parametros,
      mesRef,
      equipeFoco: dados.equipes.length > 1 ? equipe : null,
    });

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Comissões</h1>
          <p className="text-xs text-muted-foreground">Resultados da equipe e remuneração variável</p>
        </div>

        <div className="flex items-center gap-2">
          {dados && dados.equipes.length > 1 && (
            <select
              value={equipe?.id ?? ""}
              onChange={(ev) => { setEquipeAtiva(ev.target.value); setSelecionado(null); }}
              className="bg-card border border-border rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
            >
              {dados.equipes.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMesAberto((v) => !v)}
              className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5 text-xs font-semibold hover:border-blue-500/50"
            >
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {MESES[mesRef.getMonth()]} de {mesRef.getFullYear()}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {mesAberto && (
              <div className="absolute right-0 mt-1 z-30 bg-card border border-border rounded-lg shadow-xl p-2 w-56">
                <div className="flex items-center justify-between px-1 pb-2">
                  <button type="button" className="text-xs px-2 py-1 rounded hover:bg-secondary"
                    onClick={() => setMesRef((d) => new Date(d.getFullYear() - 1, d.getMonth(), 1))}>
                    ‹
                  </button>
                  <span className="text-xs font-bold">{mesRef.getFullYear()}</span>
                  <button type="button" className="text-xs px-2 py-1 rounded hover:bg-secondary"
                    onClick={() => setMesRef((d) => new Date(d.getFullYear() + 1, d.getMonth(), 1))}>
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MESES.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => trocarMes(mesRef.getFullYear(), i)}
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-1.5 rounded hover:bg-secondary",
                        i === mesRef.getMonth() && "bg-blue-600 text-white hover:bg-blue-600",
                      )}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {podeEditar && (
            <button
              type="button"
              onClick={() => setParamsAberto(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-card border border-border rounded-lg px-3 py-2.5 hover:border-blue-500/50"
              title="Parâmetros da comissão"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={exportar}
            disabled={!dados || visiveis.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold bg-card border border-border rounded-lg px-3 py-2.5 hover:border-blue-500/50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* Indicadores da equipe em foco */}
      {dados && equipe && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
          <CardKpi
            icon={BarChart3}
            label="Faturamento da equipe"
            valor={brl(equipe.faturamento)}
            nota={`Meta ${brl(equipe.meta)}${equipe.metaCadastrada ? "" : " (somada)"}`}
            progresso={atingimento(equipe.faturamento, equipe.meta)}
          />
          <CardKpi
            icon={Percent}
            label="Margem bruta"
            valor={pct(equipe.margemPct)}
            nota={`Meta ${pct(dados.parametros.meta_margem_loja_pct)}`}
            progresso={atingimento(equipe.margemPct, dados.parametros.meta_margem_loja_pct)}
          />
          <CardKpi
            icon={DollarSign}
            label="Total a pagar"
            valor={brl(totalPagar)}
            nota="Comissões + bônus"
            destaque
          />
          <CardKpi
            icon={Users}
            label="Vendedores"
            valor={String(daEquipe.length)}
            nota={`${comValor} com valor a receber`}
          />
        </div>
      )}

      {dados?.conversaoIndisponivel && (
        <div className="flex items-start gap-2 text-[11px] bg-amber-50 dark:bg-amber-900/20 border border-amber-300/60 rounded-lg px-3 py-2 text-amber-800 dark:text-amber-200 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          Não foi possível carregar os orçamentos perdidos do mês. A conversão está contando como 100%,
          então o bônus de conversão aqui não vale — recarregue antes de pagar.
        </div>
      )}

      {erro && (
        <div className="text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-300/60 rounded-lg px-3 py-2 text-rose-700 dark:text-rose-300 shrink-0">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-semibold">Carregando comissões…</span>
        </div>
      ) : !dados || dados.linhas.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-xs text-muted-foreground">
          Nenhum vendedor no seu escopo com movimento neste mês.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-4 flex-1 min-h-0">
          {/* Tabela */}
          <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 shrink-0">
              <h2 className="text-sm font-black tracking-tight">Comissões por vendedor</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={busca}
                    onChange={(ev) => setBusca(ev.target.value)}
                    placeholder="Buscar vendedor..."
                    className="bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-xs w-48 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFiltroAberto((v) => !v)}
                    className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-2 text-xs font-semibold hover:border-blue-500/50"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    {FILTROS.find((f) => f.id === filtro)?.label}
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  {filtroAberto && (
                    <div className="absolute right-0 mt-1 z-30 bg-card border border-border rounded-lg shadow-xl py-1 w-52">
                      {FILTROS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => { setFiltro(f.id); setFiltroAberto(false); }}
                          className={cn(
                            "block w-full text-left text-xs px-3 py-1.5 hover:bg-secondary",
                            filtro === f.id && "text-blue-600 font-bold",
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="text-[10px] uppercase tracking-tight text-muted-foreground border-y border-border">
                    <th className="text-left font-bold px-4 py-2">Vendedor</th>
                    <th className="text-left font-bold px-3 py-2">Meta / Realizado</th>
                    <th className="px-3 py-2" />
                    <th className="text-right font-bold px-3 py-2">Margem</th>
                    <th className="text-right font-bold px-3 py-2">Conversão</th>
                    <th className="text-right font-bold px-3 py-2">Índice</th>
                    <th className="text-right font-bold px-3 py-2">Comissão</th>
                    <th className="text-right font-bold px-3 py-2">Bônus</th>
                    <th className="text-right font-bold px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => {
                    const ating = atingimento(l.entrada.faturado, l.entrada.metaVendedor);
                    const ativo = linha?.codVendedor === l.codVendedor;
                    return (
                      <tr
                        key={l.codVendedor}
                        onClick={() => setSelecionado(l.codVendedor)}
                        className={cn(
                          "border-b border-border/50 cursor-pointer transition-colors",
                          ativo
                            ? "bg-blue-50/60 dark:bg-blue-900/20 border-l-2 border-l-blue-500"
                            : "hover:bg-secondary/40",
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar nome={l.nome} url={l.avatar} />
                            <span className="font-bold text-foreground truncate max-w-[13rem]">{l.nome}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="text-[10px] text-muted-foreground">{brl(l.entrada.metaVendedor)}</div>
                          <div className="font-bold text-foreground">{brl(l.entrada.faturado)}</div>
                        </td>
                        <td className="px-3 py-2.5 w-40">
                          <Barra valor={ating} />
                          <div className={cn("text-[10px] font-bold text-right mt-0.5",
                            ating >= 100 ? "text-emerald-600" : "text-muted-foreground")}>
                            {pct(ating)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">{pct(l.entrada.margemPct)}</td>
                        <td className="px-3 py-2.5 text-right">{pct(l.entrada.conversaoPct)}</td>
                        <td className="px-3 py-2.5 text-right">{pct(l.resultado.indicePct)}</td>
                        <td className="px-3 py-2.5 text-right">{brl(l.resultado.valorComissao)}</td>
                        <td className="px-3 py-2.5 text-right">{brl(l.resultado.totalBonus)}</td>
                        <td className={cn("px-4 py-2.5 text-right font-black",
                          l.resultado.total > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {brl(l.resultado.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visiveis.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-10">
                  Nenhum vendedor com esse filtro.
                </p>
              )}
            </div>
          </div>

          {linha && (
            <div className="min-h-0 overflow-y-auto scrollbar-hide">
              <Detalhe linha={linha} />
            </div>
          )}
        </div>
      )}

      {/* Rodapé: a equipe inteira de relance */}
      {dados && equipe && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-black">Resultado da equipe</div>
              <div className="text-[10px] text-muted-foreground">
                Visão geral do desempenho da equipe no período
              </div>
            </div>
          </div>
          <RodapeMetrica
            icon={BarChart3}
            label="Faturamento da equipe"
            texto={`${brl(equipe.faturamento)} / ${brl(equipe.meta)}`}
            progresso={atingimento(equipe.faturamento, equipe.meta)}
          />
          <RodapeMetrica
            icon={Percent}
            label="Margem bruta da equipe"
            texto={`${pct(equipe.margemPct)} / ${pct(dados.parametros.meta_margem_loja_pct)}`}
            progresso={atingimento(equipe.margemPct, dados.parametros.meta_margem_loja_pct)}
          />
        </div>
      )}

      {paramsAberto && dados && (
        <ParametrosModal
          mesRef={mesRef}
          parametros={dados.parametros}
          equipes={dados.equipes}
          usuario={{ id: userProfile?.id, name: userProfile?.name }}
          onFechar={() => setParamsAberto(false)}
          onSalvo={() => { setParamsAberto(false); recarregar(); }}
        />
      )}
    </div>
  );
}

// ─── Peças ───────────────────────────────────────────────────────────────────

function Avatar({ nome, url }: { nome: string; url?: string | null }) {
  if (url) {
    return <img src={url} alt="" className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0"
      title={nome}>
      <User className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function Barra({ valor, tom }: { valor: number; tom?: "azul" | "verde" }) {
  const largura = Math.max(0, Math.min(100, valor));
  const cor = tom === "azul" ? "bg-blue-500" : valor >= 100 ? "bg-emerald-500" : "bg-blue-500/70";
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", cor)} style={{ width: `${largura}%` }} />
    </div>
  );
}

function CardKpi({ icon: Icon, label, valor, nota, progresso, destaque }: {
  icon: typeof Users; label: string; valor: string; nota: string;
  progresso?: number; destaque?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className={cn("text-xl font-black tracking-tight", destaque ? "text-blue-600" : "text-foreground")}>
            {valor}
          </div>
          <div className={cn("text-[10px]",
            progresso !== undefined && progresso >= 100 ? "text-emerald-600" : "text-muted-foreground")}>
            {nota}
          </div>
        </div>
      </div>
      {progresso !== undefined && (
        <div className="flex items-center gap-2 mt-2">
          <Barra valor={progresso} />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{pct(progresso)} da meta</span>
        </div>
      )}
    </div>
  );
}

function RodapeMetrica({ icon: Icon, label, texto, progresso }: {
  icon: typeof Users; label: string; texto: string; progresso: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-blue-600 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-xs font-bold">{texto}</div>
        <div className="flex items-center gap-2 mt-1">
          <Barra valor={progresso} />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{pct(progresso)} da meta</span>
        </div>
      </div>
    </div>
  );
}

const CHIP: Record<StatusBonus, { label: string; classe: string }> = {
  alcancada: { label: "Alcançada", classe: "bg-emerald-600/15 text-emerald-600" },
  pendente: { label: "Pendente", classe: "bg-amber-500/15 text-amber-600" },
  bloqueada: { label: "Bloqueada", classe: "bg-slate-500/15 text-muted-foreground" },
};

/** Painel do vendedor selecionado: o que ele recebe e por quê. */
function Detalhe({ linha }: { linha: LinhaComissao }) {
  const { resultado: r } = linha;
  // As três primeiras etapas são as que dependem só dele — o resto é da equipe.
  const individuais = r.bonus.slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
        <Avatar nome={linha.nome} url={linha.avatar} />
        <div className="min-w-0">
          <div className="text-sm font-black truncate">{linha.nome}</div>
          <div className="text-[10px] opacity-80">Detalhamento do vendedor</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="text-[11px] text-muted-foreground">Total a receber</div>
          <div className={cn("text-3xl font-black tracking-tight",
            r.total > 0 ? "text-emerald-600" : "text-muted-foreground")}>
            {brl(r.total)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/50 border border-border rounded-lg p-2.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground">Comissão</div>
              <div className="text-xs font-black truncate">{brl(r.valorComissao)}</div>
            </div>
          </div>
          <div className="bg-secondary/50 border border-border rounded-lg p-2.5 flex items-center gap-2">
            <Gift className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground">Bônus</div>
              <div className="text-xs font-black truncate">{brl(r.totalBonus)}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-black uppercase tracking-tight text-muted-foreground mb-2">
            Desempenho individual
          </div>
          <div className="space-y-3">
            {individuais.map((b) => {
              const ating = atingimento(b.realizadoNum, b.alvoNum);
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground truncate">{b.label}</span>
                    <span className="text-[11px] font-bold whitespace-nowrap">
                      {b.realizado} <span className="text-muted-foreground font-normal">/ {b.alvo}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Barra valor={ating} />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap w-12 text-right">
                      {pct(ating)}
                    </span>
                    {b.atingido
                      ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      : <span className="w-3.5 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-black uppercase tracking-tight text-muted-foreground mb-2">
            Bônus por metas
          </div>
          <div className="space-y-1.5">
            {r.bonus.map((b) => (
              <div key={b.label} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground truncate flex-1">{b.label}</span>
                <span className="text-[11px] font-bold whitespace-nowrap">{brl(b.valor)}</span>
                <span
                  className={cn("text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0",
                    CHIP[b.status].classe)}
                  title={`${b.realizado} / alvo ${b.alvo}`}
                >
                  {CHIP[b.status].label}
                  {b.status === "bloqueada" && <Lock className="w-2.5 h-2.5" />}
                  {b.status === "alcancada" && <Check className="w-2.5 h-2.5" />}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 text-[10px] bg-blue-600/10 rounded-lg px-2.5 py-2 text-blue-700 dark:text-blue-300">
          <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-px" />
          Bônus em cascata: cada etapa depende da anterior.
        </div>
      </div>
    </div>
  );
}
