import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { marketingService } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
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
        const [marketingData, hourlyLeads]: [{ leadsToday: number; leadsMonth: number; billingToday: number; billingMonth: number; salesCountToday: number; salesCountMonth: number }, number[]] = await Promise.all([
          marketingService.getMarketingStats(selectedDate),
          marketingService.getHourlyLeads(selectedDate)
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
    loadData();
  }, [selectedDate]);

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

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Date Filter Bar */}
        <div className="flex items-center justify-between bg-card border border-border p-3 rounded-2xl shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período de Análise</p>
                 <p className="text-sm font-black uppercase tracking-tight">
                    {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                 </p>
              </div>
           </div>

           <div className="relative">
              <button 
                onClick={() => setShowCalendar(!showCalendar)}
                className="px-4 py-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Alterar Data
              </button>

              {showCalendar && (
                <div className="absolute right-0 top-12 z-50 animate-in fade-in zoom-in duration-200">
                   <MiniCalendar 
                     selectedDate={selectedDate} 
                     onSelectDate={(date) => {
                       setSelectedDate(date);
                       setShowCalendar(false);
                     }} 
                   />
                </div>
              )}
           </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Leads Hoje */}
          <StatCard 
            title="Leads Hoje" 
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

          {/* Faturamento Hoje */}
          <StatCard 
            title="Vendas Hoje" 
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
                    <div key={h} className="flex-1 flex flex-col items-center gap-2 group">
                      <div 
                        className={cn(
                          "w-full rounded-t-lg transition-all relative",
                          val > 0 ? "bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-muted/10"
                        )} 
                        style={{ height: `${val > 0 ? Math.max(height, 8) : 4}%` }}
                      >
                         {val > 0 && (
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border px-2 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl whitespace-nowrap">
                             {val} {val === 1 ? 'lead' : 'leads'} as {h}h
                           </div>
                         )}
                      </div>
                      {[8, 12, 16, 20].includes(h) && (
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
