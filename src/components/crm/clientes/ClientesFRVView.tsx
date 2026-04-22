import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  Users, 
  TrendingUp, 
  Wallet, 
  Download,
  Clock,
  LayoutGrid,
  BarChart4,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RFMMatrix } from "./RFMMatrix";
import { apiClientesFrv } from "@/lib/api";

interface ClienteFRV {
  cliente_id: string;
  nome_cliente: string;
  ultima_compra: string;
  recencia_dias: number;
  frequencia: number;
  valor_total: number;
  // RFM Scores
  r_score?: number;
  f_score?: number;
  m_score?: number;
  fm_score?: number;
}

export function ClientesFRVView() {
  const [activeView, setActiveView] = useState<"lista" | "analise">("lista");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [clientesRaw, setClientesRaw] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await apiClientesFrv();
        setClientesRaw(data as any[]);
      } catch (err) {
        console.error("Erro ao carregar dados FRV:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const processedData = useMemo(() => {
    if (!clientesRaw || clientesRaw.length === 0) return [];

    // Calcular Scores RFM (1-5) usando quintis
    const recenciaValues = [...clientesRaw].map(c => c.recencia_dias).sort((a, b) => a - b);
    const frequenciaValues = [...clientesRaw].map(c => c.frequencia).sort((a, b) => a - b);
    const valorValues = [...clientesRaw].map(c => parseFloat(String(c.valor_total)) || 0).sort((a, b) => a - b);

    const getScore = (value: number, sortedValues: number[], reverse = false) => {
      const idx = sortedValues.indexOf(value);
      const percentile = (idx + 1) / sortedValues.length;
      let score = Math.ceil(percentile * 5);
      if (reverse) score = 6 - score;
      return Math.min(Math.max(score, 1), 5);
    };

    return clientesRaw.map(c => {
      const valorTotal = parseFloat(String(c.valor_total)) || 0;
      const r = getScore(c.recencia_dias, recenciaValues, true); // Menos dias = Maior score
      const f = getScore(c.frequencia, frequenciaValues);
      const m = getScore(valorTotal, valorValues);
      
      // FM Score é a média arredondada de F e M
      const fm = Math.round((f + m) / 2);

      return {
        ...c,
        valor_total: valorTotal,
        r_score: r,
        f_score: f,
        m_score: m,
        fm_score: fm
      };
    }) as ClienteFRV[];
  }, [clientesRaw]);

  const filteredClientes = useMemo(() => {
    return processedData.filter(c => {
      const matchesSearch = c.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.cliente_id.includes(searchTerm);
      return matchesSearch;
    });
  }, [processedData, searchTerm]);

  const stats = useMemo(() => {
    const total = processedData.reduce((acc, c) => acc + c.valor_total, 0);
    const count = processedData.length;
    const avgTicket = count > 0 ? total / count : 0;
    return { total, count, avgTicket };
  }, [processedData]);

  const rfmMatrixData = useMemo(() => {
    return processedData.map(c => ({
      cliente_id: c.cliente_id,
      nome_cliente: c.nome_cliente,
      recencia_score: c.r_score || 1,
      fm_score: c.fm_score || 1
    }));
  }, [processedData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Processando Análise RFM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background p-6 gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              Carteira de Clientes - FRV
            </h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ml-14">
              Análise de Recência, Frequência e Valor (RFM)
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-secondary/30 p-1 rounded-xl border border-border/50 ml-4 shadow-inner">
            <button
              onClick={() => setActiveView("lista")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === "lista" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Base de Clientes
            </button>
            <button
              onClick={() => setActiveView("analise")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === "analise" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart4 className="w-4 h-4" />
              Matriz RFM
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-10 px-4 bg-secondary/50 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button className="h-10 px-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
            <TrendingUp className="w-4 h-4" />
            Sincronizar Dados
          </button>
        </div>
      </div>

      {activeView === "analise" ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col items-center justify-center p-4">
          <RFMMatrix data={rfmMatrixData} />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Volume de Vendas (Acumulado)</p>
              <h3 className="text-2xl font-black text-foreground tabular-nums">
                {stats.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total de Clientes Ativos</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stats.count}
              </h3>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ticket Médio por Cliente</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {stats.avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col lg:flex-row gap-3 items-center shrink-0">
            <div className="flex-1 relative group w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Buscar cliente na base analisada..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-md border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Última Compra</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Recência (Dias)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Frequência</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Valor Total</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Score RFM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.cliente_id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                            {cliente.nome_cliente}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground">ID: {cliente.cliente_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground">
                        {new Date(cliente.ultima_compra).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black",
                          cliente.recencia_dias <= 30 ? "bg-emerald-500/10 text-emerald-600" :
                          cliente.recencia_dias <= 90 ? "bg-amber-500/10 text-amber-600" :
                          "bg-rose-500/10 text-rose-600"
                        )}>
                          {cliente.recencia_dias} d
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-[11px] text-foreground">
                        {cliente.frequencia}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-[11px] text-foreground tabular-nums">
                        {cliente.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-muted-foreground uppercase">R</span>
                            <span className="text-[10px] font-black text-primary">{cliente.r_score}</span>
                          </div>
                          <div className="w-px h-4 bg-border mx-1" />
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-muted-foreground uppercase">F</span>
                            <span className="text-[10px] font-black text-primary">{cliente.f_score}</span>
                          </div>
                          <div className="w-px h-4 bg-border mx-1" />
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-muted-foreground uppercase">M</span>
                            <span className="text-[10px] font-black text-primary">{cliente.m_score}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
