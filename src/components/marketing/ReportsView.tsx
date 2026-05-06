import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
  Download
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
    billingToday: 0,
    billingMonth: 0,
    avgTicket: 0,
    conversionRate: 0
  });


  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const filters = {};

        const [marketingData, hourlyLeads]: [{ leadsToday: number; leadsMonth: number; billingToday: number; billingMonth: number; salesCountToday: number; salesCountMonth: number }, number[]] = await Promise.all([
          marketingService.getMarketingStats(startDate, endDate || undefined, filters),
          marketingService.getHourlyLeads(startDate, endDate || undefined, filters)
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
          billingToday: totalBillingToday,
          billingMonth: totalBillingMonth,
          avgTicket,
          conversionRate
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
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-end shrink-0 mb-4 px-1">
          <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
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
              onClick={() => {}} // TODO: Implement export
              className="w-10 h-10 bg-card border border-border hover:bg-secondary text-muted-foreground rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center group"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
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
            subValue="Atingimento: 88%"
            isPositive={true}
          />
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-sm">
             <h3 className="text-lg font-bold uppercase tracking-tight mb-6 flex items-center justify-between">
                Fluxo de Leads por Horário
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full">Picos de Hoje</span>
             </h3>
             <div className="h-64 flex items-end gap-1.5 sm:gap-2">
                {hourlyData.map((val, h) => {
                  const maxLeads = Math.max(...hourlyData, 1);
                  const height = (val / maxLeads) * 100;
                  // Mostra apenas horários úteis (07h as 22h) no mobile ou todos no desktop se preferir
                  return (
                    <div key={h} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
                      <div 
                        className={cn(
                          "w-full rounded-t-lg transition-all relative",
                          val > 0 ? "bg-primary" : "bg-muted/10"
                        )} 
                        style={{ height: `${val > 0 ? Math.max(height, 8) : 4}%` }}
                      >
                         {val > 0 && (
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border px-2 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl whitespace-nowrap">
                             {val} {val === 1 ? 'lead' : 'leads'} as {h}h
                           </div>
                         )}
                      </div>
                      {[0, 4, 8, 12, 16, 20].includes(h) && (
                        <span className="text-[8px] font-bold opacity-40 uppercase">{h}h</span>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-card border border-border rounded-3xl p-6">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</p>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold mt-2">
                   <ArrowUpRight className="w-3 h-3" /> +5.2% vs mês anterior
                </div>
             </div>

             <div className="bg-card border border-border rounded-3xl p-6">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold mt-2">
                   <ArrowDownRight className="w-3 h-3" /> -1.2% vs média histórica
                </div>
             </div>
          </div>
        </div>
      </div>
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
}

function StatCard({ title, value, icon, color, subValue, isPositive }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl text-white", color)}>
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
      <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase">{subValue}</p>
    </div>
  );
}
