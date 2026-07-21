import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Truck, Clock, ChevronRight, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FornecedorLeadTime } from "@/lib/api";

type SortKey = "media_dias" | "pedidos" | "fornecedor";
type LeadFilter = "todos" | "rapido" | "medio" | "lento";

interface LeadTimeTabProps {
  leadTimeData: FornecedorLeadTime[];
  onOpenDetalhes: (fornecedor: FornecedorLeadTime) => void;
  onNovaCotacao: (fornecedor: FornecedorLeadTime) => void;
}

function TableHeaderCell({
  k,
  children,
  className,
  sortKey,
  sortDir,
  onSort,
}: {
  k?: SortKey;
  children: React.ReactNode;
  className?: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className={cn(
        "py-3 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground select-none",
        className
      )}
    >
      {k ? (
        <button
          onClick={() => onSort(k)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
        >
          {children}
          <ArrowUpDown
            className={cn(
              "w-3 h-3 transition-transform",
              sortKey === k ? "text-primary" : "opacity-40 group-hover:opacity-70",
              sortKey === k && sortDir === "asc" && "rotate-180"
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function LeadTimeTab({
  leadTimeData,
  onOpenDetalhes,
  onNovaCotacao,
}: LeadTimeTabProps) {
  const [busca, setBusca] = useState("");
  const [filterType, setFilterType] = useState<LeadFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("media_dias");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const brNum = (n: number, dec = 0) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const fmtDate = (s?: string | null) => {
    if (!s) return "—";
    const [y, m, d] = s.split("-");
    return d && m && y ? `${d}/${m}/${y}` : s;
  };

  function getLeadColor(dias: number) {
    if (dias <= 7) {
      return {
        text: "text-emerald-500",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        bar: "bg-emerald-500",
        label: "Rápido (≤7d)",
      };
    }
    if (dias <= 20) {
      return {
        text: "text-amber-500",
        bg: "bg-amber-500/10 border-amber-500/20",
        bar: "bg-amber-500",
        label: "Médio (8-20d)",
      };
    }
    return {
      text: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/20",
      bar: "bg-rose-500",
      label: "Lento (>20d)",
    };
  }

  const counts = useMemo(() => {
    const rapido = leadTimeData.filter((f) => f.media_dias <= 7).length;
    const medio = leadTimeData.filter((f) => f.media_dias > 7 && f.media_dias <= 20).length;
    const lento = leadTimeData.filter((f) => f.media_dias > 20).length;
    return { todos: leadTimeData.length, rapido, medio, lento };
  }, [leadTimeData]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = leadTimeData.filter((f) => {
      const matchSearch =
        !q || f.fornecedor.toLowerCase().includes(q) || f.cod_fornecedor.includes(q);
      if (!matchSearch) return false;

      if (filterType === "rapido") return f.media_dias <= 7;
      if (filterType === "medio") return f.media_dias > 7 && f.media_dias <= 20;
      if (filterType === "lento") return f.media_dias > 20;
      return true;
    });

    arr.sort((a, b) => {
      let d = 0;
      if (sortKey === "fornecedor") d = a.fornecedor.localeCompare(b.fornecedor);
      else d = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? d : -d;
    });

    return arr;
  }, [leadTimeData, busca, filterType, sortKey, sortDir]);

  const maxMedia = useMemo(() => {
    return Math.max(1, ...leadTimeData.map((r) => r.media_dias));
  }, [leadTimeData]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "fornecedor" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar fornecedor ou código..."
            className="w-full pl-9 pr-8 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterType("todos")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
              filterType === "todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
            )}
          >
            Todos ({counts.todos})
          </button>

          <button
            onClick={() => setFilterType("rapido")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
              filterType === "rapido"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-card text-emerald-500 border-border hover:bg-emerald-500/10"
            )}
          >
            ⚡ Rápido ({counts.rapido})
          </button>

          <button
            onClick={() => setFilterType("medio")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
              filterType === "medio"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-card text-amber-500 border-border hover:bg-amber-500/10"
            )}
          >
            🟡 Médio ({counts.medio})
          </button>

          <button
            onClick={() => setFilterType("lento")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
              filterType === "lento"
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-card text-rose-500 border-border hover:bg-rose-500/10"
            )}
          >
            🔴 Lento ({counts.lento})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/30">
                <TableHeaderCell k="fornecedor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                  Fornecedor / Razão Social
                </TableHeaderCell>
                <TableHeaderCell k="pedidos" className="text-center" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                  Pedidos (6m)
                </TableHeaderCell>
                <TableHeaderCell k="media_dias" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                  Lead Time Médio
                </TableHeaderCell>
                <TableHeaderCell className="text-center" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                  Variação
                </TableHeaderCell>
                <TableHeaderCell className="text-center" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                  Última Entrada
                </TableHeaderCell>
                <TableHeaderCell className="text-right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                  Ações
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Truck className="w-8 h-8 opacity-30" />
                      <p className="text-xs font-black uppercase tracking-wider">
                        Nenhum fornecedor encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((f, idx) => {
                  const color = getLeadColor(f.media_dias);
                  const pct = Math.min(100, Math.max(8, (f.media_dias / maxMedia) * 100));

                  return (
                    <tr
                      key={f.cod_fornecedor}
                      className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors group cursor-pointer"
                      onClick={() => onOpenDetalhes(f)}
                    >
                      {/* Fornecedor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground shrink-0 border border-border/60">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                              {f.fornecedor}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                              Cód: {f.cod_fornecedor}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Pedidos */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-secondary text-xs font-black text-foreground">
                          {brNum(f.pedidos)}
                        </span>
                      </td>

                      {/* Lead Time visual bar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className={cn("text-xs font-black tabular-nums min-w-[45px]", color.text)}>
                            {brNum(f.media_dias, 1)}d
                          </span>
                          <div className="flex-1 max-w-[140px] h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", color.bar)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              color.bg,
                              color.text
                            )}
                          >
                            {color.label}
                          </span>
                        </div>
                      </td>

                      {/* Variação */}
                      <td className="py-3 px-4 text-center text-xs font-bold text-muted-foreground tabular-nums">
                        {brNum(f.min_dias)}d – {brNum(f.max_dias)}d
                      </td>

                      {/* Última entrada */}
                      <td className="py-3 px-4 text-center text-xs font-semibold text-muted-foreground">
                        {fmtDate(f.ultima_entrada)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenDetalhes(f)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onNovaCotacao(f)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Simular cotação de compra"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explication */}
      <p className="text-[10px] text-muted-foreground font-medium px-1 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 opacity-60" />
        <span>
          Lead Time médio = diferença em dias entre a emissão do pedido e a entrada da NF no ERP nos últimos 6 meses.
        </span>
      </p>
    </div>
  );
}
