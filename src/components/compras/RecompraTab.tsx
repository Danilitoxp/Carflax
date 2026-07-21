import { useState, useMemo } from "react";
import {
  AlertTriangle, PackageSearch, TrendingUp, Boxes, Search,
  ShoppingBag, LayoutGrid, List, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendaGrande } from "@/lib/api";

interface RecompraTabProps {
  rows: VendaGrande[];
  dias: number;
  setDias: (n: number) => void;
  fator: number;
  setFator: (n: number) => void;
  onNovaCotacao: (item: VendaGrande) => void;
}

type FilterUrgency = "todos" | "critico" | "baixo" | "alto";

export function RecompraTab({
  rows,
  dias,
  setDias,
  fator,
  setFator,
  onNovaCotacao,
}: RecompraTabProps) {
  const [busca, setBusca] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<FilterUrgency>("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const brNum = (n: number, dec = 0) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const brMoney = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (s?: string | null) => {
    if (!s) return "—";
    const [y, m, d] = s.split("-");
    return d && m && y ? `${d}/${m}/${y}` : s;
  };

  const counts = useMemo(() => {
    const critico = rows.filter((r) => r.estoque_atual != null && r.estoque_atual <= 0).length;
    const baixo = rows.filter(
      (r) => r.estoque_atual != null && r.estoque_atual > 0 && r.estoque_atual < r.qtd
    ).length;
    const alto = rows.filter((r) => r.ratio >= 8).length;
    return { todos: rows.length, critico, baixo, alto };
  }, [rows]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((v) => {
      const matchSearch =
        !q ||
        v.item.toLowerCase().includes(q) ||
        v.cod_item.toLowerCase().includes(q) ||
        v.cliente.toLowerCase().includes(q) ||
        (v.marca && v.marca.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const critico = v.estoque_atual != null && v.estoque_atual <= 0;
      const baixo = v.estoque_atual != null && v.estoque_atual > 0 && v.estoque_atual < v.qtd;

      if (filterUrgency === "critico") return critico;
      if (filterUrgency === "baixo") return baixo;
      if (filterUrgency === "alto") return v.ratio >= 8;
      return true;
    });
  }, [rows, busca, filterUrgency]);

  const handleCopyWhatsApp = (v: VendaGrande, e: React.MouseEvent) => {
    e.stopPropagation();
    const txt = `⚠️ *ALERTA DE RECOMPRA - CARFLAX HUB*
────────────────────────────
📦 *Produto:* ${v.item} (#${v.cod_item})
🏷️ *Marca:* ${v.marca || "Não informada"}
🛍️ *Venda Atípica:* ${brNum(v.qtd)} un. (Pedido: ${v.documento.replace(/^0+/, "")})
📈 *Pico de Demanda:* ${v.ratio.toFixed(1)}x a média histórica (${brNum(v.media_item, 1)} un/venda)
📦 *Estoque Atual:* ${v.estoque_atual == null ? "Sem dados" : brNum(v.estoque_atual)} un.
${v.estoque_atual != null && v.estoque_atual <= 0 ? "🚨 *STATUS:* ESTOQUE CRÍTICO / RUPTURA" : "⚠️ *STATUS:* NECESSITA REPOSIÇÃO"}
📅 *Data do Pedido:* ${fmtDate(v.data)} · Cliente: ${v.cliente}`;

    navigator.clipboard.writeText(txt);
    const key = `${v.documento}-${v.cod_item}`;
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Search & Parameters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto, código ou cliente..."
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Dropdowns (Period & Factor) + View switcher */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Período
            </span>
            <select
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="bg-transparent outline-none text-xs font-bold text-foreground cursor-pointer"
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Sensibilidade
            </span>
            <select
              value={fator}
              onChange={(e) => setFator(Number(e.target.value))}
              className="bg-transparent outline-none text-xs font-bold text-foreground cursor-pointer"
            >
              <option value={3}>≥ 3× média</option>
              <option value={5}>≥ 5× média</option>
              <option value={8}>≥ 8× média</option>
              <option value={10}>≥ 10× média</option>
            </select>
          </div>

          {/* View switcher */}
          <div className="flex bg-card border border-border p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterUrgency("todos")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
            filterUrgency === "todos"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
          )}
        >
          Todos ({counts.todos})
        </button>

        <button
          onClick={() => setFilterUrgency("critico")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
            filterUrgency === "critico"
              ? "bg-rose-500 text-white border-rose-500"
              : "bg-card text-rose-500 border-border hover:bg-rose-500/10"
          )}
        >
          🔥 Estoque Crítico ({counts.critico})
        </button>

        <button
          onClick={() => setFilterUrgency("baixo")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
            filterUrgency === "baixo"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-card text-amber-500 border-border hover:bg-amber-500/10"
          )}
        >
          ⚠️ Estoque Baixo ({counts.baixo})
        </button>

        <button
          onClick={() => setFilterUrgency("alto")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
            filterUrgency === "alto"
              ? "bg-indigo-500 text-white border-indigo-500"
              : "bg-card text-indigo-500 border-border hover:bg-indigo-500/10"
          )}
        >
          📈 Pico Severo (≥8x) ({counts.alto})
        </button>
      </div>

      {/* Main Content */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground bg-card border border-border rounded-3xl shadow-xs">
          <PackageSearch className="w-8 h-8 opacity-30 text-primary" />
          <p className="text-xs font-black uppercase tracking-wider text-foreground">
            Nenhum alerta de recompra no período
          </p>
          <p className="text-xs">
            Nenhuma venda atípica ≥ {fator}× a média nos últimos {dias} dias.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map((v, i) => {
            const critico = v.estoque_atual != null && v.estoque_atual <= 0;
            const baixo = v.estoque_atual != null && v.estoque_atual > 0 && v.estoque_atual < v.qtd;
            const itemKey = `${v.documento}-${v.cod_item}-${i}`;
            const isCopied = copiedId === `${v.documento}-${v.cod_item}`;

            return (
              <div
                key={itemKey}
                className={cn(
                  "bg-card border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group",
                  critico
                    ? "border-rose-500/40"
                    : baixo
                    ? "border-amber-500/30"
                    : "border-border"
                )}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {critico ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            🔥 Ruptura de Estoque
                          </span>
                        ) : baixo ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            ⚠️ Recompra Recomendada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            Venda Atípica
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{v.cod_item}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">
                        {v.item}
                      </h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {v.marca ? `${v.marca} · ` : ""}Ped. #{v.documento.replace(/^0+/, "")}
                      </p>
                    </div>

                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {brNum(v.ratio, 1)}× média
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 my-3">
                    <div className="bg-secondary/40 rounded-xl p-2 border border-border/40">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        Qtd Vendida
                      </p>
                      <p className="text-sm font-black text-foreground mt-0.5">{brNum(v.qtd)}</p>
                    </div>

                    <div className="bg-secondary/40 rounded-xl p-2 border border-border/40">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        Média / Venda
                      </p>
                      <p className="text-sm font-black text-muted-foreground mt-0.5">
                        {brNum(v.media_item, 1)}
                      </p>
                    </div>

                    <div className="bg-secondary/40 rounded-xl p-2 border border-border/40">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Boxes className="w-3 h-3" /> Estoque
                      </p>
                      <p
                        className={cn(
                          "text-sm font-black mt-0.5",
                          critico
                            ? "text-rose-500"
                            : baixo
                            ? "text-amber-500"
                            : "text-emerald-500"
                        )}
                      >
                        {v.estoque_atual == null ? "—" : brNum(v.estoque_atual)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                    <span className="truncate max-w-[180px]" title={v.cliente}>
                      👤 {v.cliente}
                    </span>
                    <span>
                      {fmtDate(v.data)} · {brMoney(v.valor)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => handleCopyWhatsApp(v, e)}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                        isCopied
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          : "bg-card border-border text-foreground hover:bg-secondary"
                      )}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-blue-500" /> WhatsApp
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onNovaCotacao(v)}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Cotar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/30">
                  <th className="py-3 px-4 text-left">Produto / Cód</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Vendido</th>
                  <th className="py-3 px-4 text-center">Média</th>
                  <th className="py-3 px-4 text-center">Pico</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((v, i) => {
                  const critico = v.estoque_atual != null && v.estoque_atual <= 0;
                  const baixo = v.estoque_atual != null && v.estoque_atual > 0 && v.estoque_atual < v.qtd;

                  return (
                    <tr key={`${v.documento}-${v.cod_item}-${i}`} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-foreground leading-tight">{v.item}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          #{v.cod_item} {v.marca ? `· ${v.marca}` : ""}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {critico ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase border border-rose-500/20">
                            Ruptura
                          </span>
                        ) : baixo ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase border border-amber-500/20">
                            Baixo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase border border-blue-500/20">
                            Atípico
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-foreground">{brNum(v.qtd)}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{brNum(v.media_item, 1)}</td>
                      <td className="py-3 px-4 text-center font-black text-blue-500">
                        {brNum(v.ratio, 1)}x
                      </td>
                      <td className="py-3 px-4 text-center font-black">
                        <span
                          className={
                            critico
                              ? "text-rose-500"
                              : baixo
                              ? "text-amber-500"
                              : "text-emerald-500"
                          }
                        >
                          {v.estoque_atual == null ? "—" : brNum(v.estoque_atual)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNovaCotacao(v)}
                          className="px-3 py-1 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                        >
                          Cotar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info footer */}
      <p className="text-[10px] text-muted-foreground font-medium px-1 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 opacity-80" />
        <span>
          Dispara alerta quando uma venda pontual do item é ≥ {fator}× a média histórica nos últimos 6 meses (piso de 10 un).
        </span>
      </p>
    </div>
  );
}
