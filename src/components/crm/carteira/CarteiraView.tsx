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
  ChevronsUpDown,
  UserSquare2,
  ShoppingCart,
  AlertTriangle,
  Building2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCarteira, type CarteiraResponse, type CarteiraCliente } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import { fmtBRL, fmtBRLCompact, fmtData } from "../clientes/frv-utils";

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

// ── Componentes de apoio ─────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={cn("absolute right-0 top-0 p-3 opacity-[0.07] group-hover:opacity-15 transition-opacity", accent)}>
        <Icon className="w-14 h-14" />
      </div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-foreground tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] font-bold text-muted-foreground mt-1">{sub}</p>}
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
        "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {label}
      {active ? (
        direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-50" />
      )}
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
  const fim = Math.min(page * perPage, totalItems);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest tabular-nums">
        {inicio}–{fim} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-black text-foreground uppercase tracking-widest tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
      setErro("Não foi possível carregar as carteiras. Tente novamente.");
    } finally {
      setTimeout(() => setLoading(false), 250);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agrupa clientes por vendedor (o back já retorna apenas o mês atual)
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

  // Escopo por permissão: vendedor comum só enxerga a própria carteira
  const carteirasVisiveis = useMemo(() => {
    if (isAdmin) return carteiras;
    if (!meuCod) return carteiras; // sem código → não restringe (ex.: perfil de suporte)
    return carteiras.filter((v) => normCod(v.cod) === meuCod);
  }, [carteiras, isAdmin, meuCod]);

  // Opções do filtro de vendedor (admin)
  const vendedorOptions = useMemo(
    () => [
      { label: "Todos os vendedores", value: "todos" },
      ...[...carteirasVisiveis]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((v) => ({ label: `${v.nome} (${v.cod})`, value: v.cod })),
    ],
    [carteirasVisiveis]
  );

  // KPIs globais (respeitando escopo + filtro)
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

  // Lista de vendedores filtrada + ordenada
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

  // Reseta paginação quando os filtros mudam
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

  // Clientes do vendedor selecionado (filtro + ordenação)
  const clientesSel = useMemo(() => {
    if (!carteiraSel) return [];
    let arr = carteiraSel.clientes;
    const q = buscaCli.trim().toLowerCase();
    if (q) arr = arr.filter((c) => (c.nome_cliente || "").toLowerCase().includes(q));
    const { key, dir } = cliSort;
    const mult = dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (key === "nome_cliente") return (a.nome_cliente || "").localeCompare(b.nome_cliente || "") * mult;
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

  // ── Loading / erro ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full bg-background overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center gap-3 p-6">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <p className="text-sm font-bold text-foreground">{erro}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  // ── Drill-down: carteira de um vendedor ───────────────────────────────────────
  if (carteiraSel) {
    return (
      <div className="h-full bg-background overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setSelecionado(null);
              setBuscaCli("");
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserSquare2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground leading-tight">{carteiraSel.nome}</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Cód. {carteiraSel.cod} · {carteiraSel.numClientes} clientes · {MES_LABEL}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Clientes" value={String(carteiraSel.numClientes)} icon={Users} accent="text-blue-600 dark:text-blue-400" sub="ativos no mês" />
          <KpiCard label="Faturamento" value={fmtBRLCompact(carteiraSel.valorTotal)} icon={Wallet} accent="text-emerald-600 dark:text-emerald-400" sub={MES_LABEL} />
          <KpiCard label="Margem" value={`${carteiraSel.margemPct.toFixed(1).replace(".", ",")}%`} icon={Percent} accent="text-violet-600 dark:text-violet-400" sub={fmtBRLCompact(carteiraSel.margemTotal)} />
          <KpiCard label="Pedidos" value={String(carteiraSel.pedidos)} icon={ShoppingCart} accent="text-amber-600 dark:text-amber-400" sub="no mês" />
        </div>

        {/* Busca de clientes */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={buscaCli}
            onChange={(e) => setBuscaCli(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Tabela de clientes */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3">
                    <SortHeader label="Cliente" active={cliSort.key === "nome_cliente"} direction={cliSort.dir} onClick={() => toggleCliSort("nome_cliente")} />
                  </th>
                  <th className="text-right px-4 py-3">
                    <SortHeader label="Faturamento" active={cliSort.key === "valor_mes"} direction={cliSort.dir} onClick={() => toggleCliSort("valor_mes")} className="justify-end" />
                  </th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">
                    <SortHeader label="Margem" active={cliSort.key === "margem_mes"} direction={cliSort.dir} onClick={() => toggleCliSort("margem_mes")} className="justify-end" />
                  </th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">
                    <SortHeader label="Pedidos" active={cliSort.key === "pedidos_mes"} direction={cliSort.dir} onClick={() => toggleCliSort("pedidos_mes")} className="justify-end" />
                  </th>
                  <th className="text-right px-4 py-3">
                    <SortHeader label="Últ. compra" active={cliSort.key === "recencia_dias"} direction={cliSort.dir} onClick={() => toggleCliSort("recencia_dias")} className="justify-end" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientesPagina.map((c) => (
                  <tr key={c.cliente_id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground leading-tight">{c.nome_cliente}</p>
                      {c.empresa && (
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {c.empresa}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-foreground tabular-nums">{fmtBRL(c.valor_mes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell text-muted-foreground">{fmtBRL(c.margem_mes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-muted-foreground">{c.pedidos_mes}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-muted-foreground">{fmtData(c.ultima_compra)}</td>
                  </tr>
                ))}
                {clientesSel.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Nenhum cliente encontrado
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
    <div className="h-full bg-background overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground leading-tight">
            {isAdmin ? "Carteira de Vendedores" : "Minha Carteira"}
          </h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Clientes por vendedor · {MES_LABEL}
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:shadow-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Vendedores" value={String(kpis.totalVend)} icon={UserSquare2} accent="text-blue-600 dark:text-blue-400" sub="ativos no mês" />
        <KpiCard label="Clientes" value={String(kpis.totalCli)} icon={Users} accent="text-cyan-600 dark:text-cyan-400" sub="compraram no mês" />
        <KpiCard label="Faturamento" value={fmtBRLCompact(kpis.totalValor)} icon={Wallet} accent="text-emerald-600 dark:text-emerald-400" sub={MES_LABEL} />
        <KpiCard label="Margem média" value={`${kpis.margemPct.toFixed(1).replace(".", ",")}%`} icon={Percent} accent="text-violet-600 dark:text-violet-400" />
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar vendedor…"
            className="w-full pl-9 pr-3 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {isAdmin && (
          <TinyDropdown
            icon={UserSquare2}
            value={filtroVendedor}
            options={vendedorOptions}
            onChange={setFiltroVendedor}
            variant="blue"
            className="min-w-[200px] max-w-[260px]"
          />
        )}
      </div>

      {/* Lista de carteiras (tabela) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3">
                  <SortHeader label="Vendedor" active={vendSort.key === "nome"} direction={vendSort.dir} onClick={() => toggleVendSort("nome")} />
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Clientes" active={vendSort.key === "numClientes"} direction={vendSort.dir} onClick={() => toggleVendSort("numClientes")} className="justify-end" />
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Faturamento" active={vendSort.key === "valorTotal"} direction={vendSort.dir} onClick={() => toggleVendSort("valorTotal")} className="justify-end" />
                </th>
                <th className="text-right px-4 py-3 hidden md:table-cell">
                  <SortHeader label="Margem" active={vendSort.key === "margemTotal"} direction={vendSort.dir} onClick={() => toggleVendSort("margemTotal")} className="justify-end" />
                </th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">
                  <SortHeader label="Pedidos" active={vendSort.key === "pedidos"} direction={vendSort.dir} onClick={() => toggleVendSort("pedidos")} className="justify-end" />
                </th>
                <th className="w-8 px-2 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {carteirasPagina.map((v) => (
                <tr
                  key={v.cod}
                  onClick={() => {
                    setSelecionado(v.cod);
                    setCliSort({ key: "valor_mes", dir: "desc" });
                  }}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                        <UserSquare2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-foreground leading-tight truncate">{v.nome}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cód. {v.cod}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-foreground tabular-nums">{v.numClientes}</td>
                  <td className="px-4 py-3 text-right font-black text-foreground tabular-nums">{fmtBRLCompact(v.valorTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell text-muted-foreground">
                    {v.margemPct.toFixed(1).replace(".", ",")}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-muted-foreground">{v.pedidos}</td>
                  <td className="px-2 py-3 text-right">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all inline" />
                  </td>
                </tr>
              ))}
              {carteirasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Nenhum vendedor com movimento em {MES_LABEL}
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
