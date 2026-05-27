import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Package,
  Clock,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CalendarClock,
  List,
  Play,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_SERVER = "https://marketing-banco-de-dados.velbav.easypanel.host";

interface Order {
  FGO_CODEMP: string;
  FGO_NUMDOC: string;
  FGO_CODVEN: string;
  NOME_VENDEDOR: string;
  FGO_CODCLI: string;
  NOME_CLIENTE: string;
  FGO_DTAENT: string;
  FGO_HORENT: string;
  STA_DESCRI: string;
  NOME_SEPARADOR: string;
  CODIGO_SEPARADOR: string;
  OBSERVACAO: string;
  LOCAL_RETIRADA: string;
  TIPO_MOVIMENTACAO: string;
  FGO_ENTFUT: string;
  FGO_SEPIMP: string;
  isSeparating: boolean;
  separatorName: string;
  separatorCode: string;
  qtdeSeparada: number;
  qtdeTotal: number;
  divergencias: { codigo_produto: string; descricao_produto: string; quantidade_pedida: number; quantidade_separada: number }[];
}

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  operator_code?: string;
  operatorCode?: string;
  permissions?: string[];
  is_admin?: boolean;
}

interface Props {
  userProfile?: UserProfile;
}

type FilterTab = "all" | "aguardando" | "separando";

