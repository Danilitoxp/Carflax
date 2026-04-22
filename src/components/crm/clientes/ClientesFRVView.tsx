import { useState, useMemo, useEffect, memo } from "react";
import { 
  Search, 
  Users, 
  TrendingUp, 
  Wallet, 
  Clock,
  LayoutGrid,
  BarChart4,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Calendar as CalendarIcon,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RFMMatrix } from "./RFMMatrix";
import { apiClientesFrv } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

interface ClienteFRV {
  cliente_id: string;
  nome_cliente: string;
  ultima_compra: string;
  recencia_dias: number;
  frequencia: number;
  valor_total: number;
  r_score?: number;
  f_score?: number;
  v_score?: number;
  fv_score?: number;
}

const ClienteRow = memo(({ cliente }: { cliente: ClienteFRV }) => (
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
      {cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString('pt-BR') : '-'}
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
          <span className="text-[8px] font-black text-muted-foreground uppercase">V</span>
          <span className="text-[10px] font-black text-primary">{cliente.v_score}</span>
        </div>
      </div>
    </td>
  </tr>
));

ClienteRow.displayName = "ClienteRow";

const ITEMS_PER_PAGE = 50;

const DATE_PRESETS = [
  { label: "Últimos 7 Dias", value: "7d" },
  { label: "Últimos 30 Dias", value: "30d" },
  { label: "Últimos 3 Meses", value: "3m" },
  { label: "Último 1 Ano", value: "1y" },
  { label: "Todo Período", value: "all" },
  { label: "Personalizado", value: "custom" },
];

