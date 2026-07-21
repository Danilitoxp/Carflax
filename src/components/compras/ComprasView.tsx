import { useEffect, useMemo, useState } from "react";
import {
  Truck, AlertTriangle, PackageSearch, Timer, Search, RefreshCw,
  ArrowUpDown, TrendingUp, Boxes, ShoppingCart, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  apiComprasLeadTime, apiComprasVendasGrandes,
  type FornecedorLeadTime, type VendaGrande,
} from "@/lib/api";

type Tab = "leadtime" | "alertas";
type SortKey = "media_dias" | "pedidos" | "fornecedor";

const brNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const brMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
};

// Cor do lead time: rápido (verde) / médio (âmbar) / lento (vermelho).
function leadColor(dias: number) {
  if (dias <= 7) return { text: "text-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500", label: "Rápido" };
  if (dias <= 20) return { text: "text-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500", label: "Médio" };
  return { text: "text-rose-500", bg: "bg-rose-500/10", bar: "bg-rose-500", label: "Lento" };
}

function Kpi({ icon: Icon, label, value, sub, tone = "default" }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  tone?: "default" | "warning" | "good";
}) {
  const toneCls = tone === "warning" ? "text-rose-500 bg-rose-500/10"
    : tone === "good" ? "text-emerald-500 bg-emerald-500/10"
    : "text-blue-500 bg-blue-500/10";
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", toneCls)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-black text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[10px] font-bold text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function ComprasView() {
  const [tab, setTab] = useState<Tab>("leadtime");
  const [lead, setLead] = useState<FornecedorLeadTime[]>([]);
  const [vendas, setVendas] = useState<VendaGrande[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Lead time controls
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("media_dias");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Alertas controls
  const [dias, setDias] = useState(30);
  const [fator, setFator] = useState(5);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const [lt, vg] = await Promise.all([
        apiComprasLeadTime(6),
        apiComprasVendasGrandes({ dias, fator, piso: 10 }),
      ]);
      setLead(lt.success ? lt.data : []);
      setVendas(vg.success ? vg.data : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar dados de compras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dias, fator]);

  const leadFiltrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let arr = q ? lead.filter((f) => f.fornecedor.toLowerCase().includes(q) || f.cod_fornecedor.includes(q)) : [...lead];
    arr.sort((a, b) => {
      let d = 0;
      if (sortKey === "fornecedor") d = a.fornecedor.localeCompare(b.fornecedor);
      else d = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? d : -d;
    });
    return arr;
  }, [lead, busca, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const totalPedidos = lead.reduce((s, f) => s + f.pedidos, 0);
    const mediaGeral = totalPedidos > 0
      ? lead.reduce((s, f) => s + f.media_dias * f.pedidos, 0) / totalPedidos
      : 0;
    const lentos = lead.filter((f) => f.media_dias > 20).length;
    const estoqueCritico = vendas.filter((v) => v.estoque_atual != null && v.estoque_atual <= 0).length;
    return { totalPedidos, mediaGeral, lentos, estoqueCritico };
  }, [lead, vendas]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "fornecedor" ? "asc" : "desc"); }
  };

  return (
    <div className="p-6 pt-4 h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">Compras</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Inteligência de suprimentos
            </p>
          </div>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-2 px-4 h-10 rounded-xl bg-secondary text-foreground text-xs font-black uppercase tracking-widest hover:bg-secondary/70 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Timer} label="Lead time médio" value={`${brNum(kpis.mediaGeral, 1)} dias`} sub="Média ponderada (6 meses)" />
        <Kpi icon={Building2} label="Fornecedores" value={brNum(lead.length)} sub="Com pedidos recebidos" />
        <Kpi icon={TrendingUp} label="Fornecedores lentos" value={brNum(kpis.lentos)} sub="Média acima de 20 dias" tone={kpis.lentos > 0 ? "warning" : "default"} />
        <Kpi icon={AlertTriangle} label="Alertas de recompra" value={brNum(vendas.length)} sub={`${brNum(kpis.estoqueCritico)} com estoque crítico`} tone={vendas.length > 0 ? "warning" : "good"} />
      </div>

      {/* Tabs */}
      <div className="flex bg-secondary/60 p-1 rounded-2xl gap-1 mb-4 w-full max-w-md">
        <button
          onClick={() => setTab("leadtime")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
            tab === "leadtime" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground")}
        >
          <Truck className="w-4 h-4" /> Lead Time
        </button>
        <button
          onClick={() => setTab("alertas")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
            tab === "alertas" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground")}
        >
          <AlertTriangle className="w-4 h-4" /> Recompra
          {vendas.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px]">{vendas.length}</span>}
        </button>
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-sm font-bold mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs font-black uppercase tracking-widest">Carregando dados de compras...</span>
        </div>
      ) : tab === "leadtime" ? (
        <LeadTimeTab
          rows={leadFiltrado} busca={busca} setBusca={setBusca}
          sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort}
        />
      ) : (
        <AlertasTab rows={vendas} dias={dias} setDias={setDias} fator={fator} setFator={setFator} />
      )}
    </div>
  );
}