function getDeliveryInfo(order: Order) {
  const locRet = order.LOCAL_RETIRADA || "";
  const entRet = order.TIPO_MOVIMENTACAO || "";

  if (entRet === "R" && locRet === "B")
    return { label: "BALCÃO 1", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (entRet === "R" && locRet === "B2")
    return { label: "BALCÃO 2", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (entRet === "R")
    return { label: "RETIRA", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
  if (entRet === "E")
    return { label: "ENTREGA", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { label: "OUTROS", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
}

function formatDate(raw: string) {
  if (!raw) return "--/--/----";
  try {
    const datePart = (typeof raw === "string" ? raw : new Date(raw).toISOString()).substring(0, 10);
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return "--/--/----";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function MeusPedidosView({ userProfile }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [usersCache, setUsersCache] = useState<Map<string, { name: string; avatar: string }>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const [erpRes, supabaseRes, usersRes, faltasRes] = await Promise.all([
        fetch(`${API_SERVER}/api/pedidos-separacao`).then((r) => r.json()),
        supabase.from("coletor_separacao").select("*"),
        supabase.from("usuarios").select("operator_code,name,avatar"),
        supabase.from("coletor_faltas").select("pedido,codigo_produto,descricao_produto,quantidade_pedida,quantidade_separada,resolvido").eq("resolvido", false),
      ]);

      // Build users cache
      if (usersRes.data) {
        const cache = new Map<string, { name: string; avatar: string }>();
        usersRes.data.forEach((u: any) => {
          const code = String(u.operator_code || "").trim();
          if (code) {
            const normalized = code.replace(/^0+/, "") || code;
            cache.set(normalized, { name: u.name || "", avatar: u.avatar || "" });
            cache.set(code, { name: u.name || "", avatar: u.avatar || "" });
          }
        });
        setUsersCache(cache);
      }

      if (erpRes.success && erpRes.data) {
        const locks = supabaseRes.data || [];
        const faltas = faltasRes.data || [];

        // Agrupar faltas por pedido
        const faltasPorPedido = new Map<string, typeof faltas>();
        faltas.forEach((f: any) => {
          const key = String(f.pedido).trim();
          if (!faltasPorPedido.has(key)) faltasPorPedido.set(key, []);
          faltasPorPedido.get(key)!.push(f);
        });

        // Filtrar por vendedor do usuário logado
        const meuCodigo = String(userProfile?.operator_code || userProfile?.operatorCode || "").trim();
        const meuCodigoNorm = meuCodigo.replace(/^0+/, "") || meuCodigo;
        const isAdmin = userProfile?.is_admin === true;

        const pedidosDoVendedor = isAdmin
          ? erpRes.data
          : erpRes.data.filter((order: any) => {
              const codVendedor = String(order.FGO_CODVEN || "").trim();
              const codVendedorNorm = codVendedor.replace(/^0+/, "") || codVendedor;
              return codVendedorNorm === meuCodigoNorm || codVendedor === meuCodigo;
            });

        const mapped: Order[] = pedidosDoVendedor.map((order: any) => {
          const normalizedId = String(order.FGO_NUMDOC).padStart(12, "0");
          const lock = locks.find((l: any) => String(l.pedido_id).trim() === normalizedId);

          let isSeparating = false;
          let separatorName = "";
          let separatorCode = "";
          let qtdeSeparada = 0;
          let qtdeTotal = 0;

          if (lock) {
            const lockedTime = lock.locked_at ? new Date(lock.locked_at).getTime() : 0;
            const stale = Date.now() - lockedTime > 30 * 60 * 1000;
            qtdeSeparada = lock.qtde_separada || 0;
            qtdeTotal = lock.qtde_total || 0;
            if (!stale && lock.operador_nome) {
              isSeparating = true;
              separatorName = lock.operador_nome;
              separatorCode = String(lock.operador || "").trim();
            }
          }

          const numDoc = String(order.FGO_NUMDOC).trim();
          const pedidoFaltas = faltasPorPedido.get(numDoc) || faltasPorPedido.get(normalizedId) || [];

          return {
            ...order,
            isSeparating,
            separatorName,
            separatorCode,
            qtdeSeparada,
            qtdeTotal,
            divergencias: pedidoFaltas,
          };
        });

        setOrders(mapped);
      }
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("meus-pedidos-locks")
      .on("postgres_changes", { event: "*", schema: "public", table: "coletor_separacao" }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const filtered = useMemo(() => {
    let list = orders;

    if (filterTab === "aguardando") list = list.filter((o) => !o.isSeparating);
    if (filterTab === "separando") list = list.filter((o) => o.isSeparating);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.NOME_CLIENTE || "").toLowerCase().includes(q) ||
          String(Number(o.FGO_NUMDOC)).includes(q) ||
          (o.NOME_VENDEDOR || "").toLowerCase().includes(q)
      );
    }

    // separating first, then most recent
    return [...list].sort((a, b) => {
      if (a.isSeparating && !b.isSeparating) return -1;
      if (!a.isSeparating && b.isSeparating) return 1;
      const dateA = `${a.FGO_DTAENT || ""} ${a.FGO_HORENT || ""}`;
      const dateB = `${b.FGO_DTAENT || ""} ${b.FGO_HORENT || ""}`;
      return dateB.localeCompare(dateA);
    });
  }, [orders, filterTab, search]);

  const countAguardando = orders.filter((o) => !o.isSeparating).length;
  const countSeparando = orders.filter((o) => o.isSeparating).length;

  const tabs: { key: FilterTab; label: string; icon: any; count?: number }[] = [
    { key: "all", label: "Todos", icon: List, count: orders.length },
    { key: "aguardando", label: "Aguardando", icon: Clock, count: countAguardando },
    { key: "separando", label: "Em Separação", icon: Play, count: countSeparando },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Meus Pedidos</h1>
              <p className="text-xs text-muted-foreground">
                {orders.length} pedidos em separação
              </p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  filterTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    filterTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, pedido ou vendedor..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold">Nenhum pedido encontrado</p>
            <p className="text-sm">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((order, idx) => (
              <OrderCard key={`${order.FGO_CODEMP}-${order.FGO_NUMDOC}-${idx}`} order={order} usersCache={usersCache} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, usersCache }: { order: Order; usersCache: Map<string, { name: string; avatar: string }> }) {
  const delivery = getDeliveryInfo(order);
  const pct = order.qtdeTotal > 0 ? Math.round((order.qtdeSeparada / order.qtdeTotal) * 100) : 0;
  const operatorInfo = usersCache.get(order.separatorCode) || null;

  const avatarSrc = operatorInfo?.avatar
    ? operatorInfo.avatar.startsWith("data:")
      ? operatorInfo.avatar
      : `data:image/jpeg;base64,${operatorInfo.avatar}`
    : "";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col gap-3 transition-all hover:shadow-md",
        order.isSeparating
          ? "border-emerald-500/30 shadow-emerald-500/5"
          : "border-border/50 hover:border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground tracking-tight">
              #{String(Number(order.FGO_NUMDOC))}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              EMP {order.FGO_CODEMP}
            </span>
            {order.FGO_ENTFUT === "S" && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <CalendarClock className="w-3 h-3" />
                ENCOMENDA
              </span>
            )}
            {order.FGO_SEPIMP === "2" && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                <AlertCircle className="w-3 h-3" />
                ALTERADO
              </span>
            )}
            {order.divergencias.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <AlertTriangle className="w-3 h-3" />
                {order.divergencias.length} FALTA{order.divergencias.length > 1 ? "S" : ""}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground mt-1 truncate">
            {order.NOME_CLIENTE}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status:</span>
          {order.isSeparating ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Em Separação
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              Aguardando
            </span>
          )}
        </div>

        {order.isSeparating && (
          <>
            {/* Operator */}
            <div className="flex items-center gap-2.5">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  className="w-7 h-7 rounded-full object-cover"
                  alt={order.separatorName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {getInitials(order.separatorName)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">{order.separatorName}</span>
                <span className="text-[10px] text-muted-foreground">Operador</span>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold text-foreground">
                  {order.qtdeSeparada} / {order.qtdeTotal} SKUs ({pct}%)
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divergências */}
      {order.divergencias.length > 0 && (
        <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] font-bold text-orange-400">Itens em falta</span>
            </div>
            <button
              onClick={() => {
                const numDoc = String(order.FGO_NUMDOC).trim();
                window.dispatchEvent(
                  new CustomEvent("open-crm-chat", {
                    detail: {
                      doc: numDoc,
                      title: order.NOME_CLIENTE,
                      sellerName: order.separatorName || order.NOME_SEPARADOR || "Separador",
                      sellerCode: order.separatorCode || order.CODIGO_SEPARADOR || "",
                    },
                  })
                );
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[10px] font-semibold transition-colors"
              title="Conversar com o separador"
            >
              <MessageSquare className="w-3 h-3" />
              Mensagem
            </button>
          </div>
          <div className="space-y-1">
            {order.divergencias.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-orange-300/80 truncate flex-1 mr-2">
                  {d.descricao_produto || d.codigo_produto}
                </span>
                <span className="text-orange-400 font-semibold whitespace-nowrap">
                  {d.quantidade_separada}/{d.quantidade_pedida}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observation */}
      {order.OBSERVACAO && order.OBSERVACAO.trim() && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <span className="text-[11px] text-amber-400 leading-tight line-clamp-2">
            {order.OBSERVACAO}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(order.FGO_DTAENT)} - {order.FGO_HORENT || "--:--"}</span>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", delivery.color)}>
          {delivery.label}
        </span>
      </div>
    </div>
  );
}