export function ClientesFRVView() {
  const [activeView, setActiveView] = useState<"lista" | "analise">("lista");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [clientesRaw, setClientesRaw] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSegment, setSelectedSegment] = useState<{ label: string; clients: any[] } | null>(null);
  
  // Filtro de Data
  const [preset, setPreset] = useState("3m");
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)),
    end: new Date()
  });

  const handlePresetChange = (val: string) => {
    setPreset(val);
    const end = new Date();
    let start = new Date();

    switch (val) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "3m":
        start.setMonth(end.getMonth() - 3);
        break;
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
      case "all":
        start = new Date(2000, 0, 1);
        break;
      case "custom":
        setShowCalendar(true);
        return; // Don't update range yet
    }

    setDateRange({ start, end });
    setShowCalendar(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];
      const data = await apiClientesFrv(startStr, endStr);
      setClientesRaw(data as any[]);
    } catch (err) {
      console.error("Erro ao carregar dados FRV:", err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const processedData = useMemo(() => {
    if (!clientesRaw || clientesRaw.length === 0) return [];

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
      const r = getScore(c.recencia_dias, recenciaValues, true);
      const f = getScore(c.frequencia, frequenciaValues);
      const v = getScore(valorTotal, valorValues);
      const fv = Math.round((f + v) / 2);

      return {
        ...c,
        valor_total: valorTotal,
        r_score: r,
        f_score: f,
        v_score: v,
        fv_score: fv
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

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClientes, currentPage]);

  const stats = useMemo(() => {
    const total = processedData.reduce((acc, c) => acc + c.valor_total, 0);
    const count = processedData.length;
    const avgTicket = count > 0 ? total / count : 0;
    return { total, count, avgTicket };
  }, [processedData]);

  const rfvMatrixData = useMemo(() => {
    return processedData.map(c => ({
      cliente_id: c.cliente_id,
      nome_cliente: c.nome_cliente,
      recencia_score: c.r_score || 1,
      fv_score: c.fv_score || 1
    }));
  }, [processedData]);

  return (
    <div className="h-full flex flex-col bg-background p-6 gap-6 overflow-hidden relative">
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
              Análise de Recência, Frequência e Valor (RFV)
            </p>
          </div>

          <div className="flex items-center bg-secondary/30 p-1 rounded-xl border border-border/50 ml-4 shadow-inner">
            <button
              onClick={() => setActiveView("lista")}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === "lista" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground disabled:opacity-50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Base de Clientes
            </button>
            <button
              onClick={() => {
                setActiveView("analise");
                setSelectedSegment(null);
              }}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === "analise" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground disabled:opacity-50"
              )}
            >
              <BarChart4 className="w-4 h-4" />
              Matriz RFV
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* PRESET SELECT */}
          <TinyDropdown 
            icon={History}
            value={preset}
            options={DATE_PRESETS}
            onChange={handlePresetChange}
            className="w-48"
            variant="blue"
          />

          {/* CALENDARIO MANUAL */}
          <div className="relative">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={cn(
                "h-10 px-4 bg-secondary/50 border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary transition-all flex items-center gap-3 group",
                preset === "custom" ? "border-primary text-primary" : "border-border text-muted-foreground"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>{dateRange.start.toLocaleDateString('pt-BR')} - {dateRange.end.toLocaleDateString('pt-BR')}</span>
            </button>

            {showCalendar && (
              <div className="absolute right-0 top-12 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <MiniCalendar 
                  mode="range"
                  initialStartDate={dateRange.start}
                  initialEndDate={dateRange.end}
                  onSelectRange={(start, end) => {
                    if (start && end) {
                      setDateRange({ start, end });
                      setPreset("custom");
                      setShowCalendar(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {!loading && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <button 
                onClick={loadData}
                className="h-10 px-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <TrendingUp className="w-4 h-4" />
                Atualizar
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-xl shrink-0" />
          <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-24" />)}
            </div>
            <div className="p-6 space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeView === "analise" ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={cn(
            "flex-1 flex flex-col items-center justify-center transition-all duration-500",
            selectedSegment && "lg:flex-[0.6]"
          )}>
            <RFMMatrix 
              data={rfvMatrixData} 
              onCellClick={(label, clients) => setSelectedSegment({ label, clients })}
            />
          </div>

          {selectedSegment && (
            <div className="lg:flex-[0.4] bg-card border border-border rounded-3xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
              <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Segmento: {selectedSegment.label}</h3>
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {selectedSegment.clients.length} {selectedSegment.clients.length === 1 ? 'Cliente encontrado' : 'Clientes encontrados'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSegment(null)}
                  className="p-2 hover:bg-secondary rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                {selectedSegment.clients.map((c, i) => (
                  <div 
                    key={c.cliente_id} 
                    className="p-4 bg-background border border-border/50 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                          {c.nome_cliente}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground">ID: {c.cliente_id}</span>
                      </div>
                      <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary/50 rounded-lg">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-muted-foreground uppercase">Score Recência</span>
                        <span className="text-[10px] font-black text-foreground">Nota {c.recencia_score}</span>
                      </div>
                      <div className="w-px h-6 bg-border" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-muted-foreground uppercase">Score FV</span>
                        <span className="text-[10px] font-black text-foreground">Nota {c.fv_score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-border bg-secondary/10 shrink-0">
                <button className="w-full py-4 bg-foreground text-background rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-xl">
                  Exportar Lista
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Volume de Vendas (Período)</p>
              <h3 className="text-2xl font-black text-foreground tabular-nums">
                {stats.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Clientes com Compra no Período</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stats.count}
              </h3>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ticket Médio (Período)</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {stats.avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 items-center shrink-0">
            <div className="flex-1 relative group w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Buscar cliente na base analisada..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl shrink-0">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black px-2 uppercase tracking-widest">
                  Pág {currentPage} de {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 hover:bg-secondary rounded-lg disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

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
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Score RFV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedClientes.map((cliente) => (
                    <ClienteRow key={cliente.cliente_id} cliente={cliente} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border bg-secondary/10 flex justify-between items-center shrink-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                Exibindo {paginatedClientes.length} de {filteredClientes.length} clientes encontrados
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
