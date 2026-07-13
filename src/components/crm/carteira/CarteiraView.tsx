import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Users,
  Wallet,
  Percent,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  UserSquare2,
  ShoppingCart,
  AlertTriangle,
  Building2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCarteira, type CarteiraResponse, type CarteiraCliente } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import { fmtBRL, fmtData } from "../clientes/frv-utils";

// ── Config ───────────────────────────────────────────────────────────────────
const NOW = new Date();
const MES_LABEL = NOW.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const POR_PAGINA = 12; // vendedores por página
const CLI_POR_PAGINA = 15; // clientes por página no drill-down

interface UserProfile {
  role?: string;
  department?: string;
  operator_code?: string;
  operatorCode?: string;
  is_admin?: boolean;
  is_leader?: boolean;
}

// Normaliza código de vendedor (remove zeros à esquerda p/ comparação)
const normCod = (s?: string) => {
  const t = String(s || "").trim();
  return t.replace(/^0+/, "") || t;
};

// Carteira agregada de um vendedor (mês atual)
interface Carteira {
  cod: string;
  nome: string;
  clientes: CarteiraCliente[];
  numClientes: number;
  valorTotal: number;
  margemTotal: number;
  margemPct: number;
  pedidos: number;
  ticketMedio: number;
}

type VendSortKey = "nome" | "numClientes" | "valorTotal" | "margemTotal" | "pedidos";
type CliSortKey = "nome_cliente" | "valor_mes" | "margem_mes" | "pedidos_mes" | "recencia_dias";

const getRecenciaDias = (ultimaCompra: string | null) => {
  if (!ultimaCompra) return Infinity;
  const d = new Date(ultimaCompra);
  if (isNaN(d.getTime())) return Infinity;
  const diffTime = Math.abs(NOW.getTime() - d.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatPhone = (phone?: string | null) => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("55") && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }
  
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return phone;
};

