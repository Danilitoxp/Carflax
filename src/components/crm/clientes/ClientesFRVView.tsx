import { useState, useMemo, useEffect, useCallback, type ReactNode } from "react";
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  LayoutGrid,
  BarChart4,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  AlertTriangle,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  UserX,
  Percent,
  Repeat,
  Building2,
  UserSquare2,
  Layers,
  CalendarClock,
  Flame,
  MapPin,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { RFMMatrix } from "./RFMMatrix";
import { apiAnaliseFrv, type FrvResponse } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import {
  calcularClientes,
  aplicarABC,
  agregarEvolucao,
  gerarAlertas,
  calcularKpis,
  fmtBRL,
  fmtBRLCompact,
  fmtPct,
  fmtData,
  LABEL_MODO,
  SEGMENTOS_ORDEM,
  type ComparacaoModo,
  type ClienteFRVCalc,
} from "./frv-utils";

// ── Config ───────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 50;

const MODO_OPTIONS = [
  { label: "Mês × Mês Anterior", value: "mes" },
  { label: "Trimestre × Trimestre", value: "3m" },
  { label: "Ano × Ano Anterior", value: "12m" },
];

const VIEWS = [
  { key: "visao", label: "Visão Geral", icon: LayoutGrid },
  { key: "rankings", label: "Rankings", icon: Trophy },
  { key: "acoes", label: "Oport. & Riscos", icon: Target },
  { key: "matriz", label: "Matriz RFV", icon: BarChart4 },
  { key: "base", label: "Base", icon: Users },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

// ── Componentes de apoio ─────────────────────────────────────────────────────
function Delta({ pct, className }: { pct: number; className?: string }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-black tabular-nums",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
        className
      )}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {fmtPct(pct)}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  delta,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
  sub?: string;
  delta?: number;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={cn("absolute right-0 top-0 p-3 opacity-[0.07] group-hover:opacity-15 transition-opacity", accent)}>
        <Icon className="w-14 h-14" />
      </div>
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 leading-tight">{label}</p>
      <h3 className={cn("text-xl font-black tabular-nums leading-none", accent)}>{value}</h3>
      <div className="mt-2 flex items-center gap-2 min-h-[16px]">
        {delta !== undefined && <Delta pct={delta} />}
        {sub && <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide truncate">{sub}</span>}
      </div>
    </div>
  );
}

function SegBadge({ cliente }: { cliente: ClienteFRVCalc }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap"
      style={{ backgroundColor: `${cliente.segmento.cor}1a`, color: cliente.segmento.cor }}
    >
      {cliente.segmento.label}
    </span>
  );
}

