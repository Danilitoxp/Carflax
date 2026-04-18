import { 
  Gift, 
  Target, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Scale, 
  Tag, 
  TrendingUp, 
  Calendar, 
  Zap, 
  PieChart,
  MoreHorizontal,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SalesMetricsCard({ isCompact }: { isCompact?: boolean }) {
  const metrics = [
    { label: "Meta", value: "R$ 331k", icon: Target, valueColor: "text-slate-900" },
    { label: "Faltante", value: "R$ 83k", icon: ArrowDownRight, valueColor: "text-rose-600" },
    { label: "Faturado", value: "R$ 223k", icon: CheckCircle2, valueColor: "text-emerald-600" },
    { label: "Em Aberto", value: "R$ 24k", icon: Clock, valueColor: "text-amber-600" },
    { label: "Total", value: "R$ 247k", icon: DollarSign, valueColor: "text-slate-900" },
    { label: "Equilíbrio", value: "R$ 195k", icon: Scale, valueColor: "text-slate-900" },
    { label: "Ticket médio", value: "R$ 1.7k", icon: Tag, valueColor: "text-slate-900" },
    { label: "Conversão", value: "55.4%", icon: TrendingUp, valueColor: "text-blue-600" },
    { label: "Conv. Valor", value: "48.2%", icon: BarChart3, valueColor: "text-blue-600" },
    { label: "Diário", value: "R$ 8.5k", icon: Zap, valueColor: "text-amber-600" },
    { label: "Margem real", value: "32.1%", icon: PieChart, valueColor: "text-emerald-600" },
    { label: "Dias restantes", value: "11 dias", icon: Calendar, valueColor: "text-slate-900" },
  ];

  return (
    <div className={cn(
      "bg-white border border-border rounded-xl shadow-sm flex flex-col",
      isCompact ? "p-4" : "p-5"
    )}>
      {/* 1. HEADER (Limpado) */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <button className="p-1 hover:bg-slate-50 rounded transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* 2. GRÁFICO DE ROSCA (TOP) */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - 0.748)}
              strokeLinecap="round"
              fill="transparent"
              className="text-blue-600 transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-2xl font-black text-slate-900">74.8%</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Meta</span>
          </div>
        </div>
      </div>

      {/* 3. VALOR VENDIDO (MAIS DISCRETO) */}
      <div className="mb-8 flex flex-col items-center text-center">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
            Total Vendido Hoje
         </p>
         <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">
            R$ 15.074,09
         </h3>
         <div className="text-[10px] font-bold text-emerald-600 bg-emerald-100/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5" />
            +12.4% vs ontem
         </div>
      </div>

      {/* 4. GRID DE INDICADORES (Sober/Professional) */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <div className="mt-0.5 p-1.5 bg-slate-50 border border-slate-100 rounded-lg shrink-0 transition-colors group-hover:bg-white group-hover:border-slate-200">
              <m.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate mb-0.5">{m.label}</span>
              <span className={cn("text-xs font-black tracking-tight", m.valueColor)}>
                {m.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BirthdayList() {
  const birthdays = [
    { name: "João Pedro", date: "07/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=felix" },
    { name: "Mateus Ronald", date: "10/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane" },
    { name: "Ana Maria", date: "12/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=vera" },
  ];

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Aniversariantes do Mês
        </h4>
        <Gift className="w-3.5 h-3.5 text-blue-600 opacity-50" />
      </div>
      
      <div className="space-y-3">
        {birthdays.map((person, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 transition-transform group-hover:scale-105">
              <img src={person.img} alt={person.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 border-b border-slate-50 pb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 truncate">{person.name}</span>
              <span className="text-[10px] font-medium text-slate-400">{person.date}</span>
            </div>
          </div>
        ))}
      </div>
      
      <button className="mt-4 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider text-center">
        Ver Agenda Completa
      </button>
    </div>
  );
}