function LeadTimeTab({ rows, busca, setBusca, sortKey, sortDir, toggleSort }: {
  rows: FornecedorLeadTime[]; busca: string; setBusca: (v: string) => void;
  sortKey: SortKey; sortDir: "asc" | "desc"; toggleSort: (k: SortKey) => void;
}) {
  const maxMedia = Math.max(1, ...rows.map((r) => r.media_dias));
  const Th = ({ k, children, className }: { k?: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground", className)}>
      {k ? (
        <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          {children}<ArrowUpDown className={cn("w-3 h-3", sortKey === k ? "text-blue-500" : "opacity-40")} />
        </button>
      ) : children}
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-11 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar fornecedor..."
          className="flex-1 bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-secondary/40 border-b border-border">
              <tr>
                <Th k="fornecedor">Fornecedor</Th>
                <Th k="pedidos" className="text-center">Pedidos</Th>
                <Th k="media_dias">Tempo médio de entrega</Th>
                <Th className="text-center">Faixa</Th>
                <Th className="text-center">Última entrada</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground text-sm font-bold">Nenhum fornecedor encontrado.</td></tr>
              ) : rows.map((f) => {
                const c = leadColor(f.media_dias);
                return (
                  <tr key={f.cod_fornecedor} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-sm text-foreground leading-tight">{f.fornecedor}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">#{f.cod_fornecedor}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-sm text-foreground">{brNum(f.pedidos)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className={cn("text-sm font-black tabular-nums w-16", c.text)}>{brNum(f.media_dias, 1)}d</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden max-w-[180px]">
                          <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${Math.min(100, (f.media_dias / maxMedia) * 100)}%` }} />
                        </div>
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", c.bg, c.text)}>{c.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-muted-foreground tabular-nums">{brNum(f.min_dias)}–{brNum(f.max_dias)}d</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-muted-foreground">{fmtDate(f.ultima_entrada)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-medium px-1">
        Tempo médio = média de (data de entrada da NF − data do pedido) dos pedidos recebidos nos últimos 6 meses.
      </p>
    </div>
  );
}

function AlertasTab({ rows, dias, setDias, fator, setFator }: {
  rows: VendaGrande[]; dias: number; setDias: (n: number) => void; fator: number; setFator: (n: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Período</span>
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))}
            className="bg-transparent outline-none text-sm font-bold text-foreground">
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sensibilidade</span>
          <select value={fator} onChange={(e) => setFator(Number(e.target.value))}
            className="bg-transparent outline-none text-sm font-bold text-foreground">
            <option value={3}>≥ 3× a média</option>
            <option value={5}>≥ 5× a média</option>
            <option value={8}>≥ 8× a média</option>
            <option value={10}>≥ 10× a média</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground bg-card border border-border rounded-2xl">
          <PackageSearch className="w-8 h-8 opacity-40" />
          <span className="text-sm font-black uppercase tracking-widest">Nenhuma venda grande no período</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((v, i) => {
            const critico = v.estoque_atual != null && v.estoque_atual <= 0;
            const baixo = v.estoque_atual != null && v.estoque_atual > 0 && v.estoque_atual < v.qtd;
            return (
              <div key={`${v.documento}-${v.cod_item}-${i}`}
                className={cn("bg-card border rounded-2xl p-4 shadow-sm", critico ? "border-rose-500/40" : "border-border")}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-black text-sm text-foreground leading-tight truncate">{v.item}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      {v.marca ? v.marca + " · " : ""}#{v.cod_item} · Pedido {v.documento.replace(/^0+/, "")}
                    </p>
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                    <TrendingUp className="w-3 h-3" />{brNum(v.ratio, 1)}× média
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="Vendido" value={brNum(v.qtd)} accent="text-foreground" />
                  <Stat label="Média/venda" value={brNum(v.media_item, 1)} accent="text-muted-foreground" />
                  <Stat label="Estoque" value={v.estoque_atual == null ? "—" : brNum(v.estoque_atual)}
                    accent={critico ? "text-rose-500" : baixo ? "text-amber-500" : "text-emerald-500"} icon={Boxes} />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[10px] font-bold text-muted-foreground">
                  <span className="truncate">{v.cliente}</span>
                  <span className="shrink-0">{fmtDate(v.data)} · {brMoney(v.valor)}</span>
                </div>

                {(critico || baixo) && (
                  <div className={cn("mt-3 flex items-center gap-2 text-[11px] font-black rounded-xl px-3 py-2",
                    critico ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600")}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {critico ? "Estoque zerado/negativo — recompra urgente" : "Estoque abaixo do vendido — avaliar recompra"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground font-medium px-1">
        Dispara quando uma venda de um item é ≥ {fator}× a média histórica de venda desse item (últimos 6 meses), com piso de 10 un.
      </p>
    </div>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: string; accent: string; icon?: React.ElementType }) {
  return (
    <div className="bg-secondary/40 rounded-xl px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-black flex items-center gap-1", accent)}>
        {Icon && <Icon className="w-3.5 h-3.5" />}{value}
      </p>
    </div>
  );
}