function RiscoBar({ valor }: { valor: number }) {
  const cor = valor >= 70 ? "#ef4444" : valor >= 45 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${valor}%`, backgroundColor: cor }} />
      </div>
      <span className="text-[9px] font-black tabular-nums" style={{ color: cor }}>{valor}</span>
    </div>
  );
}

// Tooltip customizado dos gráficos
interface TipPayload { name: string; value: number; color: string }
function ChartTip({ active, payload, label }: { active?: boolean; payload?: TipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl shadow-xl px-3 py-2">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[10px] font-bold text-foreground">{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Tabela de ranking reutilizável
function RankTable({
  titulo,
  icon: Icon,
  accent,
  clientes,
  metricLabel,
  metric,
  metricColor,
}: {
  titulo: string;
  icon: typeof Users;
  accent: string;
  clientes: ClienteFRVCalc[];
  metricLabel: string;
  metric: (c: ClienteFRVCalc) => string;
  metricColor?: (c: ClienteFRVCalc) => string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-secondary/20">
        <div className={cn("p-1.5 rounded-lg bg-secondary", accent)}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-[11px] font-black text-foreground uppercase tracking-tight">{titulo}</h3>
      </div>
      <div className="divide-y divide-border">
        {clientes.length === 0 && (
          <div className="px-5 py-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Nenhum cliente no critério
          </div>
        )}
        {clientes.map((c, i) => (
          <div key={c.cliente_id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group">
            <span className="text-[10px] font-black text-muted-foreground w-5 shrink-0 tabular-nums">{i + 1}º</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                {c.nome_cliente}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground truncate">
                {c.nome_vendedor || "Sem vendedor"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-[11px] font-black tabular-nums", metricColor?.(c) || "text-foreground")}>{metric(c)}</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{metricLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SortKey = keyof ClienteFRVCalc;

export function ClientesFRVView() {
  const [activeView, setActiveView] = useState<ViewKey>("visao");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<FrvResponse | null>(null);

  // Filtros
  const [modo, setModo] = useState<ComparacaoModo>("mes");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [filtroEmpresa, setFiltroEmpresa] = useState("todos");
  const [filtroSegmento, setFiltroSegmento] = useState("todos");

  // Base
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "valor_total",
    direction: "desc",
  });
  const [selectedSegment, setSelectedSegment] = useState<{ label: string; clients: ClienteFRVCalc[] } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await apiAnaliseFrv();
      setData(resp);
    } catch (err) {
      console.error("Erro ao carregar Análise FRV:", err);
      setErro("Não foi possível carregar a análise. Tente novamente.");
    } finally {
      setTimeout(() => setLoading(false), 250);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Base calculada (scores/segmentos relativos à carteira inteira)
  const baseCalc = useMemo(() => {
    if (!Array.isArray(data?.clientes) || data.clientes.length === 0) return [];
    return calcularClientes(data.clientes, modo);
  }, [data, modo]);

  // Aplicação dos filtros
  const clientes = useMemo(() => {
    let arr = baseCalc;
    if (filtroVendedor !== "todos") arr = arr.filter((c) => c.cod_vendedor === filtroVendedor);
    if (filtroEmpresa !== "todos") arr = arr.filter((c) => c.empresa === filtroEmpresa);
    if (filtroSegmento !== "todos") arr = arr.filter((c) => c.segmento.label === filtroSegmento);
    return aplicarABC(arr.map((c) => ({ ...c })));
  }, [baseCalc, filtroVendedor, filtroEmpresa, filtroSegmento]);

  const kpis = useMemo(() => calcularKpis(clientes), [clientes]);
  const evolucao = useMemo(() => agregarEvolucao(clientes, 12), [clientes]);
  const alertas = useMemo(() => gerarAlertas(clientes), [clientes]);

  // Distribuição por segmento
  const distSegmentos = useMemo(() => {
    const mapa = new Map<string, { qtd: number; valor: number; cor: string }>();
    for (const c of clientes) {
      const s = c.segmento;
      const cur = mapa.get(s.label) || { qtd: 0, valor: 0, cor: s.cor };
      cur.qtd += 1;
      cur.valor += c.valor_total;
      mapa.set(s.label, cur);
    }
    return SEGMENTOS_ORDEM.filter((s) => mapa.has(s)).map((s) => ({ label: s, ...mapa.get(s)! }));
  }, [clientes]);

  // Curva ABC agregada
  const abcResumo = useMemo(() => {
    const g = { A: { qtd: 0, valor: 0 }, B: { qtd: 0, valor: 0 }, C: { qtd: 0, valor: 0 } };
    for (const c of clientes) {
      const k = c.abc || "C";
      g[k].qtd += 1;
      g[k].valor += c.valor_total;
    }
    const total = g.A.valor + g.B.valor + g.C.valor || 1;
    return (["A", "B", "C"] as const).map((k) => ({
      classe: k,
      qtd: g[k].qtd,
      valor: g[k].valor,
      pct: (g[k].valor / total) * 100,
    }));
  }, [clientes]);

  // Rankings
  const topFaturamento = useMemo(() => [...clientes].sort((a, b) => b.valor_total - a.valor_total).slice(0, 10), [clientes]);
  const topMargem = useMemo(() => [...clientes].sort((a, b) => b.margem_total - a.margem_total).slice(0, 10), [clientes]);
  const topCrescimento = useMemo(
    () => [...clientes].filter((c) => c.faturamento_anterior > 0 && c.variacao_pct > 0).sort((a, b) => b.variacao_pct - a.variacao_pct).slice(0, 10),
    [clientes]
  );
  const topQueda = useMemo(
    () => [...clientes].filter((c) => c.faturamento_anterior > 0 && c.variacao_pct < 0).sort((a, b) => a.variacao_pct - b.variacao_pct).slice(0, 10),
    [clientes]
  );
  const topInativos = useMemo(
    () => [...clientes].filter((c) => c.status === "inativo").sort((a, b) => b.valor_total - a.valor_total).slice(0, 10),
    [clientes]
  );

  // Clientes para visitar hoje: risco alto ou recompra vencida, ponderado por valor
  const visitarHoje = useMemo(() => {
    return [...clientes]
      .filter((c) => c.risco_abandono >= 45 || (c.dias_para_proxima !== null && c.dias_para_proxima <= 0))
      .map((c) => ({ c, score: c.risco_abandono * Math.log10(c.valor_total + 10) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.c);
  }, [clientes]);

  const rfvMatrixData = useMemo(
    () => clientes.map((c) => ({ ...c, recencia_score: c.r_score, fv_score: c.fv_score })),
    [clientes]
  );

  // Base (busca + ordenação + paginação)
  const baseFiltrada = useMemo(() => {
    const arr = clientes.filter(
      (c) =>
        c.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cliente_id.includes(searchTerm)
    );
    arr.sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      if (av === undefined || bv === undefined || av === null || bv === null) return 0;
      if (typeof av === "string" && typeof bv === "string")
        return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortConfig.direction === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [clientes, searchTerm, sortConfig]);

  const totalPages = Math.ceil(baseFiltrada.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => baseFiltrada.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [baseFiltrada, currentPage]
  );

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortConfig.key !== k) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  };

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroVendedor, filtroEmpresa, filtroSegmento, activeView]);

  const vendedorOptions = useMemo(
    () => [
      { label: "Todos os Vendedores", value: "todos" },
      ...(data?.vendedores?.map((v) => ({ label: v.nome || v.cod, value: v.cod })) || []),
    ],
    [data]
  );
  const empresaOptions = useMemo(
    () => [
      { label: "Todas as Empresas", value: "todos" },
      ...(data?.empresas?.map((e) => ({ label: `Empresa ${e}`, value: e })) || []),
    ],
    [data]
  );
  const segmentoOptions = useMemo(
    () => [{ label: "Todos os Segmentos", value: "todos" }, ...SEGMENTOS_ORDEM.map((s) => ({ label: s, value: s }))],
    []
  );

  const modoSufixo = modo === "mes" ? "vs mês ant." : modo === "3m" ? "vs trim. ant." : "vs ano ant.";

  return (
    <div className="h-full flex flex-col bg-background p-3 sm:p-5 gap-4 overflow-hidden relative">
      {/* ── Header: título + abas + filtros (quebra em linhas no mobile) ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 flex-wrap">
        <h1 className="text-lg font-black text-foreground uppercase tracking-tighter flex items-center gap-2 shrink-0">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <BarChart4 className="w-5 h-5 text-primary" />
          </div>
          <span className="hidden sm:inline">Análise FRV</span>
        </h1>

        <div className="flex items-center bg-secondary/40 p-1 rounded-xl border border-border/50 shadow-inner shrink-0">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              disabled={loading}
              title={v.label}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50",
                activeView === v.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <v.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto lg:flex-1 min-w-0 lg:justify-end">
          <TinyDropdown icon={UserSquare2} value={filtroVendedor} options={vendedorOptions} onChange={setFiltroVendedor} className="flex-1 min-w-[140px] max-w-[190px]" variant="blue" />
          <TinyDropdown icon={Building2} value={filtroEmpresa} options={empresaOptions} onChange={setFiltroEmpresa} className="flex-1 min-w-[130px] max-w-[170px]" variant="slate" />
          <TinyDropdown icon={Layers} value={filtroSegmento} options={segmentoOptions} onChange={setFiltroSegmento} className="flex-1 min-w-[140px] max-w-[180px]" variant="emerald" />
          <TinyDropdown icon={CalendarClock} value={modo} options={MODO_OPTIONS} onChange={(v) => setModo(v as ComparacaoModo)} className="flex-1 min-w-[140px] max-w-[190px]" variant="amber" />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : erro ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <p className="text-sm font-black text-foreground uppercase tracking-tight">{erro}</p>
          <button onClick={loadData} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest">
            Tentar Novamente
          </button>
        </div>
      ) : baseCalc.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <Users className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-sm font-black text-foreground uppercase tracking-tight">Nenhum cliente na análise</p>
          <p className="text-[11px] font-bold text-muted-foreground max-w-md">
            A base retornou vazia. Verifique se o servidor de dados está atualizado e respondendo em <code className="text-primary">/api/crm/clientes-frv</code> no novo formato.
          </p>
          <button onClick={loadData} className="mt-1 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest">
            Recarregar
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide animate-in fade-in duration-500">
          {/* ══ VISÃO GERAL ══ */}
          {activeView === "visao" && (
            <div className="flex flex-col gap-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <KpiCard label={`Faturamento (${LABEL_MODO[modo].split(" ")[0]})`} value={fmtBRLCompact(kpis.faturamentoAtual)} icon={Wallet} accent="text-primary" delta={kpis.variacaoFat} sub={modoSufixo} />
                <KpiCard label="Margem Bruta" value={fmtBRLCompact(kpis.margemAtual)} icon={Percent} accent="text-emerald-600 dark:text-emerald-400" sub={`${kpis.margemPct.toFixed(1)}% do fat.`} />
                <KpiCard label="Ticket Médio" value={fmtBRLCompact(kpis.ticketMedio)} icon={Clock} accent="text-amber-600 dark:text-amber-400" sub="por pedido" />
                <KpiCard label="Frequência Média" value={kpis.frequenciaMedia.toFixed(1)} icon={Repeat} accent="text-violet-600 dark:text-violet-400" sub="pedidos/cliente" />
                <KpiCard label="Clientes Ativos" value={String(kpis.clientesAtivos)} icon={UserCheck} accent="text-emerald-600 dark:text-emerald-400" sub={`de ${kpis.baseTotal}`} />
                <KpiCard label="Em Risco" value={String(kpis.clientesEmRisco)} icon={Flame} accent="text-rose-600 dark:text-rose-400" sub="abandono" />
                <KpiCard label="Inativos" value={String(kpis.clientesInativos)} icon={UserX} accent="text-slate-600 dark:text-slate-400" sub="sem comprar" />
              </div>

              {/* Evolução + ABC + Segmentos */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" /> Evolução do Faturamento (12 meses)
                    </h3>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolucao} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="frvFat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="frvMar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtBRLCompact(v).replace("R$ ", "")} width={44} />
                        <Tooltip content={<ChartTip />} />
                        <Area type="monotone" name="Faturamento" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#frvFat)" />
                        <Area type="monotone" name="Margem" dataKey="margem" stroke="#10b981" strokeWidth={2} fill="url(#frvMar)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Curva ABC */}
                <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-primary" /> Curva ABC
                  </h3>
                  <div className="flex flex-col gap-3">
                    {abcResumo.map((a) => {
                      const cor = a.classe === "A" ? "#10b981" : a.classe === "B" ? "#f59e0b" : "#94a3b8";
                      return (
                        <div key={a.classe}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cor }}>
                              Classe {a.classe} · {a.qtd} clientes
                            </span>
                            <span className="text-[10px] font-black text-foreground tabular-nums">{a.pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${a.pct}%`, backgroundColor: cor }} />
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground mt-0.5 tabular-nums">{fmtBRL(a.valor)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-4 leading-relaxed">
                    Classe A concentra ~80% do faturamento. Priorize retenção deste grupo.
                  </p>
                </div>
              </div>

              {/* Distribuição por segmento + Visitar hoje */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-primary" /> Distribuição da Carteira
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distSegmentos} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" width={92} tick={{ fontSize: 8, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }} content={({ active, payload }) => active && payload?.length ? (
                          <div className="bg-card border border-border rounded-lg px-3 py-1.5 shadow-xl">
                            <p className="text-[10px] font-black text-foreground">{payload[0].payload.qtd} clientes</p>
                            <p className="text-[9px] font-bold text-muted-foreground">{fmtBRL(payload[0].payload.valor)}</p>
                          </div>
                        ) : null} />
                        <Bar dataKey="qtd" radius={[0, 6, 6, 0]} maxBarSize={20}>
                          {distSegmentos.map((s) => <Cell key={s.label} fill={s.cor} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Visitar hoje */}
                <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-rose-500" /> Quem visitar / contatar hoje
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {visitarHoje.length === 0 && (
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-6 text-center col-span-2">
                        Nenhuma ação urgente. Carteira saudável 🎉
                      </p>
                    )}
                    {visitarHoje.map((c) => (
                      <div key={c.cliente_id} className="p-3 bg-background border border-border/60 rounded-xl flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate">{c.nome_cliente}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <SegBadge cliente={c} />
                            <span className="text-[9px] font-bold text-muted-foreground">{c.recencia_dias}d sem comprar</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <RiscoBar valor={c.risco_abandono} />
                          <p className="text-[9px] font-black text-foreground tabular-nums mt-1">{fmtBRLCompact(c.valor_total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ RANKINGS ══ */}
          {activeView === "rankings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              <RankTable titulo="Maiores em Faturamento" icon={Trophy} accent="text-amber-500" clientes={topFaturamento} metricLabel="24 meses" metric={(c) => fmtBRLCompact(c.valor_total)} />
              <RankTable titulo="Maiores em Margem" icon={Percent} accent="text-emerald-500" clientes={topMargem} metricLabel={`margem`} metric={(c) => fmtBRLCompact(c.margem_total)} metricColor={() => "text-emerald-600 dark:text-emerald-400"} />
              <RankTable titulo="Maiores Crescimentos" icon={TrendingUp} accent="text-emerald-500" clientes={topCrescimento} metricLabel={modoSufixo} metric={(c) => fmtPct(c.variacao_pct)} metricColor={() => "text-emerald-600 dark:text-emerald-400"} />
              <RankTable titulo="Maiores Quedas" icon={TrendingDown} accent="text-rose-500" clientes={topQueda} metricLabel={modoSufixo} metric={(c) => fmtPct(c.variacao_pct)} metricColor={() => "text-rose-600 dark:text-rose-400"} />
              <RankTable titulo="Inativos de Maior Valor" icon={UserX} accent="text-slate-500" clientes={topInativos} metricLabel="sem comprar" metric={(c) => `${c.recencia_dias}d`} metricColor={() => "text-rose-600 dark:text-rose-400"} />
              <RankTable titulo="Maior Risco de Abandono" icon={Flame} accent="text-rose-500" clientes={[...clientes].sort((a, b) => b.risco_abandono - a.risco_abandono).slice(0, 10)} metricLabel="risco" metric={(c) => `${c.risco_abandono}/100`} metricColor={() => "text-rose-600 dark:text-rose-400"} />
            </div>
          )}

          {/* ══ OPORTUNIDADES & RISCOS ══ */}
          {activeView === "acoes" && (
            <div className="flex flex-col lg:flex-row gap-4 h-full">
              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0 bg-rose-500/5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-tight">Riscos ({alertas.filter((a) => a.tipo === "risco").length})</h3>
                </div>
                <div className="divide-y divide-border flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                  {alertas.filter((a) => a.tipo === "risco").map((a) => (
                    <div key={a.id} className="px-5 py-5 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">{a.titulo}</p>
                        <span className="text-[9px] font-black text-foreground tabular-nums shrink-0">{fmtBRLCompact(a.valor)}</span>
                      </div>
                      <p className="text-[11px] font-black text-foreground uppercase tracking-tight mt-1 truncate">{a.nome_cliente}</p>
                      <p className="text-[9px] font-bold text-muted-foreground mt-1.5 leading-relaxed">{a.descricao}</p>
                    </div>
                  ))}
                  {alertas.filter((a) => a.tipo === "risco").length === 0 && <EmptyMini texto="Sem riscos detectados" />}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0 bg-emerald-500/5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-tight">Oportunidades ({alertas.filter((a) => a.tipo === "oportunidade").length})</h3>
                </div>
                <div className="divide-y divide-border flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                  {alertas.filter((a) => a.tipo === "oportunidade").map((a) => (
                    <div key={a.id} className="px-5 py-5 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{a.titulo}</p>
                        <span className="text-[9px] font-black text-foreground tabular-nums shrink-0">{fmtBRLCompact(a.valor)}</span>
                      </div>
                      <p className="text-[11px] font-black text-foreground uppercase tracking-tight mt-1 truncate">{a.nome_cliente}</p>
                      <p className="text-[9px] font-bold text-muted-foreground mt-1.5 leading-relaxed">{a.descricao}</p>
                    </div>
                  ))}
                  {alertas.filter((a) => a.tipo === "oportunidade").length === 0 && <EmptyMini texto="Sem oportunidades no momento" />}
                </div>
              </div>
            </div>
          )}

          {/* ══ MATRIZ RFV ══ */}
          {activeView === "matriz" && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className={cn("flex-1 flex items-center justify-center transition-all", selectedSegment && "lg:flex-[0.6]")}>
                <RFMMatrix data={rfvMatrixData} onCellClick={(label, clients) => setSelectedSegment({ label, clients: clients as unknown as ClienteFRVCalc[] })} />
              </div>
              {selectedSegment && (
                <div className="lg:flex-[0.4] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 max-h-[calc(100vh-160px)]">
                  <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20 shrink-0">
                    <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{selectedSegment.label}</h3>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{selectedSegment.clients.length} clientes</p>
                    </div>
                    <button onClick={() => setSelectedSegment(null)} className="p-2 hover:bg-secondary rounded-xl transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                    {selectedSegment.clients.map((c) => (
                      <div key={c.cliente_id} className="p-3 bg-background border border-border/50 rounded-xl">
                        <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate">{c.nome_cliente}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-muted-foreground">{c.recencia_dias}d · {c.frequencia} pedidos</span>
                          <span className="text-[10px] font-black text-foreground tabular-nums">{fmtBRLCompact(c.valor_total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ BASE ══ */}
          {activeView === "base" && (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex flex-col lg:flex-row gap-3 items-center shrink-0">
                <div className="flex-1 relative group w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl shrink-0">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="p-1.5 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-black px-2 uppercase tracking-widest">Pág {currentPage}/{totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="p-1.5 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse min-w-[1180px]">
                    <thead className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-md border-b border-border">
                      <tr>
                        <Th onClick={() => requestSort("nome_cliente")}>Cliente <SortIcon k="nome_cliente" /></Th>
                        <Th center>Segmento</Th>
                        <Th center onClick={() => requestSort("ultima_compra")}>Últ. Compra <SortIcon k="ultima_compra" /></Th>
                        <Th center onClick={() => requestSort("recencia_dias")}>Recência <SortIcon k="recencia_dias" /></Th>
                        <Th center onClick={() => requestSort("frequencia")}>Freq. <SortIcon k="frequencia" /></Th>
                        <Th right onClick={() => requestSort("ticket_medio")}>Ticket <SortIcon k="ticket_medio" /></Th>
                        <Th right onClick={() => requestSort("valor_total")}>Fat. 24m <SortIcon k="valor_total" /></Th>
                        <Th right onClick={() => requestSort("margem_pct")}>Margem <SortIcon k="margem_pct" /></Th>
                        <Th center onClick={() => requestSort("variacao_pct")}>Variação <SortIcon k="variacao_pct" /></Th>
                        <Th center onClick={() => requestSort("risco_abandono")}>Risco <SortIcon k="risco_abandono" /></Th>
                        <Th center>Próx. Compra</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginated.map((c) => (
                        <tr key={c.cliente_id} className="hover:bg-secondary/30 transition-colors group">
                          <td className="px-4 py-3">
                            <p className="text-[11px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors truncate max-w-[220px]">{c.nome_cliente}</p>
                            <p className="text-[8px] font-bold text-muted-foreground">{c.cliente_id} · {c.nome_vendedor || "s/ vend."}</p>
                          </td>
                          <td className="px-4 py-3 text-center"><SegBadge cliente={c} /></td>
                          <td className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground">{fmtData(c.ultima_compra)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", c.recencia_dias <= 30 ? "bg-emerald-500/10 text-emerald-600" : c.recencia_dias <= 90 ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600")}>{c.recencia_dias}d</span>
                          </td>
                          <td className="px-4 py-3 text-center font-black text-[11px] text-foreground">{c.frequencia}</td>
                          <td className="px-4 py-3 text-right font-bold text-[10px] text-muted-foreground tabular-nums">{fmtBRLCompact(c.ticket_medio)}</td>
                          <td className="px-4 py-3 text-right font-black text-[11px] text-foreground tabular-nums">{fmtBRLCompact(c.valor_total)}</td>
                          <td className="px-4 py-3 text-right font-black text-[10px] tabular-nums" style={{ color: c.margem_pct >= 0 ? "#10b981" : "#ef4444" }}>{c.margem_pct.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-center">{c.faturamento_anterior > 0 || c.faturamento_atual > 0 ? <Delta pct={c.variacao_pct} /> : <span className="text-[9px] text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3"><div className="flex justify-center"><RiscoBar valor={c.risco_abandono} /></div></td>
                          <td className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground">
                            {c.proxima_compra ? (
                              <span className={cn(c.dias_para_proxima !== null && c.dias_para_proxima < 0 && "text-rose-600 dark:text-rose-400 font-black")}>{fmtData(c.proxima_compra)}</span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border bg-secondary/10 flex justify-between items-center shrink-0">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Exibindo {paginated.length} de {baseFiltrada.length} clientes</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Base: {data?.janela_meses}m · Atualizado {data ? new Date(data.gerado_em).toLocaleString("pt-BR") : ""}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Auxiliares de tabela / estados ───────────────────────────────────────────
function Th({ children, center, right, onClick }: { children: ReactNode; center?: boolean; right?: boolean; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap",
        onClick && "cursor-pointer hover:text-primary transition-colors",
        center && "text-center",
        right && "text-right"
      )}
    >
      <span className={cn("flex items-center gap-1.5", center && "justify-center", right && "justify-end")}>{children}</span>
    </th>
  );
}

function EmptyMini({ texto }: { texto: string }) {
  return <div className="px-5 py-10 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{texto}</div>;
}

function LoadingState() {
  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Skeleton className="xl:col-span-2 h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