// ── Componentes de apoio ─────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  colorClass,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  colorClass: string;
  sub?: string;
}) {
  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/60 rounded-2xl p-5 relative overflow-hidden group hover:border-border/100 hover:bg-card/60 transition-all duration-300 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">{label}</span>
          <h3 className="text-2xl font-black text-foreground tabular-nums tracking-tight">{value}</h3>
        </div>
        <div className={cn("p-2.5 rounded-xl bg-secondary/50 border border-border/40", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {sub && (
        <div className="mt-3 pt-2.5 border-t border-border/30">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{sub}</span>
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all select-none hover:text-foreground cursor-pointer",
        active ? "text-primary font-black" : "text-muted-foreground",
        className
      )}
    >
      {label}
      <span className="flex flex-col opacity-75">
        <ChevronUp className={cn("w-2 h-2 -mb-0.5 transition-all duration-250", active && direction === "asc" ? "text-primary opacity-100 scale-110" : "opacity-30")} />
        <ChevronDown className={cn("w-2 h-2 transition-all duration-250", active && direction === "desc" ? "text-primary opacity-100 scale-110" : "opacity-30")} />
      </span>
    </button>
  );
}

function Pagination({
  page,
  totalItems,
  perPage,
  onPage,
}: {
  page: number;
  totalItems: number;
  perPage: number;
  onPage: (p: number) => void;
}) {
  if (totalItems === 0) return null;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const inicio = (page - 1) * perPage + 1;
  const subTotal = page * perPage;
  const fim = subTotal > totalItems ? totalItems : subTotal;
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-muted/10">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest tabular-nums">
        Exibindo <span className="text-foreground">{inicio}</span>–<span className="text-foreground">{fim}</span> de <span className="text-foreground">{totalItems}</span> registros
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-black text-foreground uppercase tracking-widest tabular-nums">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── View principal ───────────────────────────────────────────────────────────
export function CarteiraView({ userProfile }: { userProfile?: UserProfile }) {
  const [data, setData] = useState<CarteiraResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [vendSort, setVendSort] = useState<{ key: VendSortKey; dir: "asc" | "desc" }>({
    key: "valorTotal",
    dir: "desc",
  });
  const [page, setPage] = useState(1);

  // vendedor selecionado (drill-down)
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [buscaCli, setBuscaCli] = useState("");
  const [cliSort, setCliSort] = useState<{ key: CliSortKey; dir: "asc" | "desc" }>({
    key: "valor_mes",
    dir: "desc",
  });
  const [cliPage, setCliPage] = useState(1);

  // Admin/gestor vê todos os vendedores + filtro; vendedor comum vê só a própria carteira
  const isAdmin =
    userProfile?.is_admin === true ||
    userProfile?.is_leader === true ||
    (userProfile?.role || "").toUpperCase().includes("GERENTE") ||
    (userProfile?.role || "").toUpperCase().includes("DIRETOR") ||
    (userProfile?.role || "").toUpperCase().includes("ADMIN");
  const meuCod = normCod(userProfile?.operator_code || userProfile?.operatorCode);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await apiCarteira();
      setData(resp);
    } catch (err) {
      console.error("Erro ao carregar Carteira:", err);
      setErro("Não foi possível carregar as carteiras de clientes. Tente novamente.");
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agrupa clientes por vendedor
  const carteiras = useMemo<Carteira[]>(() => {
    if (!Array.isArray(data?.clientes) || data.clientes.length === 0) return [];
    const mapa = new Map<string, CarteiraCliente[]>();
    for (const c of data.clientes) {
      const cod = (c.cod_vendedor || "").trim() || "—";
      if (!mapa.has(cod)) mapa.set(cod, []);
      mapa.get(cod)!.push(c);
    }
    const out: Carteira[] = [];
    for (const [cod, clientes] of mapa) {
      const valorTotal = clientes.reduce((s, c) => s + c.valor_mes, 0);
      const margemTotal = clientes.reduce((s, c) => s + c.margem_mes, 0);
      const pedidos = clientes.reduce((s, c) => s + c.pedidos_mes, 0);
      const nome =
        clientes.find((c) => (c.nome_vendedor || "").trim())?.nome_vendedor?.trim() ||
        (cod === "—" ? "Sem vendedor" : cod);
      out.push({
        cod,
        nome,
        clientes,
        numClientes: clientes.length,
        valorTotal,
        margemTotal,
        margemPct: valorTotal > 0 ? (margemTotal / valorTotal) * 100 : 0,
        pedidos,
        ticketMedio: pedidos > 0 ? valorTotal / pedidos : 0,
      });
    }
    return out;
  }, [data]);

  // Escopo por permissão
  const carteirasVisiveis = useMemo(() => {
    if (isAdmin) return carteiras;
    if (!meuCod) return carteiras;
    return carteiras.filter((v) => normCod(v.cod) === meuCod);
  }, [carteiras, isAdmin, meuCod]);

  const showBackButton = isAdmin || carteirasVisiveis.length > 1;

  // Opções do filtro de vendedor
  const vendedorOptions = useMemo(
    () => [
      { label: "Todos os vendedores", value: "todos" },
      ...[...carteirasVisiveis]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((v) => ({ label: `${v.nome} (${v.cod})`, value: v.cod })),
    ],
    [carteirasVisiveis]
  );

  // KPIs globais
  const kpis = useMemo(() => {
    const base =
      filtroVendedor !== "todos"
        ? carteirasVisiveis.filter((v) => v.cod === filtroVendedor)
        : carteirasVisiveis;
    const totalVend = base.length;
    const totalCli = base.reduce((s, v) => s + v.numClientes, 0);
    const totalValor = base.reduce((s, v) => s + v.valorTotal, 0);
    const totalMargem = base.reduce((s, v) => s + v.margemTotal, 0);
    return {
      totalVend,
      totalCli,
      totalValor,
      margemPct: totalValor > 0 ? (totalMargem / totalValor) * 100 : 0,
    };
  }, [carteirasVisiveis, filtroVendedor]);

  // Lista ordenada + filtrada
  const carteirasFiltradas = useMemo(() => {
    let arr = carteirasVisiveis;
    if (filtroVendedor !== "todos") arr = arr.filter((v) => v.cod === filtroVendedor);
    const q = busca.trim().toLowerCase();
    if (q) arr = arr.filter((v) => v.nome.toLowerCase().includes(q) || v.cod.toLowerCase().includes(q));
    const { key, dir } = vendSort;
    const mult = dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (key === "nome") return a.nome.localeCompare(b.nome) * mult;
      return ((a[key] as number) - (b[key] as number)) * mult;
    });
  }, [carteirasVisiveis, filtroVendedor, busca, vendSort]);

  useEffect(() => {
    setPage(1);
  }, [busca, filtroVendedor, vendSort]);

  const totalPages = Math.max(1, Math.ceil(carteirasFiltradas.length / POR_PAGINA));
  const pageSafe = Math.min(page, totalPages);
  const carteirasPagina = useMemo(
    () => carteirasFiltradas.slice((pageSafe - 1) * POR_PAGINA, pageSafe * POR_PAGINA),
    [carteirasFiltradas, pageSafe]
  );

  const carteiraSel = useMemo(
    () => carteirasVisiveis.find((v) => v.cod === selecionado) || null,
    [carteirasVisiveis, selecionado]
  );

  useEffect(() => {
    if (!loading && !isAdmin && carteirasVisiveis.length === 1 && !selecionado) {
      setSelecionado(carteirasVisiveis[0].cod);
    }
  }, [loading, isAdmin, carteirasVisiveis, selecionado]);

  // Clientes do vendedor selecionado
  const clientesSel = useMemo(() => {
    if (!carteiraSel) return [];
    let arr = carteiraSel.clientes;
    const q = buscaCli.trim().toLowerCase();
    if (q) arr = arr.filter((c) => (c.nome_cliente || "").toLowerCase().includes(q));
    const { key, dir } = cliSort;
    const mult = dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (key === "nome_cliente") return (a.nome_cliente || "").localeCompare(b.nome_cliente || "") * mult;
      if (key === "recencia_dias") {
        const aDays = getRecenciaDias(a.ultima_compra);
        const bDays = getRecenciaDias(b.ultima_compra);
        return (aDays - bDays) * mult;
      }
      return (((a[key] as number) || 0) - ((b[key] as number) || 0)) * mult;
    });
  }, [carteiraSel, buscaCli, cliSort]);

  useEffect(() => {
    setCliPage(1);
  }, [buscaCli, cliSort, selecionado]);

  const cliTotalPages = Math.max(1, Math.ceil(clientesSel.length / CLI_POR_PAGINA));
  const cliPageSafe = Math.min(cliPage, cliTotalPages);
  const clientesPagina = useMemo(
    () => clientesSel.slice((cliPageSafe - 1) * CLI_POR_PAGINA, cliPageSafe * CLI_POR_PAGINA),
    [clientesSel, cliPageSafe]
  );

  const toggleVendSort = (key: VendSortKey) =>
    setVendSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const toggleCliSort = (key: CliSortKey) =>
    setCliSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  // Helper para renderizar crachá de margem de forma elegante
  const renderMarginBadge = (pct: number) => {
    let color = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    if (pct >= 30) color = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    else if (pct >= 18) color = "text-blue-500 bg-blue-500/10 border-blue-500/20";
    else if (pct >= 12) color = "text-amber-500 bg-amber-500/10 border-amber-500/20";

    return (
      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black border tracking-wider", color)}>
        {pct.toFixed(1).replace(".", ",")}%
      </span>
    );
  };

  // Helper para renderizar recência do cliente com bolinha de status
  const renderRecenciaBadge = (ultimaCompra: string | null) => {
    if (!ultimaCompra) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-secondary/50 text-muted-foreground border border-border/40">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
          Sem compras
        </span>
      );
    }
    const days = getRecenciaDias(ultimaCompra);
    let text = `Há ${days} dias`;
    let color = "bg-rose-500";
    let badgeCls = "bg-rose-500/10 text-rose-500 border-rose-500/20";

    if (days === 0) {
      text = "Hoje";
      color = "bg-emerald-500";
      badgeCls = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    } else if (days === 1) {
      text = "Ontem";
      color = "bg-emerald-500";
      badgeCls = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    } else if (days <= 30) {
      color = "bg-emerald-500";
      badgeCls = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    } else if (days <= 60) {
      color = "bg-amber-500";
      badgeCls = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }

    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border", badgeCls)}>
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", color)} />
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-full bg-background overflow-y-auto scrollbar-hide p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center gap-4 p-6">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <p className="text-sm font-bold text-foreground text-center max-w-sm">{erro}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  // ── Drill-down: carteira de um vendedor ───────────────────────────────────────
  if (carteiraSel) {
    return (
      <div className="h-full bg-background overflow-y-auto scrollbar-hide p-6 space-y-6">
        {/* Header com breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={() => {
                  setSelecionado(null);
                  setBuscaCli("");
                }}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border hover:shadow-sm transition-all cursor-pointer"
                title="Voltar para a lista"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">Cód. {carteiraSel.cod}</span>
                <h2 className="text-lg font-black text-foreground tracking-tight leading-none">{carteiraSel.nome}</h2>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Análise da carteira de clientes ativos · {MES_LABEL}
              </p>
            </div>
          </div>

          {/* Pesquisar Cliente (Lá em cima) */}
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={buscaCli}
              onChange={(e) => setBuscaCli(e.target.value)}
              placeholder="Pesquisar cliente..."
              className="w-full pl-9 pr-3 h-10 rounded-xl border border-border/80 bg-card/50 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Clientes Ativos" value={String(carteiraSel.numClientes)} icon={Users} colorClass="text-blue-500 bg-blue-500/10 border-blue-500/20" sub="carteira ativa" />
          <KpiCard label="Faturamento" value={fmtBRL(carteiraSel.valorTotal)} icon={Wallet} colorClass="text-emerald-500 bg-emerald-500/10 border-emerald-500/20" sub={`Total em ${MES_LABEL}`} />
          <KpiCard label="Margem Média" value={`${carteiraSel.margemPct.toFixed(1).replace(".", ",")}%`} icon={Percent} colorClass="text-violet-500 bg-violet-500/10 border-violet-500/20" sub={fmtBRL(carteiraSel.margemTotal)} />
          <KpiCard label="Total Pedidos" value={String(carteiraSel.pedidos)} icon={ShoppingCart} colorClass="text-amber-500 bg-amber-500/10 border-amber-500/20" sub={`Ticket Médio: ${fmtBRL(carteiraSel.ticketMedio)}`} />
        </div>

        {/* Tabela de clientes */}
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  <th className="text-left px-5 py-3.5">
                    <SortHeader label="Cliente / Razão Social" active={cliSort.key === "nome_cliente"} direction={cliSort.dir} onClick={() => toggleCliSort("nome_cliente")} />
                  </th>
                  <th className="text-left px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground select-none">Telefone</span>
                  </th>
                  <th className="text-right px-5 py-3.5">
                    <SortHeader label="Faturamento" active={cliSort.key === "valor_mes"} direction={cliSort.dir} onClick={() => toggleCliSort("valor_mes")} className="justify-end" />
                  </th>
                  <th className="text-right px-5 py-3.5 hidden md:table-cell">
                    <SortHeader label="Margem" active={cliSort.key === "margem_mes"} direction={cliSort.dir} onClick={() => toggleCliSort("margem_mes")} className="justify-end" />
                  </th>
                  <th className="text-right px-5 py-3.5 hidden sm:table-cell">
                    <SortHeader label="Pedidos" active={cliSort.key === "pedidos_mes"} direction={cliSort.dir} onClick={() => toggleCliSort("pedidos_mes")} className="justify-end" />
                  </th>
                  <th className="text-right px-5 py-3.5">
                    <SortHeader label="Recência" active={cliSort.key === "recencia_dias"} direction={cliSort.dir} onClick={() => toggleCliSort("recencia_dias")} className="justify-end" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/65">
                {clientesPagina.map((c) => {
                  const margemClientePct = c.valor_mes > 0 ? (c.margem_mes / c.valor_mes) * 100 : 0;
                  return (
                    <tr key={c.cliente_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-black text-foreground leading-snug">{c.nome_cliente}</p>
                        {c.empresa && (
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-1">
                            <Building2 className="w-3.5 h-3.5 text-primary/70" /> {c.empresa}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell text-left">
                        {c.telefone_cliente ? (
                          <span className="font-bold text-foreground tabular-nums select-all hover:text-primary transition-colors">
                            {formatPhone(c.telefone_cliente)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/45 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-foreground tabular-nums">{fmtBRL(c.valor_mes)}</td>
                      <td className="px-5 py-4 text-right tabular-nums hidden md:table-cell">
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <span className="font-bold text-foreground">{fmtBRL(c.margem_mes)}</span>
                          {renderMarginBadge(margemClientePct)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums hidden sm:table-cell font-bold text-muted-foreground">{c.pedidos_mes}</td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <div className="inline-flex flex-col items-end gap-1">
                          {renderRecenciaBadge(c.ultima_compra)}
                          {c.ultima_compra && <span className="text-[9px] font-bold text-muted-foreground/60">{fmtData(c.ultima_compra)}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {clientesSel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/5">
                      Nenhum cliente com movimento nesta carteira
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={cliPageSafe} totalItems={clientesSel.length} perPage={CLI_POR_PAGINA} onPage={setCliPage} />
        </div>
      </div>
    );
  }

  // ── Lista de carteiras ────────────────────────────────────────────────────────
  return (
    <div className="h-full bg-background overflow-y-auto scrollbar-hide p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight uppercase leading-none">
            {isAdmin ? "Gestão de Carteiras" : "Minha Carteira"}
          </h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Métricas consolidadas de clientes por vendedor · {MES_LABEL}
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-card text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Cards de KPIs Globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Vendedores Ativos" value={String(kpis.totalVend)} icon={UserSquare2} colorClass="text-blue-500 bg-blue-500/10 border-blue-500/20" sub="equipe com faturamento" />
        <KpiCard label="Clientes Ativos" value={String(kpis.totalCli)} icon={Users} colorClass="text-cyan-500 bg-cyan-500/10 border-cyan-500/20" sub="compraram no período" />
        <KpiCard label="Faturamento Total" value={fmtBRL(kpis.totalValor)} icon={Wallet} colorClass="text-emerald-500 bg-emerald-500/10 border-emerald-500/20" sub={MES_LABEL} />
        <KpiCard label="Margem Média" value={`${kpis.margemPct.toFixed(1).replace(".", ",")}%`} icon={Percent} colorClass="text-violet-500 bg-violet-500/10 border-violet-500/20" sub="consolidada da equipe" />
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar vendedor por nome ou código..."
            className="w-full pl-9 pr-3 h-10 rounded-xl border border-border/85 bg-card/50 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        {isAdmin && (
          <TinyDropdown
            icon={UserSquare2}
            value={filtroVendedor}
            options={vendedorOptions}
            onChange={setFiltroVendedor}
            variant="blue"
            className="min-w-[220px] max-w-[280px]"
          />
        )}
      </div>

      {/* Tabela Principal */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                <th className="text-left px-5 py-3.5">
                  <SortHeader label="Vendedor" active={vendSort.key === "nome"} direction={vendSort.dir} onClick={() => toggleVendSort("nome")} />
                </th>
                <th className="text-right px-5 py-3.5">
                  <SortHeader label="Clientes Ativos" active={vendSort.key === "numClientes"} direction={vendSort.dir} onClick={() => toggleVendSort("numClientes")} className="justify-end" />
                </th>
                <th className="text-right px-5 py-3.5">
                  <SortHeader label="Faturamento" active={vendSort.key === "valorTotal"} direction={vendSort.dir} onClick={() => toggleVendSort("valorTotal")} className="justify-end" />
                </th>
                <th className="text-right px-5 py-3.5 hidden md:table-cell">
                  <SortHeader label="Margem Média" active={vendSort.key === "margemTotal"} direction={vendSort.dir} onClick={() => toggleVendSort("margemTotal")} className="justify-end" />
                </th>
                <th className="text-right px-5 py-3.5 hidden sm:table-cell">
                  <SortHeader label="Pedidos" active={vendSort.key === "pedidos"} direction={vendSort.dir} onClick={() => toggleVendSort("pedidos")} className="justify-end" />
                </th>
                <th className="w-14 px-3 py-3.5 text-center text-muted-foreground uppercase font-black tracking-widest">Detalhar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/65">
              {carteirasPagina.map((v) => (
                <tr
                  key={v.cod}
                  onClick={() => {
                    setSelecionado(v.cod);
                    setCliSort({ key: "valor_mes", dir: "desc" });
                  }}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                        <UserSquare2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-foreground leading-tight truncate group-hover:text-primary transition-colors">{v.nome}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Cód. {v.cod}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-foreground tabular-nums">{v.numClientes}</td>
                  <td className="px-5 py-4 text-right font-black text-foreground tabular-nums">{fmtBRL(v.valorTotal)}</td>
                  <td className="px-5 py-4 text-right tabular-nums hidden md:table-cell">
                    {renderMarginBadge(v.margemPct)}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums hidden sm:table-cell font-bold text-muted-foreground">{v.pedidos}</td>
                  <td className="px-3 py-4 text-center">
                    <button className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-card/60 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 group-hover:shadow-sm active:scale-90 transition-all cursor-pointer">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {carteirasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/5">
                    Nenhum registro de carteira encontrado para {MES_LABEL}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pageSafe} totalItems={carteirasFiltradas.length} perPage={POR_PAGINA} onPage={setPage} />
      </div>
    </div>
  );
}
