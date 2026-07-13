import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
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
  UserSquare2,
  Layers,
  Flame,
  MapPin,
  ClipboardList,
  HeartPulse,
  CheckCircle2,
  Hourglass,
  Calendar,
  type LucideIcon,
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
import { RaioXCliente } from "./RaioXCliente";
import { listarContatos, TIPO_LABEL, RESULTADO_LABEL, type ContatoComercial } from "@/lib/contatos-service";
import { apiAnaliseFrv, type FrvResponse } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  calcularClientes,
  aplicarABC,
  agregarEvolucao,
  gerarAlertas,
  calcularKpis,
  scoreOportunidade,
  acaoSugerida,
  fmtBRL,
  fmtBRLCompact,
  fmtPct,
  fmtData,
  LABEL_MODO,
  SEGMENTOS_ORDEM,
  type ComparacaoModo,
  type ClienteFRVCalc,
  type AcaoTom,
} from "./frv-utils";

// Cor do texto da ação sugerida por tom (Agenda)
const ACAO_TOM_COR: Record<AcaoTom, string> = {
  critico: "text-rose-600 dark:text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10",
  atencao: "text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10",
  oportunidade: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10",
  neutro: "text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/40",
};

const ITEMS_PER_PAGE = 50;

const VIEWS = [
  { key: "visao", label: "Visão Geral", icon: LayoutGrid },
  { key: "agenda", label: "Agenda", icon: ClipboardList },
  { key: "recuperacao", label: "Recuperação", icon: HeartPulse },
  { key: "rankings", label: "Rankings", icon: Trophy },
  { key: "acoes", label: "Oport. & Riscos", icon: Target },
  { key: "matriz", label: "Matriz RFV", icon: BarChart4 },
  { key: "base", label: "Base", icon: Users },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

const JANELA_OPTIONS = [
  { label: "6 meses", value: "6" },
  { label: "12 meses", value: "12" },
  { label: "24 meses", value: "24" },
];

const MODO_OPTIONS: { label: string; value: ComparacaoModo }[] = [
  { label: "Mês × Mês Anterior", value: "mes" },
  { label: "Trimestre × Trimestre", value: "3m" },
  { label: "Ano × Ano Anterior", value: "12m" },
];

// ── Custom Segmented Control ──
interface SegmentedOption<T> {
  label: string;
  value: T;
}

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (val: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex p-0.5 bg-secondary/70 dark:bg-secondary/40 border border-border/40 rounded-xl w-full sm:w-auto", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 sm:flex-initial px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none whitespace-nowrap",
              active
                ? "bg-card text-primary shadow-sm font-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Date Popover Component (collapses Period & Comparison) ──
function DatePopover({
  janela,
  setJanela,
  modo,
  setModo,
  modoOptions,
}: {
  janela: number;
  setJanela: (v: number) => void;
  modo: ComparacaoModo;
  setModo: (v: ComparacaoModo) => void;
  modoOptions: { label: string; value: ComparacaoModo }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeJanelaLabel = JANELA_OPTIONS.find(o => Number(o.value) === janela)?.label || `${janela} meses`;
  const activeModoLabel = MODO_OPTIONS.find(o => o.value === modo)?.label.split(" ")[0] || modo;

  return (
    <div className="relative w-full sm:w-auto" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-3.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center justify-between sm:justify-start gap-2 transition-all outline-none bg-card border-border/80 text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 shadow-sm w-full sm:w-auto",
          isOpen && "ring-2 ring-primary/20 border-primary/50 text-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <span>{activeJanelaLabel} · {activeModoLabel}</span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 opacity-40 shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full sm:w-[280px] bg-card border border-border rounded-xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período</span>
            <SegmentedControl
              value={janela}
              options={JANELA_OPTIONS.map((o) => ({ label: o.label, value: Number(o.value) }))}
              onChange={setJanela}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Comparação</span>
            <SegmentedControl
              value={modo}
              options={modoOptions.map((o) => ({ label: o.label.split(" ")[0], value: o.value as ComparacaoModo }))}
              onChange={(v) => setModo(v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Searchable Select Dropdown ──
interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  icon: LucideIcon;
  placeholder: string;
  searchable?: boolean;
  className?: string;
}

function Dropdown({
  value,
  options,
  onChange,
  icon: Icon,
  placeholder,
  searchable = false,
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getLabel = (val: string) => {
    const opt = options.find((o) => o.value === val);
    return opt ? opt.label : val;
  };

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, searchable]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const isActive = value !== "todos";

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className={cn(
          "h-10 px-3.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-all outline-none w-full text-left",
          isActive
            ? "bg-primary/5 dark:bg-primary/10 border-primary/20 text-primary shadow-sm"
            : "bg-card border-border/80 text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 shadow-sm",
          isOpen && "ring-2 ring-primary/20 border-primary/50"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary opacity-100" : "opacity-40")} />
          <span className="truncate">{value ? getLabel(value) : placeholder}</span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 opacity-40 shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[220px] bg-card border border-border rounded-xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {searchable && (
            <div className="p-2 border-b border-border/40 bg-secondary/10">
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center font-medium">Nenhum resultado</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-xs font-bold text-left transition-colors uppercase tracking-tight flex items-center justify-between",
                      isSelected
                        ? "bg-primary/10 text-primary font-black"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Components de apoio ─────────────────────────────────────────────────────
function Delta({ pct, className }: { pct: number; className?: string }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums border transition-colors",
        up
          ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/20 text-rose-600 dark:text-rose-400",
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
    <div className="bg-card border border-border/50 rounded-2xl p-4.5 relative overflow-hidden group hover:shadow-md hover:border-border/80 transition-all duration-300 flex flex-col justify-between min-h-[105px]">
      <div className={cn("absolute right-2 top-2 p-2 opacity-[0.05] group-hover:opacity-10 group-hover:scale-110 transition-all duration-300", accent)}>
        <Icon className="w-12 h-12" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 leading-tight">{label}</p>
        <h3 className={cn("text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none", accent)}>{value}</h3>
      </div>
      <div className="mt-2.5 flex items-center gap-2 min-h-[18px]">
        {delta !== undefined && <Delta pct={delta} />}
        {sub && <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{sub}</span>}
      </div>
    </div>
  );
}

function SegBadge({ cliente }: { cliente: ClienteFRVCalc }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border"
      style={{
        backgroundColor: `${cliente.segmento.cor}12`,
        color: cliente.segmento.cor,
        borderColor: `${cliente.segmento.cor}25`
      }}
    >
      {cliente.segmento.label}
    </span>
  );
}

function RiscoBar({ valor }: { valor: number }) {
  const cor = valor >= 70 ? "#ef4444" : valor >= 45 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${valor}%`, backgroundColor: cor }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color: cor }}>{valor}</span>
    </div>
  );
}

// Tooltip customizado dos gráficos
interface TipPayload { name: string; value: number; color: string }
function ChartTip({ active, payload, label }: { active?: boolean; payload?: TipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl shadow-xl p-3 border-l-4 border-l-primary animate-in fade-in zoom-in-95 duration-150">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] text-muted-foreground font-medium">{p.name}</span>
            </div>
            <span className="text-[10px] font-bold text-foreground tabular-nums">{fmtBRL(p.value)}</span>
          </div>
        ))}
      </div>
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
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2.5 bg-secondary/15">
        <div className={cn("p-1.5 rounded-lg bg-background border border-border/40", accent)}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{titulo}</h3>
      </div>
      <div className="divide-y divide-border/40 flex-1">
        {clientes.length === 0 && (
          <div className="px-4 py-8 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Nenhum cliente no critério
          </div>
        )}
        {clientes.map((c, i) => (
          <div key={c.cliente_id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/35 transition-colors group">
            <span className="text-xs font-bold text-muted-foreground/60 w-5 shrink-0 tabular-nums">{i + 1}º</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                {c.nome_cliente}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {c.nome_vendedor || "Sem vendedor"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-xs font-bold tabular-nums", metricColor?.(c) || "text-foreground")}>{metric(c)}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{metricLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SortKey = keyof ClienteFRVCalc;

interface FrvUserProfile {
  id?: string;
  name?: string;
  role?: string;
  operator_code?: string;
  operatorCode?: string;
  is_admin?: boolean;
  is_leader?: boolean;
}

export function ClientesFRVView({ userProfile }: { userProfile?: FrvUserProfile }) {
  const [activeView, setActiveView] = useState<ViewKey>("visao");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<FrvResponse | null>(null);

  // Filtros
  const [modo, setModo] = useState<ComparacaoModo>("mes");
  const [janela, setJanela] = useState(12); // período (meses)
  const [filtroVendedor, setFiltroVendedor] = useState("todos");

  // Base
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [agendaPage, setAgendaPage] = useState(1);
  const [recuperacaoPage, setRecuperacaoPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "valor_total",
    direction: "desc",
  });
  const [selectedSegment, setSelectedSegment] = useState<{ label: string; clients: ClienteFRVCalc[] } | null>(null);
  const [raioX, setRaioX] = useState<ClienteFRVCalc | null>(null);

  // Contatos comerciais (base da Performance de Recuperação)
  const [contatos, setContatos] = useState<ContatoComercial[]>([]);
  const reloadContatos = useCallback(() => {
    listarContatos(180)
      .then(setContatos)
      .catch((err) => console.error("Erro ao carregar contatos:", err));
  }, []);
  useEffect(() => {
    reloadContatos();
  }, [reloadContatos]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await apiAnaliseFrv(janela);
      setData(resp);
    } catch (err) {
      console.error("Erro ao carregar Análise FRV:", err);
      setErro("Não foi possível carregar a análise. Tente novamente.");
    } finally {
      setTimeout(() => setLoading(false), 250);
    }
  }, [janela]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modo de comparação disponível conforme o período carregado
  const modoOptions = useMemo(
    () => MODO_OPTIONS.filter((o) => (o.value === "12m" ? janela >= 24 : o.value === "3m" ? janela >= 6 : true)),
    [janela]
  );
  useEffect(() => {
    if (!modoOptions.some((o) => o.value === modo)) setModo("mes");
  }, [modoOptions, modo]);

  // Base calculada
  const baseCalc = useMemo(() => {
    if (!data?.clientes || data.clientes.length === 0) return [];
    return calcularClientes(data.clientes, modo);
  }, [data, modo]);

  // Aplicação dos filtros
  const clientes = useMemo(() => {
    let arr = baseCalc;
    if (filtroVendedor !== "todos") arr = arr.filter((c) => c.cod_vendedor === filtroVendedor);
    return aplicarABC(arr.map((c) => ({ ...c })));
  }, [baseCalc, filtroVendedor]);

  const kpis = useMemo(() => calcularKpis(clientes), [clientes]);
  const evolucao = useMemo(() => agregarEvolucao(clientes, 12), [clientes]);
  const alertas = useMemo(() => gerarAlertas(clientes), [clientes]);

  // Agenda do vendedor: priorizada por score de oportunidade
  const agenda = useMemo(
    () =>
      clientes
        .map((c) => ({ c, score: scoreOportunidade(c), acao: acaoSugerida(c) }))
        .filter((x) => x.score >= 25)
        .sort((a, b) => b.score - a.score),
    [clientes]
  );

  // Performance de Recuperação
  const recuperacao = useMemo(() => {
    const byId = new Map(baseCalc.map((c) => [c.cliente_id, c]));
    const visiveisIds = new Set(clientes.map((c) => c.cliente_id));
    const usaFiltro = filtroVendedor !== "todos";

    const lista = contatos
      .filter((ct) => !usaFiltro || visiveisIds.has(ct.cliente_id))
      .map((ct) => {
        const cli = byId.get(ct.cliente_id) || null;
        let status: "recuperado" | "aguardando" | "perdido";
        if (ct.resultado === "sem_interesse") status = "perdido";
        else if (cli?.ultima_compra && new Date(cli.ultima_compra).getTime() > new Date(ct.created_at).getTime())
          status = "recuperado";
        else status = "aguardando";
        return { ct, cli, status };
      });

    const recuperadosIds = new Set(lista.filter((x) => x.status === "recuperado").map((x) => x.ct.cliente_id));
    const totalContatos = lista.length;
    const recuperados = recuperadosIds.size;
    const aguardando = lista.filter((x) => x.status === "aguardando").length;
    const fatRecuperado = [...recuperadosIds].reduce((s, id) => s + (byId.get(id)?.faturamento_atual || 0), 0);
    const taxa = totalContatos > 0 ? (recuperados / totalContatos) * 100 : 0;
    return { lista, totalContatos, recuperados, aguardando, fatRecuperado, taxa };
  }, [contatos, baseCalc, clientes, filtroVendedor]);

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

  // Clientes para visitar hoje
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

  const AGENDA_ITEMS_PER_PAGE = 50;
  const totalAgendaPages = Math.ceil(agenda.length / AGENDA_ITEMS_PER_PAGE);
  const paginatedAgenda = useMemo(
    () => agenda.slice((agendaPage - 1) * AGENDA_ITEMS_PER_PAGE, agendaPage * AGENDA_ITEMS_PER_PAGE),
    [agenda, agendaPage]
  );

  const RECUPERACAO_ITEMS_PER_PAGE = 50;
  const totalRecuperacaoPages = Math.ceil(recuperacao.lista.length / RECUPERACAO_ITEMS_PER_PAGE);
  const paginatedRecuperacao = useMemo(
    () => recuperacao.lista.slice((recuperacaoPage - 1) * RECUPERACAO_ITEMS_PER_PAGE, recuperacaoPage * RECUPERACAO_ITEMS_PER_PAGE),
    [recuperacao.lista, recuperacaoPage]
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
    setAgendaPage(1);
    setRecuperacaoPage(1);
  }, [filtroVendedor, activeView]);

  const vendedorOptions = useMemo(
    () => [
      { label: "Todos os Vendedores", value: "todos" },
      ...(data?.vendedores?.map((v) => ({ label: v.nome || v.cod, value: String(v.cod) })) || []),
    ],
    [data]
  );

  const modoSufixo = modo === "mes" ? "vs mês ant." : modo === "3m" ? "vs trim. ant." : "vs ano ant.";

  return (
    <div className="h-full flex flex-col bg-background p-4 sm:p-6 gap-6 overflow-hidden relative font-sans">
      {/* ── Header: Título, Sub-views Navigation & Filters ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 flex-wrap lg:flex-nowrap">
        {/* Left: Compact Title + Tabs list */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <BarChart4 className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-sm font-black text-foreground tracking-tight uppercase">Análise FRV</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-secondary/50 dark:bg-secondary/20 p-0.5 rounded-xl border border-border/40 overflow-x-auto scrollbar-hide max-w-full">
            {VIEWS.map((v) => {
              const active = activeView === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setActiveView(v.key)}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-50",
                    active
                      ? "bg-card text-primary shadow-sm font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <v.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: DatePopover + Vendedor filter */}
        <div className="flex items-center gap-2.5 shrink-0 justify-end font-sans w-full lg:w-auto">
          {/* Date Selector */}
          <DatePopover
            janela={janela}
            setJanela={setJanela}
            modo={modo}
            setModo={setModo}
            modoOptions={modoOptions}
          />

          {/* Vendedor Dropdown */}
          <div className="w-full sm:w-[160px] shrink-0">
            <Dropdown
              icon={UserSquare2}
              value={filtroVendedor}
              options={vendedorOptions}
              onChange={setFiltroVendedor}
              placeholder="Vendedor"
              searchable={true}
            />
          </div>

          {filtroVendedor !== "todos" && (
            <button
              onClick={() => {
                setFiltroVendedor("todos");
              }}
              className="h-10 px-2.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-1.5 border border-transparent hover:border-rose-500/20 shrink-0"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline lg:hidden xl:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : erro ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 border border-dashed border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 max-w-lg mx-auto my-12">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-foreground uppercase tracking-tight">{erro}</p>
          <button onClick={loadData} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none">
            Tentar Novamente
          </button>
        </div>
      ) : baseCalc.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 max-w-md mx-auto my-12 border border-dashed border-border rounded-2xl p-8">
          <div className="p-3 bg-secondary rounded-full">
            <Users className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Nenhum cliente na análise</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              A base retornou vazia. Verifique se o servidor de dados está respondendo em <code className="text-primary font-mono text-[10px]">/api/crm/clientes-frv</code>.
            </p>
          </div>
          <button onClick={loadData} className="mt-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-all">
            Recarregar
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide animate-in fade-in duration-300">
          {/* ══ VISÃO GERAL ══ */}
          {activeView === "visao" && (
            <div className="flex flex-col gap-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                <KpiCard label={`Faturamento (${LABEL_MODO[modo].split(" ")[0]})`} value={fmtBRLCompact(kpis.faturamentoAtual)} icon={Wallet} accent="text-primary" delta={kpis.variacaoFat} sub={modoSufixo} />
                <KpiCard label="Margem Bruta" value={fmtBRLCompact(kpis.margemAtual)} icon={Percent} accent="text-emerald-600 dark:text-emerald-400" sub={`${kpis.margemPct.toFixed(1)}% do fat.`} />
                <KpiCard label="Ticket Médio" value={fmtBRLCompact(kpis.ticketMedio)} icon={Clock} accent="text-amber-600 dark:text-amber-400" sub="por pedido" />
                <KpiCard label="Frequência Média" value={kpis.frequenciaMedia.toFixed(1)} icon={Repeat} accent="text-violet-600 dark:text-violet-400" sub="pedidos/cliente" />
                <KpiCard label="Clientes Ativos" value={String(kpis.clientesAtivos)} icon={UserCheck} accent="text-emerald-600 dark:text-emerald-400" sub={`de ${kpis.baseTotal}`} />
                <KpiCard label="Em Risco" value={String(kpis.clientesEmRisco)} icon={Flame} accent="text-rose-600 dark:text-rose-400" sub="abandono" />
                <KpiCard label="Inativos" value={String(kpis.clientesInativos)} icon={UserX} accent="text-slate-600 dark:text-slate-400" sub="sem comprar" />
              </div>

              {/* Evolução + ABC */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 flex flex-col shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" /> Evolução do Faturamento (12 meses)
                    </h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolucao} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="frvFat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="frvMar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtBRLCompact(v).replace("R$ ", "")} width={44} />
                        <Tooltip content={<ChartTip />} />
                        <Area type="monotone" name="Faturamento" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#frvFat)" />
                        <Area type="monotone" name="Margem" dataKey="margem" stroke="#10b981" strokeWidth={1.5} fill="url(#frvMar)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Curva ABC */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-primary" /> Curva ABC
                    </h3>
                    <div className="space-y-4">
                      {abcResumo.map((a) => {
                        const cor = a.classe === "A" ? "#10b981" : a.classe === "B" ? "#f59e0b" : "#94a3b8";
                        return (
                          <div key={a.classe} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor }}>
                                Classe {a.classe} · {a.qtd} clientes
                              </span>
                              <span className="text-[11px] font-black text-foreground tabular-nums">{a.pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${a.pct}%`, backgroundColor: cor }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                              <span className="tabular-nums">{fmtBRL(a.valor)}</span>
                              <span>Faturamento acumulado</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[9px] font-medium text-muted-foreground leading-relaxed mt-6 border-t border-border/40 pt-3">
                    Classe A concentra ~80% do faturamento. Priorize retenção deste group.
                  </p>
                </div>
              </div>

              {/* Distribuição por segmento + Visitar hoje */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-primary" /> Distribuição da Carteira
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distSegmentos} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" width={92} tick={{ fontSize: 9, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "hsl(var(--secondary))", opacity: 0.3 }} content={({ active, payload }) => active && payload?.length ? (
                          <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl border-l-4 border-l-primary">
                            <p className="text-xs font-bold text-foreground">{payload[0].payload.qtd} clientes</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtBRL(payload[0].payload.valor)}</p>
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
                <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-rose-500" /> Quem visitar / contatar hoje
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                    {visitarHoje.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center col-span-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Nenhuma ação urgente. Carteira saudável 🎉
                        </p>
                      </div>
                    )}
                    {visitarHoje.map((c) => (
                      <div
                        key={c.cliente_id}
                        onClick={() => setRaioX(c)}
                        className="p-3 bg-secondary/20 hover:bg-secondary/40 border border-border/40 hover:border-border/85 rounded-xl flex items-center gap-3 transition-all cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                            {c.nome_cliente}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <SegBadge cliente={c} />
                            <span className="text-[10px] font-medium text-muted-foreground">{c.recencia_dias}d sem comprar</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <RiscoBar valor={c.risco_abandono} />
                          <p className="text-[10px] font-bold text-foreground tabular-nums">{fmtBRLCompact(c.valor_total)}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <RankTable titulo="Maiores em Faturamento" icon={Trophy} accent="text-amber-500" clientes={topFaturamento} metricLabel={`${data?.janela_meses ?? janela} meses`} metric={(c) => fmtBRLCompact(c.valor_total)} />
              <RankTable titulo="Maiores em Margem" icon={Percent} accent="text-emerald-500" clientes={topMargem} metricLabel={`margem`} metric={(c) => fmtBRLCompact(c.margem_total)} metricColor={() => "text-emerald-600 dark:text-emerald-400"} />
              <RankTable titulo="Maiores Crescimentos" icon={TrendingUp} accent="text-emerald-500" clientes={topCrescimento} metricLabel={modoSufixo} metric={(c) => fmtPct(c.variacao_pct)} metricColor={() => "text-emerald-600 dark:text-emerald-400"} />
              <RankTable titulo="Maiores Quedas" icon={TrendingDown} accent="text-rose-500" clientes={topQueda} metricLabel={modoSufixo} metric={(c) => fmtPct(c.variacao_pct)} metricColor={() => "text-rose-600 dark:text-rose-400"} />
              <RankTable titulo="Inativos de Maior Valor" icon={UserX} accent="text-slate-500" clientes={topInativos} metricLabel="sem comprar" metric={(c) => `${c.recencia_dias}d`} metricColor={() => "text-rose-600 dark:text-rose-400"} />
              <RankTable titulo="Maior Risco de Abandono" icon={Flame} accent="text-rose-500" clientes={[...clientes].sort((a, b) => b.risco_abandono - a.risco_abandono).slice(0, 10)} metricLabel="risco" metric={(c) => `${c.risco_abandono}/100`} metricColor={() => "text-rose-600 dark:text-rose-400"} />
            </div>
          )}

          {/* ══ AGENDA DO VENDEDOR ══ */}
          {activeView === "agenda" && (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Quem contatar hoje <span className="text-muted-foreground font-medium">({agenda.length})</span>
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {totalAgendaPages > 1 && (
                    <div className="flex items-center gap-2 bg-card border border-border/80 p-1 rounded-xl shrink-0 shadow-sm">
                      <button
                        disabled={agendaPage === 1}
                        onClick={() => setAgendaPage((p) => p - 1)}
                        className="p-1 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-bold px-1.5 uppercase tracking-widest">Pág {agendaPage}/{totalAgendaPages}</span>
                      <button
                        disabled={agendaPage === totalAgendaPages}
                        onClick={() => setAgendaPage((p) => p + 1)}
                        className="p-1 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
                    Priorizado por score de oportunidade
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                  {paginatedAgenda.map(({ c, score, acao }) => (
                    <button
                      key={c.cliente_id}
                      onClick={() => setRaioX(c)}
                      className="w-full text-left px-6 py-4.5 hover:bg-secondary/30 dark:hover:bg-secondary/15 transition-all flex items-center gap-5 group focus:bg-secondary/15 outline-none"
                    >
                      {/* Score Badge */}
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-sm transition-transform duration-200 group-hover:scale-[1.03]",
                          score >= 70
                            ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 shadow-rose-500/5"
                            : score >= 45
                            ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 shadow-amber-500/5"
                            : "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-blue-500/5"
                        )}
                      >
                        <span className="text-base font-black leading-none tabular-nums">{score}</span>
                        <span className="text-[7px] font-black uppercase tracking-wider mt-0.5 opacity-65">score</span>
                      </div>

                      {/* Column 1: Cliente & Ação */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate max-w-[200px] sm:max-w-[240px] group-hover:text-primary transition-colors">
                            {c.nome_cliente}
                          </p>
                          <SegBadge cliente={c} />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(ACAO_TOM_COR[acao.tom], "text-[9px] font-black uppercase tracking-widest shrink-0 border border-transparent shadow-sm")}>
                            {acao.titulo}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate font-medium max-w-sm lg:max-w-md xl:max-w-xl">
                            {acao.detalhe}
                          </span>
                        </div>
                      </div>

                      {/* Column 2: Faturamento */}
                      <div className="w-[110px] shrink-0 hidden md:flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Faturamento</span>
                        <span className="text-xs font-bold text-foreground tabular-nums">{fmtBRLCompact(c.valor_total)}</span>
                      </div>

                      {/* Column 3: Vendedor */}
                      <div className="w-[140px] shrink-0 hidden lg:flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Vendedor</span>
                        <span className="text-xs font-semibold text-foreground truncate">{c.nome_vendedor || "Sem Vendedor"}</span>
                      </div>

                      {/* Column 4: Recência */}
                      <div className="w-[110px] shrink-0 text-right hidden sm:flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Recência</span>
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          c.recencia_dias > 60 ? "text-rose-500" : c.recencia_dias > 30 ? "text-amber-500" : "text-emerald-500"
                        )}>
                          {c.recencia_dias}d sem comprar
                        </span>
                      </div>

                      {/* Column 5: Arrow */}
                      <div className="shrink-0 flex items-center justify-center p-1.5 rounded-lg bg-secondary/50 border border-border/40 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-all" />
                      </div>
                    </button>
                  ))}
                  {agenda.length === 0 && <EmptyMini texto="Nenhum cliente prioritário no filtro atual" />}
                </div>
                <div className="px-5 py-3 border-t border-border/40 bg-secondary/10 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {agenda.length} clientes com oportunidade de recuperação
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">
                    Clique para abrir o Raio-X
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══ PERFORMANCE DE RECUPERAÇÃO ══ */}
          {activeView === "recuperacao" && (
            <div className="flex flex-col gap-4 h-full">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contatos (180d)</p>
                  <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums mt-1">{recuperacao.totalContatos}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Recuperados</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">{recuperacao.recuperados}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Taxa de conversão</p>
                  <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums mt-1">{recuperacao.taxa.toFixed(0)}%</p>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fat. recuperado</p>
                  <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums mt-1">{fmtBRLCompact(recuperacao.fatRecuperado)}</p>
                </div>
              </div>

              <div className="flex-1 bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
                <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-secondary/10 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <HeartPulse className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Contatos registrados <span className="text-muted-foreground font-medium">({recuperacao.lista.length})</span>
                    </h3>
                  </div>
                  {totalRecuperacaoPages > 1 && (
                    <div className="flex items-center gap-2 bg-card border border-border/80 p-1 rounded-xl shrink-0 shadow-sm">
                      <button
                        disabled={recuperacaoPage === 1}
                        onClick={() => setRecuperacaoPage((p) => p - 1)}
                        className="p-1 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-bold px-1.5 uppercase tracking-widest">Pág {recuperacaoPage}/{totalRecuperacaoPages}</span>
                      <button
                        disabled={recuperacaoPage === totalRecuperacaoPages}
                        onClick={() => setRecuperacaoPage((p) => p + 1)}
                        className="p-1 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                  {paginatedRecuperacao.map(({ ct, cli, status }) => {
                    const stCfg =
                      status === "recuperado"
                        ? { cor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Recuperado", icon: CheckCircle2 }
                        : status === "perdido"
                        ? { cor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20", label: "Sem interesse", icon: X }
                        : { cor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Aguardando", icon: Hourglass };
                    const StIcon = stCfg.icon;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => cli && setRaioX(cli)}
                        disabled={!cli}
                        className="w-full text-left px-5 py-3.5 hover:bg-secondary/20 transition-colors flex items-center gap-4 disabled:cursor-default group outline-none"
                      >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", stCfg.cor)}>
                          <StIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                            {ct.cliente_nome || ct.cliente_id}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                            {TIPO_LABEL[ct.tipo]} · {RESULTADO_LABEL[ct.resultado]}
                            {ct.autor_nome ? ` · ${ct.autor_nome}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", stCfg.cor)}>
                            {stCfg.label}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 tabular-nums">{fmtData(ct.created_at)}</p>
                        </div>
                      </button>
                    );
                  })}
                  {recuperacao.lista.length === 0 && (
                    <EmptyMini texto="Nenhum contato registrado. Abra um cliente e registre um contato." />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ OPORTUNIDADES & RISCOS ══ */}
          {activeView === "acoes" && (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-sm min-h-0">
                <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2.5 shrink-0 bg-rose-500/5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Riscos ({alertas.filter((a) => a.tipo === "risco").length})</h3>
                </div>
                <div className="divide-y divide-border/40 flex-1 overflow-y-auto">
                  {alertas.filter((a) => a.tipo === "risco").map((a) => (
                    <div key={a.id} className="px-5 py-4.5 hover:bg-secondary/15 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{a.titulo}</p>
                        <span className="text-[10px] font-bold text-foreground tabular-nums shrink-0">{fmtBRLCompact(a.valor)}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-1 truncate">{a.nome_cliente}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed font-medium">{a.descricao}</p>
                    </div>
                  ))}
                  {alertas.filter((a) => a.tipo === "risco").length === 0 && <EmptyMini texto="Sem riscos detectados" />}
                </div>
              </div>

              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-sm min-h-0">
                <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2.5 shrink-0 bg-emerald-500/5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Oportunidades ({alertas.filter((a) => a.tipo === "oportunidade").length})</h3>
                </div>
                <div className="divide-y divide-border/40 flex-1 overflow-y-auto">
                  {alertas.filter((a) => a.tipo === "oportunidade").map((a) => (
                    <div key={a.id} className="px-5 py-4.5 hover:bg-secondary/15 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{a.titulo}</p>
                        <span className="text-[10px] font-bold text-foreground tabular-nums shrink-0">{fmtBRLCompact(a.valor)}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-tight mt-1 truncate">{a.nome_cliente}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed font-medium">{a.descricao}</p>
                    </div>
                  ))}
                  {alertas.filter((a) => a.tipo === "oportunidade").length === 0 && <EmptyMini texto="Sem oportunidades no momento" />}
                </div>
              </div>
            </div>
          )}

          {/* ══ MATRIZ RFV ══ */}
          {activeView === "matriz" && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className={cn("flex-1 flex items-center justify-center transition-all", selectedSegment && "lg:flex-[0.6]")}>
                <RFMMatrix data={rfvMatrixData} onCellClick={(label, clients) => setSelectedSegment({ label, clients: clients as unknown as ClienteFRVCalc[] })} />
              </div>
              {selectedSegment && (
                <div className="lg:flex-[0.4] bg-card border border-border/50 rounded-2xl shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 max-h-[calc(100vh-160px)]">
                  <div className="p-4.5 border-b border-border/50 flex items-center justify-between bg-secondary/15 shrink-0">
                    <div>
                      <h3 className="text-xs font-black text-foreground uppercase tracking-wider">{selectedSegment.label}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{selectedSegment.clients.length} clientes</p>
                    </div>
                    <button onClick={() => setSelectedSegment(null)} className="p-2 hover:bg-secondary rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {selectedSegment.clients.map((c) => (
                      <div key={c.cliente_id} className="p-3 bg-secondary/10 border border-border/40 rounded-xl flex flex-col gap-1.5 hover:border-border/80 transition-all">
                        <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate">{c.nome_cliente}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="text-muted-foreground font-semibold">{c.recencia_dias}d · {c.frequencia} pedidos</span>
                          <span className="font-bold text-foreground tabular-nums">{fmtBRLCompact(c.valor_total)}</span>
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
            <div className="flex flex-col gap-4 h-full">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <div className="relative group w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 bg-card border border-border/80 p-1 rounded-xl shrink-0 shadow-sm">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="p-1.5 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold px-2 uppercase tracking-widest">Pág {currentPage}/{totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="p-1.5 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0">
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[1180px]">
                    <thead className="sticky top-0 z-10 bg-card border-b border-border/80 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr>
                        <Th onClick={() => requestSort("nome_cliente")}>Cliente <SortIcon k="nome_cliente" /></Th>
                        <Th center>Segmento</Th>
                        <Th center onClick={() => requestSort("ultima_compra")}>Últ. Compra <SortIcon k="ultima_compra" /></Th>
                        <Th center onClick={() => requestSort("recencia_dias")}>Recência <SortIcon k="recencia_dias" /></Th>
                        <Th center onClick={() => requestSort("frequencia")}>Freq. <SortIcon k="frequencia" /></Th>
                        <Th right onClick={() => requestSort("ticket_medio")}>Ticket <SortIcon k="ticket_medio" /></Th>
                        <Th right onClick={() => requestSort("valor_total")}>Fat. {data?.janela_meses ?? janela}m <SortIcon k="valor_total" /></Th>
                        <Th right onClick={() => requestSort("margem_pct")}>Margem <SortIcon k="margem_pct" /></Th>
                        <Th center onClick={() => requestSort("variacao_pct")}>Variação <SortIcon k="variacao_pct" /></Th>
                        <Th center onClick={() => requestSort("risco_abandono")}>Risco <SortIcon k="risco_abandono" /></Th>
                        <Th center>Próx. Compra</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {paginated.map((c) => (
                        <tr
                          key={c.cliente_id}
                          onClick={() => setRaioX(c)}
                          className="hover:bg-secondary/20 even:bg-secondary/5 transition-colors group cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors truncate max-w-[220px]">{c.nome_cliente}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{c.cliente_id} · {c.nome_vendedor || "s/ vend."}</p>
                          </td>
                          <td className="px-4 py-3 text-center"><SegBadge cliente={c} /></td>
                          <td className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground">{fmtData(c.ultima_compra)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              c.recencia_dias <= 30
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                : c.recencia_dias <= 90
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                            )}>
                              {c.recencia_dias}d
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-xs text-foreground tabular-nums">{c.frequencia}</td>
                          <td className="px-4 py-3 text-right font-medium text-[11px] text-muted-foreground tabular-nums">{fmtBRLCompact(c.ticket_medio)}</td>
                          <td className="px-4 py-3 text-right font-bold text-xs text-foreground tabular-nums">{fmtBRLCompact(c.valor_total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[11px] tabular-nums" style={{ color: c.margem_pct >= 0 ? "#10b981" : "#ef4444" }}>{c.margem_pct.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-center">
                            {c.faturamento_anterior > 0 || c.faturamento_atual > 0 ? (
                              <Delta pct={c.variacao_pct} />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><div className="flex justify-center"><RiscoBar valor={c.risco_abandono} /></div></td>
                          <td className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground">
                            {c.proxima_compra ? (
                              <span className={cn(c.dias_para_proxima !== null && c.dias_para_proxima < 0 && "text-rose-600 dark:text-rose-400 font-bold bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10")}>
                                {fmtData(c.proxima_compra)}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-border/40 bg-secondary/10 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exibindo {paginated.length} de {baseFiltrada.length} clientes</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">Base: {data?.janela_meses}m · Atualizado {data ? new Date(data.gerado_em).toLocaleString("pt-BR") : ""}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <RaioXCliente
        cliente={raioX}
        janelaMeses={data?.janela_meses ?? 24}
        onClose={() => setRaioX(null)}
        userProfile={userProfile}
        onContatoRegistrado={reloadContatos}
      />
    </div>
  );
}

// ── Auxiliares de tabela / estados ───────────────────────────────────────────
function Th({ children, center, right, onClick }: { children: ReactNode; center?: boolean; right?: boolean; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-secondary/15",
        onClick && "cursor-pointer hover:text-primary hover:bg-secondary/30 transition-colors",
        center && "text-center",
        right && "text-right"
      )}
    >
      <span className={cn("flex items-center gap-1.5", center && "justify-center", right && "justify-end")}>{children}</span>
    </th>
  );
}

function EmptyMini({ texto }: { texto: string }) {
  return <div className="px-5 py-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">{texto}</div>;
}

function LoadingState() {
  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-4.5 space-y-3 shadow-sm">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
