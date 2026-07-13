import { useState, useEffect, useMemo } from "react";
import { 
  Store, Clock, CheckCircle2, Package, RefreshCw, 
  Search, PlayCircle, StopCircle, UserCheck 
} from "lucide-react";
import { apiRetiradaPedidos } from "@/lib/api";
import type { RetiradaPedido } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface RetiradaState {
  id?: string;
  pedido: string;
  cliente: string;
  empresa: string;
  status: "pendente" | "retirando" | "finalizado";
  notificado_em: string | null;
  finalizado_em: string | null;
  operator_name: string | null;
}

export function RetiradaView({ userProfile }: { userProfile?: { name: string } }) {
  const [erpPedidos, setErpPedidos] = useState<RetiradaPedido[]>([]);
  const [supabaseRetiradas, setSupabaseRetiradas] = useState<RetiradaState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"todos" | "pendente" | "retirando" | "finalizado">("todos");
  
  // Para atualizar o cronômetro em tempo real a cada segundo
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca dados iniciais
  const fetchData = async () => {
    setRefreshing(true);
    try {
      // 1) Busca pedidos Balcão 2 do ERP (MySQL)
      const erpData = await apiRetiradaPedidos();
      setErpPedidos(erpData || []);

      // 2) Busca estados do Supabase
      const { data: sbData, error } = await supabase
        .from("retiradas")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && sbData) {
        setSupabaseRetiradas(sbData as RetiradaState[]);
      }
    } catch (err) {
      console.error("Erro ao buscar dados de retirada:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 3) Se inscreve em mudanças da tabela 'retiradas' no Supabase
    const channel = supabase
      .channel("realtime-retiradas-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "retiradas" },
        (payload) => {
          const oldVal = payload.old as RetiradaState;
          const newVal = payload.new as RetiradaState;

          if (payload.eventType === "INSERT") {
            setSupabaseRetiradas((prev) => [newVal, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setSupabaseRetiradas((prev) =>
              prev.map((item) => (item.pedido === newVal.pedido ? newVal : item))
            );
          } else if (payload.eventType === "DELETE") {
            setSupabaseRetiradas((prev) =>
              prev.filter((item) => item.pedido !== oldVal.pedido)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Mapeia o estado atual de cada pedido ERP
  const pedidosComEstado = useMemo(() => {
    const map = new Map<string, RetiradaState>();
    supabaseRetiradas.forEach((r) => map.set(r.pedido, r));

    return erpPedidos.map((p) => {
      const state = map.get(p.pedido);
      return {
        ...p,
        status: state ? state.status : ("pendente" as const),
        notificado_em: state ? state.notificado_em : null,
        finalizado_em: state ? state.finalizado_em : null,
        operator_name: state ? state.operator_name : null,
      };
    });
  }, [erpPedidos, supabaseRetiradas]);

  // Ações
  const handleAvisarGerente = async (pedido: RetiradaPedido) => {
    const operator = userProfile?.name || "Operador";
    const data: Omit<RetiradaState, "id"> = {
      pedido: pedido.pedido,
      cliente: pedido.cliente,
      empresa: pedido.empresa,
      status: "retirando",
      notificado_em: new Date().toISOString(),
      finalizado_em: null,
      operator_name: operator,
    };

    try {
      const { error } = await supabase
        .from("retiradas")
        .upsert([data], { onConflict: "pedido" });

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao avisar gerente:", err);
    }
  };

  const handleFinalizarRetirada = async (pedido: string) => {
    try {
      const { error } = await supabase
        .from("retiradas")
        .update({
          status: "finalizado",
          finalizado_em: new Date().toISOString(),
        })
        .eq("pedido", pedido);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao finalizar retirada:", err);
    }
  };

  // Filtros
  const filteredPedidos = useMemo(() => {
    return pedidosComEstado.filter((p) => {
      const matchSearch =
        p.pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchFilter =
        activeFilter === "todos" || p.status === activeFilter;

      return matchSearch && matchFilter;
    });
  }, [pedidosComEstado, searchTerm, activeFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    let aguardando = 0;
    let emRetirada = 0;
    let finalizadosHoje = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    pedidosComEstado.forEach((p) => {
      if (p.status === "pendente") aguardando++;
      else if (p.status === "retirando") emRetirada++;
      else if (p.status === "finalizado") {
        if (p.finalizado_em) {
          const finTime = new Date(p.finalizado_em).getTime();
          if (finTime >= startOfToday.getTime()) {
            finalizadosHoje++;
          }
        }
      }
    });

    return { aguardando, emRetirada, finalizadosHoje };
  }, [pedidosComEstado]);

  // Helpers de Tempo
  const formatElapsedTime = (startStr: string) => {
    const start = new Date(startStr).getTime();
    const diff = Math.max(0, now - start);
    const secs = Math.floor(diff / 1000) % 60;
    const mins = Math.floor(diff / 60000) % 60;
    const hrs = Math.floor(diff / 3600000);

    return hrs > 0
      ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatFixedDuration = (startStr: string, endStr: string) => {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diff = Math.max(0, end - start);
    const secs = Math.floor(diff / 1000) % 60;
    const mins = Math.floor(diff / 60000) % 60;
    const hrs = Math.floor(diff / 3600000);

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="p-6 pt-4 h-full overflow-y-auto scrollbar-hide flex flex-col font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Retirada de Material
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Gerencie e monitore o tempo de entrega para pedidos do Balcão 2.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Pesquisar pedido ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card hover:bg-card/80 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 bg-card hover:bg-secondary border border-border text-foreground hover:text-primary rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Aguardando */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 hover:border-border transition-all flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500 ease-out" />
          <div className="space-y-1 relative">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Aguardando Cliente
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.aguardando}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Pedidos Balcão 2 prontos para retirada
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20 relative">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Em Retirada */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 hover:border-border transition-all flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500 ease-out" />
          <div className="space-y-1 relative">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Em Retirada
            </span>
            <div className="text-3xl font-black text-rose-500 flex items-center space-x-2">
              <span>{stats.emRetirada}</span>
              {stats.emRetirada > 0 && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Clientes no balcão aguardando o material
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center border border-rose-500/20 relative">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Finalizados Hoje */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 hover:border-border transition-all flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500 ease-out" />
          <div className="space-y-1 relative">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Finalizados Hoje
            </span>
            <div className="text-3xl font-black text-emerald-500">
              {stats.finalizadosHoje}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Entregas efetuadas hoje com sucesso
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20 relative">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border">
        {(["todos", "pendente", "retirando", "finalizado"] as const).map((tab) => {
          const count = 
            tab === "todos" 
              ? filteredPedidos.length 
              : tab === "pendente" 
              ? stats.aguardando 
              : tab === "retirando" 
              ? stats.emRetirada 
              : supabaseRetiradas.filter(r => r.status === "finalizado").length;

          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative ${
                activeFilter === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span>
                  {tab === "todos"
                    ? "Todos"
                    : tab === "pendente"
                    ? "Aguardando"
                    : tab === "retirando"
                    ? "Em Retirada"
                    : "Finalizados"}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeFilter === tab
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredPedidos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/80 rounded-3xl">
          <Store className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="font-extrabold text-foreground">Nenhum pedido encontrado</p>
          <p className="text-xs text-muted-foreground">Não há pedidos nesta categoria correspondentes à sua pesquisa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          <AnimatePresence mode="popLayout">
            {filteredPedidos.map((pedido) => {
              const hasAlert = pedido.status === "retirando";
              const isDone = pedido.status === "finalizado";
              const isWaiting = pedido.status === "pendente";

              return (
                <motion.div
                  key={pedido.pedido}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col relative transition-all ${
                    hasAlert 
                      ? "border-rose-500 ring-2 ring-rose-500/20" 
                      : isDone 
                      ? "border-emerald-500/30 opacity-80" 
                      : "border-border hover:border-border-hover"
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`h-1.5 w-full ${
                    hasAlert ? "bg-rose-500" : isDone ? "bg-emerald-500" : "bg-amber-500"
                  }`} />

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border uppercase tracking-widest">
                          Pedido #{pedido.pedido}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 mt-1.5" title={pedido.cliente}>
                          {pedido.cliente}
                        </h3>
                      </div>
                      
                      {/* Qtd SKUs */}
                      <div className="text-right">
                        <span className="text-[10px] font-black text-muted-foreground flex items-center space-x-1 justify-end uppercase">
                          <Package className="w-3.5 h-3.5 mr-0.5 text-muted-foreground/60" />
                          <span>{pedido.qtd_sku} SKU{pedido.qtd_sku !== 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    </div>

                    {/* Timeline Info / Chronometer */}
                    <div className="bg-secondary/40 border border-border/60 rounded-xl p-3.5 space-y-2.5">
                      {isWaiting && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1 text-muted-foreground/60" /> Concluído às:
                          </span>
                          <span className="font-extrabold text-foreground">
                            {pedido.hora_conferencia ? pedido.hora_conferencia.substring(0, 8) : "--:--"}
                          </span>
                        </div>
                      )}

                      {hasAlert && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-rose-500 font-extrabold flex items-center">
                            <span className="flex h-2 w-2 relative mr-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            Tempo aguardando:
                          </span>
                          <span className="font-black text-rose-500 text-sm tracking-tight font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            {pedido.notificado_em ? formatElapsedTime(pedido.notificado_em) : "00:00"}
                          </span>
                        </div>
                      )}

                      {isDone && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1 text-muted-foreground/60" /> Tempo de entrega:
                            </span>
                            <span className="font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {pedido.notificado_em && pedido.finalizado_em 
                                ? formatFixedDuration(pedido.notificado_em, pedido.finalizado_em) 
                                : "--:--"}
                            </span>
                          </div>
                          {pedido.operator_name && (
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-medium flex items-center">
                                <UserCheck className="w-3 h-3 mr-1 text-muted-foreground/60" /> Operador:
                              </span>
                              <span className="font-bold truncate max-w-[120px]">
                                {pedido.operator_name}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="pt-2">
                      {isWaiting && (
                        <button
                          onClick={() => handleAvisarGerente(pedido)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-amber-500/15 flex items-center justify-center space-x-1.5 transition-all hover:shadow-lg"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Avisar Gerente (Chegou)</span>
                        </button>
                      )}

                      {hasAlert && (
                        <button
                          onClick={() => handleFinalizarRetirada(pedido.pedido)}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md shadow-emerald-500/15 flex items-center justify-center space-x-1.5 transition-all hover:shadow-lg"
                        >
                          <StopCircle className="w-4 h-4 animate-pulse" />
                          <span>Finalizar Retirada</span>
                        </button>
                      )}

                      {isDone && (
                        <div className="w-full py-2 bg-emerald-500/5 text-emerald-500 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-500/20 flex items-center justify-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Material Retirado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
