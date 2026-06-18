import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
  Download,
  Timer,
  Filter,
  X
} from "lucide-react";
import { marketingService } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  
  const [hourlyData, setHourlyData] = useState<number[]>(new Array(24).fill(0));
  const [stats, setStats] = useState({
    leadsToday: 0,
    leadsMonth: 0,
    frioToday: 0,
    mornoToday: 0,
    quenteToday: 0,
    billingToday: 0,
    billingMonth: 0,
    avgTicket: 0,
    conversionRate: 0,
    avgFirstResponseMinutes: null as number | null
  });
  const [showFunnel, setShowFunnel] = useState(false);
  const [exporting, setExporting] = useState(false);

  const peakHour = useMemo(() => {
    let maxVal = -1;
    let maxH = -1;
    hourlyData.forEach((val, h) => {
      if (val > maxVal) {
        maxVal = val;
        maxH = h;
      }
    });
    return { hour: maxH, count: maxVal };
  }, [hourlyData]);


  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const filters = {};

        const [marketingData, hourlyLeads, avgResponseTime]: [{ leadsToday: number; leadsMonth: number; frioToday: number; mornoToday: number; quenteToday: number; billingToday: number; billingMonth: number; salesCountToday: number; salesCountMonth: number }, number[], number | null] = await Promise.all([
          marketingService.getMarketingStats(startDate, endDate || undefined, filters),
          marketingService.getHourlyLeads(startDate, endDate || undefined, filters),
          marketingService.getAvgFirstResponseTime(startDate, endDate || undefined)
        ]);

        setHourlyData(hourlyLeads);

        // Usa os dados manuais do marketing para faturamento
        const totalBillingMonth = marketingData.billingMonth;
        const totalBillingToday = marketingData.billingToday;
        
        // Métricas de performance (baseadas em vendas manuais)
        const totalVendas = marketingData.salesCountMonth;
        const avgTicket = totalVendas > 0 ? totalBillingMonth / totalVendas : 0;
        const conversionRate = marketingData.leadsMonth > 0 ? (totalVendas / marketingData.leadsMonth) * 100 : 0;

        setStats({
          leadsToday: marketingData.leadsToday,
          leadsMonth: marketingData.leadsMonth,
          frioToday: marketingData.frioToday,
          mornoToday: marketingData.mornoToday,
          quenteToday: marketingData.quenteToday,
          billingToday: totalBillingToday,
          billingMonth: totalBillingMonth,
          avgTicket,
          conversionRate,
          avgFirstResponseMinutes: avgResponseTime
        });
      } catch (err) {
        console.error("Erro ao carregar relatórios:", err);
      } finally {
        setLoading(false);
      }
    }
    if (!startDate || !endDate) return;
    loadData();
  }, [startDate, endDate]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatResponseTime = (minutes: number | null): string => {
    if (minutes === null) return "—";
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-primary">Gerando Relatórios...</span>
      </div>
    );
  }

  const dateLabel =
    endDate !== null
      ? `${startDate?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} até ${endDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
      : startDate
      ? `${startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}...`
      : "Selecione o período...";

  if (loading && !stats.leadsToday && !stats.leadsMonth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-primary">Gerando Relatórios...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0 mb-6 border-b border-border pb-6 px-1">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Desempenho de Marketing
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
              Métricas de atração, conversão e SLA de resposta de leads
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-start md:justify-end">
            {/* Date */}
            <div className="relative">
              <button
                onClick={() => setIsDateModalOpen(!isDateModalOpen)}
                className={cn(
                  "h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 transition-all outline-none",
                  startDate && endDate
                    ? "bg-blue-600/10 dark:bg-blue-500/20 border-blue-600/20 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "bg-card border-border text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 shadow-sm",
                  isDateModalOpen && "ring-4 ring-blue-500/5 border-blue-500/50"
                )}
              >
                <Calendar className="w-3.5 h-3.5 opacity-40 shrink-0" />
                <span className="truncate max-w-[200px]">{dateLabel}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300 opacity-40 shrink-0", isDateModalOpen && "rotate-180")} />
              </button>
              {isDateModalOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateModalOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 z-50">
                    <MiniCalendar 
                      mode="range" 
                      onSelectRange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                        if (start && end) setIsDateModalOpen(false);
                      }} 
                      initialStartDate={startDate} 
                      initialEndDate={endDate} 
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowFunnel(true)}
              className={cn(
                "w-10 h-10 border rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center group",
                showFunnel ? "bg-primary border-primary text-white" : "bg-card border-border text-muted-foreground hover:bg-secondary"
              )}
              title="Ver Funil de Vendas"
            >
              <Filter className="w-4 h-4" />
            </button>

            <button
              onClick={async () => {
                if (exporting || !startDate || !endDate) return;
                setExporting(true);
                try {
                  const result = await marketingService.exportLeadsXlsx(startDate, endDate);
                  if (!result) {
                    alert('Nenhum lead encontrado no período selecionado.');
                  }
                } catch (err) {
                  console.error('Erro ao exportar:', err);
                  alert('Erro ao gerar relatório. Tente novamente.');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className={cn(
                "w-10 h-10 border rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center group",
                exporting ? "bg-blue-600/10 border-blue-600/20 cursor-wait" : "bg-card border-border hover:bg-secondary text-muted-foreground"
              )}
              title="Exportar Planilha de Leads"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Leads no Período */}
          <StatCard 
            title={endDate ? "Leads no Período" : "Leads Hoje"} 
            value={stats.leadsToday} 
            icon={<Users className="w-6 h-6" />}
            color="bg-blue-500"
            subValue="+12% que ontem"
            isPositive={true}
          />

          {/* Leads Mês */}
          <StatCard 
            title="Leads no Mês" 
            value={stats.leadsMonth} 
            icon={<Target className="w-6 h-6" />}
            color="bg-indigo-500"
            subValue="Meta: 500"
            isPositive={stats.leadsMonth > 400}
            progress={Math.min((stats.leadsMonth / 500) * 100, 100)}
          />

          {/* Faturamento no Período */}
          <StatCard 
            title={endDate ? "Vendas no Período" : "Vendas Hoje"} 
            value={formatCurrency(stats.billingToday)} 
            icon={<DollarSign className="w-6 h-6" />}
            color="bg-emerald-500"
            subValue="Melhor que média"
            isPositive={true}
          />

          {/* Faturamento Mês */}
          <StatCard 
            title="Faturamento Mês" 
            value={formatCurrency(stats.billingMonth)} 
            icon={<TrendingUp className="w-6 h-6" />}
            color="bg-rose-500"
            subValue="Meta de faturamento"
            isPositive={true}
            progress={88}
          />
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden group/chart flex flex-col justify-between">
             <h3 className="text-lg font-bold uppercase tracking-tight mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-primary rounded-full" />
                  Fluxo de Leads por Horário
                </div>
                <span className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">Picos de Hoje</span>
             </h3>
             
             <div className="h-64 flex items-end gap-1.5 sm:gap-3 relative z-10">
                {/* Subtle horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                   <div className="w-full border-t border-foreground h-0" />
                   <div className="w-full border-t border-foreground h-0" />
                   <div className="w-full border-t border-foreground h-0" />
                   <div className="w-full border-t border-foreground h-0" />
                </div>

                {(() => {
                  const day = (startDate || new Date()).getDay();
                  const isSaturday = day === 6;
                  
                  // Define o range de exibição
                  const startH = isSaturday ? 8 : (day === 0 ? 0 : 7);
                  const endH = isSaturday ? 12 : (day === 0 ? 23 : 17);

                  const filteredData = hourlyData.map((val, h) => ({ val, h }))
                    .filter(d => d.h >= startH && d.h <= endH);

                  const maxLeads = Math.max(...filteredData.map(d => d.val), 1);

                  return filteredData.map(({ val, h }) => {
                    const height = (val / maxLeads) * 100;
                    return (
                      <div key={h} className="flex-1 h-full flex flex-col justify-end items-center gap-3 group/bar z-10">
                        <div className="flex-1 w-full flex flex-col justify-end relative">
                          <div 
                            className={cn(
                              "w-full rounded-full transition-all duration-500 relative min-h-[4px]",
                              val > 0 
                                ? "bg-gradient-to-t from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-indigo-400 cursor-pointer" 
                                : "bg-secondary/35 hover:bg-secondary/50"
                            )} 
                            style={{ height: `${val > 0 ? Math.max(height, 8) : 4}%` }}
                          >
                             {val > 0 && (
                               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/10 px-2.5 py-1 rounded-xl text-[9px] font-black text-white opacity-0 group-hover/bar:opacity-100 transition-all transform group-hover/bar:-translate-y-1.5 z-20 shadow-2xl whitespace-nowrap">
                                 {val} {val === 1 ? 'lead' : 'leads'} • {h}h
                               </div>
                             )}
                          </div>
                        </div>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter transition-opacity",
                          [7, 8, 10, 12, 14, 16, 17].includes(h) || isSaturday ? "opacity-60" : "opacity-0"
                        )}>
                          {h}h
                        </span>
                      </div>
                    );
                  });
                })()}
             </div>

             {/* Dynamic insight footer */}
             <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
               <span>Análise de Fluxo:</span>
               <span className="text-foreground">
                 {peakHour.hour !== -1 && peakHour.count > 0
                   ? `Pico de atendimentos às ${peakHour.hour}h com ${peakHour.count} ${peakHour.count === 1 ? 'lead' : 'leads'}`
                   : "Nenhum lead registrado nas últimas horas."}
               </span>
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-card border border-border rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Ticket Médio</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(stats.avgTicket)}</p>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold mt-2">
                   <ArrowUpRight className="w-3 h-3" /> +5.2% vs mês anterior
                </div>
             </div>

             <div className="bg-card border border-border rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Taxa de Conversão</p>
                <p className="text-2xl font-bold tracking-tight">{stats.conversionRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold mt-2">
                   <ArrowDownRight className="w-3 h-3" /> -1.2% vs média histórica
                </div>
             </div>

             <div className="bg-card border border-border rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-bold text-muted-foreground uppercase">1ª Resposta Média</p>
                  </div>
                  {/* Glowing Status Dot */}
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    stats.avgFirstResponseMinutes === null 
                      ? "bg-slate-500" 
                      : stats.avgFirstResponseMinutes < 3
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"
                      : stats.avgFirstResponseMinutes < 5
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-pulse"
                      : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse"
                  )} />
                </div>
                <p className={cn("text-2xl font-bold tracking-tight", stats.avgFirstResponseMinutes === null && "text-muted-foreground")}>
                  {formatResponseTime(stats.avgFirstResponseMinutes)}
                </p>
                <p className={cn(
                  "text-[9px] font-black mt-3 uppercase px-2.5 py-1 rounded-lg w-fit",
                  stats.avgFirstResponseMinutes === null
                    ? "bg-secondary text-muted-foreground"
                    : stats.avgFirstResponseMinutes < 3
                    ? "bg-emerald-500/10 text-emerald-500"
                    : stats.avgFirstResponseMinutes < 5
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-rose-500/10 text-rose-500"
                )}>
                  {stats.avgFirstResponseMinutes === null
                    ? "Sem dados no período"
                    : stats.avgFirstResponseMinutes < 3
                    ? "Excelente tempo de resposta"
                    : stats.avgFirstResponseMinutes < 5
                    ? "Atenção: tempo de resposta alto"
                    : "Crítico: acima do SLA de 5 min"}
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* Funnel Overlay */}
      {showFunnel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300 p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500">
            <button 
              onClick={() => setShowFunnel(false)}
              className="absolute top-6 right-6 p-3 hover:bg-secondary rounded-2xl transition-all text-muted-foreground"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-10 flex flex-col items-center">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-black uppercase tracking-tight">Funil de Conversão</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2">Visão Geral do Tráfego</p>
              </div>

              {/* Funnel Visualization */}
              <div className="w-full space-y-1.5 flex flex-col items-center">
                
                {/* Stage 1: Awareness */}
                <div className="w-full h-16 bg-blue-500/10 border border-blue-500/20 rounded-[30px_30px_15px_15px] flex items-center justify-between px-10 group hover:bg-blue-500/15 transition-all">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Leads Gerados</span>
                      <span className="text-xl font-black text-foreground">{stats.leadsToday}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">100% Atração</span>
                   </div>
                </div>

                <div className="w-20 h-2 bg-gradient-to-b from-blue-500/20 to-slate-500/20 blur-[2px]" />

                {/* Stage 2: Frio */}
                <div className="w-[90%] h-16 bg-slate-500/10 border border-slate-500/20 rounded-[15px_15px_10px_10px] flex items-center justify-between px-9 group hover:bg-slate-500/15 transition-all">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leads Frios</span>
                      <span className="text-xl font-black text-foreground">{stats.frioToday}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Descoberta</span>
                   </div>
                </div>

                <div className="w-16 h-2 bg-gradient-to-b from-slate-500/20 to-amber-500/20 blur-[2px]" />

                {/* Stage 3: Morno */}
                <div className="w-[80%] h-16 bg-amber-500/10 border border-amber-500/20 rounded-[10px_10px_10px_10px] flex items-center justify-between px-8 group hover:bg-amber-500/15 transition-all">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Leads Mornos</span>
                      <span className="text-xl font-black text-foreground">{stats.mornoToday}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Interesse</span>
                   </div>
                </div>

                <div className="w-12 h-2 bg-gradient-to-b from-amber-500/20 to-rose-500/20 blur-[2px]" />

                {/* Stage 4: Quente */}
                <div className="w-[70%] h-16 bg-rose-500/10 border border-rose-500/20 rounded-[10px_10px_10px_10px] flex items-center justify-between px-7 group hover:bg-rose-500/15 transition-all">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Leads Quentes</span>
                      <span className="text-xl font-black text-foreground">{stats.quenteToday}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Intenção</span>
                   </div>
                </div>

                <div className="w-8 h-2 bg-gradient-to-b from-rose-500/20 to-emerald-500/20 blur-[2px]" />

                {/* Stage 5: Conversion */}
                <div className="w-[60%] h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-[10px_10px_30px_30px] flex items-center justify-between px-6 group hover:bg-emerald-500/15 transition-all">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Vendas</span>
                      <span className="text-xl font-black text-foreground">{stats.billingToday > 0 ? (stats.billingToday / stats.avgTicket || 0).toFixed(0) : 0}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-xs font-black text-emerald-600">
                        {stats.conversionRate.toFixed(1)}%
                      </span>
                   </div>
                </div>
              </div>

              <p className="mt-12 text-[10px] font-bold text-muted-foreground uppercase text-center max-w-sm leading-relaxed">
                Este funil representa a jornada do lead desde a primeira interação no WhatsApp até o faturamento final no período selecionado.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subValue: string;
  isPositive: boolean;
  progress?: number;
}

function StatCard({ title, value, icon, color, subValue, isPositive, progress }: StatCardProps) {
  const shadowGlow = color.includes("blue") 
    ? "hover:shadow-blue-500/5 hover:border-blue-500/30" 
    : color.includes("indigo")
    ? "hover:shadow-indigo-500/5 hover:border-indigo-500/30"
    : color.includes("emerald")
    ? "hover:shadow-emerald-500/5 hover:border-emerald-500/30"
    : "hover:shadow-rose-500/5 hover:border-rose-500/30";

  return (
    <div className={cn(
      "bg-card border border-border rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
      shadowGlow
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl text-white shadow-lg", color, 
          color.includes("blue") ? "shadow-blue-500/20" : 
          color.includes("indigo") ? "shadow-indigo-500/20" : 
          color.includes("emerald") ? "shadow-emerald-500/20" : "shadow-rose-500/20"
        )}>
          {icon}
        </div>
        <div className={cn(
          "px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1",
          isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPositive ? "Em Alta" : "Abaixo"}
        </div>
      </div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
      
      {progress !== undefined && (
        <div className="mt-3 space-y-1">
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", 
                color.includes("indigo") ? "bg-indigo-500" : 
                color.includes("rose") ? "bg-rose-500" : "bg-primary"
              )} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      )}

      <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase flex items-center justify-between">
        <span>{subValue}</span>
        {progress !== undefined && <span className="text-foreground/80 font-black">{progress.toFixed(0)}%</span>}
      </p>
    </div>
  );
}
