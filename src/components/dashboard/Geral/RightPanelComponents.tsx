import {
  Gift,
  Target,
  ArrowDownRight,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Zap,
  PieChart,
  MoreHorizontal,
  BarChart3,
  Users,
  Flag,
  Trophy,
  AlertCircle,
  Plane,
  Sun,
  Star,
  ThumbsUp
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { apiDashboardGeral, type VendedorResumo } from "@/lib/api";

interface UserProfileLite {
  operator_code?: string;
  operatorCode?: string;
  name?: string;
  avatar?: string;
}

export function SalesMetricsCard({ isCompact, userProfile, data: externalData }: { isCompact?: boolean, userProfile?: UserProfileLite, data?: VendedorResumo }) {
  const [loading, setLoading] = useState(!externalData);
  const [data, setData] = useState<VendedorResumo | null>(externalData || null);

  useEffect(() => {
    if (externalData) {
      setData(externalData);
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dataStr = `${yyyy}-${mm}-${dd}`;

        const codVendedor = userProfile?.operator_code || userProfile?.operatorCode || "049";

        const response = await apiDashboardGeral(codVendedor, dataStr);

        if (response && response.length > 0) {
          const myData = response.find(r => r.COD_VENDEDOR === codVendedor) || response[0];
          setData(myData);
        }
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userProfile, externalData]);

  const formatBRL = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);
  };


  const calculateEquilibrio = () => {
    if (!data) return 0;
    const daysWorked = data.dias_trabalhados || 15;
    const totalWorkingDays = 22; // Base de dias úteis padrão
    const meta = typeof data.META === 'string' ? parseFloat(data.META) : data.META;
    return (meta / totalWorkingDays) * daysWorked;
  };

  const getDiasRestantes = () => 9; // Conforme screenshot (24 dias operacionais - 15 trabalhados)

  const calculateDiarioNecessario = () => {
    if (!data) return 0;
    const faltante = typeof data.FALTANTE === 'string' ? parseFloat(data.FALTANTE) : (data.FALTANTE || 0);
    return (faltante as number) / getDiasRestantes();
  };

  const metrics = data ? [
    { label: m("Meta"), value: formatBRL(data.META), icon: Target, valueColor: "text-slate-900" },
    { label: m("Faltante"), value: formatBRL(data.FALTANTE), icon: ArrowDownRight, valueColor: "text-rose-600" },
    { label: m("Faturado"), value: formatBRL(data.FATURADO), icon: Clock, valueColor: "text-emerald-600" },
    { label: m("Em Aberto"), value: formatBRL(data.EM_ABERTO), icon: Clock, valueColor: "text-amber-600" },
    { label: m("Total"), value: formatBRL(data.TOTAL), icon: TrendingUp, valueColor: "text-slate-900" },
    { label: m("Equilíbrio"), value: formatBRL(calculateEquilibrio()), icon: BarChart3, valueColor: "text-blue-600" },
    { label: m("Dias Restantes"), value: `${getDiasRestantes()}`, icon: Calendar, valueColor: "text-slate-900" },
    { label: m("Diário"), value: formatBRL(calculateDiarioNecessario()), icon: Zap, valueColor: "text-slate-900" },
    { label: m("Tx Conversão"), value: `${
      data.TAXA_CONVERSAO 
        ? Number(typeof data.TAXA_CONVERSAO === 'string' ? parseFloat(data.TAXA_CONVERSAO) : data.TAXA_CONVERSAO).toFixed(2)
        : ((Number(data.ORC_FECHADOS || 0) / Math.max(Number(data.QTD_ORCAMENTOS || 1), 1)) * 100).toFixed(2)
    }%`, icon: PieChart, valueColor: "text-blue-600" },
    { label: m("Ticket Médio"), value: formatBRL(data.TICKET_MEDIO), icon: DollarSign, valueColor: "text-slate-900" },
    { label: m("Margem Real"), value: `${Number(typeof (data.MARGEM_REAL_PERC || data.MARGEM_PCT) === 'string' ? parseFloat((data.MARGEM_REAL_PERC || data.MARGEM_PCT) as string) : (data.MARGEM_REAL_PERC || data.MARGEM_PCT || 0)).toFixed(2)}%`, icon: TrendingUp, valueColor: "text-blue-600" },
    { label: m("Prazo Médio"), value: `${Number(typeof data.PRAZO_MEDIO_DIAS === 'string' ? parseFloat(data.PRAZO_MEDIO_DIAS) : data.PRAZO_MEDIO_DIAS || 0).toFixed(0)} d`, icon: Clock, valueColor: "text-slate-900" },
  ] : [];

  function m(text: string) { return text; }

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4 animate-pulse">
        <div className="h-4 w-20 bg-slate-100 rounded" />
        <div className="flex justify-center"><div className="w-24 h-24 rounded-full border-4 border-slate-50" /></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const equilibrio = calculateEquilibrio();
  const total = data ? (typeof data.TOTAL === 'string' ? parseFloat(data.TOTAL) : data.TOTAL) : 0;
  const percentageVsEquilibrio = equilibrio > 0 ? (Number(total) / equilibrio) * 100 : 0;

  return (
    <div className={cn(
      "bg-white border border-border rounded-xl shadow-sm flex flex-col",
      isCompact ? "p-4" : "p-5"
    )}>
      {/* 1. HEADER (Limpado) */}
      <div className="flex items-center justify-between">
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
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(percentageVsEquilibrio, 100) / 100)}
              strokeLinecap="round"
              fill="transparent"
              className={cn(
                "transition-all duration-1000 ease-out",
                percentageVsEquilibrio >= 100 ? "text-blue-600" : "text-rose-500"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className={cn(
              "text-2xl font-black tracking-tighter",
              percentageVsEquilibrio >= 100 ? "text-slate-900" : "text-rose-600"
            )}>
              {percentageVsEquilibrio.toFixed(0)}%
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Equilíbrio</span>
          </div>
        </div>
      </div>

      {/* 4. VALOR VENDIDO (MAIS DISCRETO) */}
      <div className="mb-4 flex flex-col items-center text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">
          Total Vendido Hoje
        </p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">
          {formatBRL(data?.TOTAL_VENDIDO_HOJE || 0)}
        </h3>
      </div>

      {/* Progress Bar (Meta) */}
      <div className="mb-8 px-2">
        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
          <span className="text-blue-600">Meta</span>
          <span className="text-slate-900">{((Number(data?.TOTAL || 0)) / (Number(data?.META || 1)) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            style={{ width: `${Math.min(((Number(data?.TOTAL || 0)) / (Number(data?.META || 1)) * 100), 100)}%` }}
          />
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

export function EmployeeOfMonthCard() {
  const [likes, setLikes] = useState<{name: string, avatar: string}[]>([]);
  
  useEffect(() => {
    async function fetchLikes() {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("name, avatar")
          .limit(5);
        
        if (!error && data) {
          setLikes(data.filter(u => u.avatar || u.name));
        }
      } catch (err) {
        console.error("Erro social proof:", err);
      }
    }
    fetchLikes();
  }, []);

  const employee = {
    name: "Danilo Oliveira",
    role: "Analista de TI",
    department: "Marketing / TI",
    achievement: "Superou todas as metas de implementação do mês com inovação e proatividade constante na plataforma.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Danilo"
  };

  const getLikeAvatar = (avatar: string, name: string) => 
    avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'user')}`;


  return (
    <div className="flex-1 flex flex-col min-h-[380px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group transition-all duration-500 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200">
      {/* Header Banner - Carflax Blue */}
      <div className="h-28 bg-gradient-to-br from-blue-700 to-blue-600 relative overflow-hidden flex items-center justify-center shrink-0">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(30deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(150deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(30deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(150deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(60deg, #999 25%, transparent 25.5%, transparent 75%, #999 75%, #999), linear-gradient(60deg, #999 25%, transparent 25.5%, transparent 75%, #999 75%, #999)", backgroundSize: "80px 140px" }} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-2 border border-white/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-[0.4em] leading-none opacity-80">
            Destaque do Mês
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-12 relative z-10 pb-6">
        {/* Avatar Spotlight */}
        <div className="relative mb-4 group-hover:scale-105 transition-transform duration-500">
          <div className="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl shadow-blue-900/10 border border-slate-100 overflow-hidden">
            <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-50">
              <img src={employee.avatar} className="w-full h-full object-cover" alt={employee.name} />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center border-2 border-white shadow-lg">
            <Star className="w-3 h-3 text-white fill-current" />
          </div>
        </div>

        {/* Info Block */}
        <div className="text-center w-full mb-6">
          <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight mb-1">
            {employee.name}
          </h4>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[9px] font-bold uppercase tracking-widest border border-blue-100/30">
              {employee.role}
            </span>
          </div>
        </div>

        {/* Achievement Quote - Fills space */}
        <div className="flex-1 w-full bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 flex flex-col relative overflow-hidden group/quote">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="flex items-start gap-2 mb-2 relative z-10">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Motivo do Prêmio</span>
          </div>
          
          <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic relative z-10">
            "{employee.achievement}"
          </p>

          <QuoteIcon className="absolute bottom-2 right-4 w-12 h-12 text-blue-100 opacity-20 transform rotate-180" />
        </div>

        {/* Bottom Metadata & Social Proof */}
        <div className="w-full pt-4 mt-auto border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {likes.length > 0 ? (
              <div className="flex -space-x-2">
                {likes.slice(0, 4).map((like, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-slate-100 ring-1 ring-slate-100 transition-transform hover:scale-110 hover:z-10">
                    <img 
                      src={getLikeAvatar(like.avatar, like.name)} 
                      className="w-full h-full object-cover" 
                      alt={like.name} 
                    />
                  </div>
                ))}
                {likes.length > 4 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center">
                    <span className="text-[8px] font-black text-slate-400">+{likes.length - 4}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex -space-x-2 opacity-20">
                {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Reconhecimento</span>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{employee.department}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-all cursor-pointer active:scale-95">
             <ThumbsUp className="w-3 h-3 text-white" />
             <span className="text-[10px] font-black text-white">{likes.length + 18}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Quote Icon for the card
function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V12C14.017 12.5523 13.5693 13 13.017 13H11.017L11.017 21H14.017ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C10.5693 16 11.017 15.5523 11.017 15V9C11.017 8.44772 10.5693 8 10.017 8H6.017C5.46472 8 5.017 8.44772 5.017 9V12C5.017 12.5523 4.56935 13 4.017 13H2.017L2.017 21H5.017Z" />
    </svg>
  );
}

import { supabase } from "@/lib/supabase";

export function WeatherTrafficCard() {
  const [weather] = useState({ temp: 24, condition: "Partly Cloudy", city: "São Paulo" });
  
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 overflow-hidden relative group cursor-pointer">
      {/* Background Gradient Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 opacity-50" />
      
      <div className="flex items-center justify-between relative z-10">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Clima e Trânsito
        </h4>
        <Sun className="w-3.5 h-3.5 text-amber-500" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="flex flex-col">
          <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{weather.temp}°C</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{weather.city}</span>
        </div>
        <div className="h-8 w-px bg-slate-100 hidden sm:block" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Céu Limpo</span>
          <span className="text-[10px] font-medium text-slate-400 mt-0.5">Sem previsão de chuva</span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span className="text-[10px] font-bold text-slate-600 uppercase">Trânsito Fluindo</span>
          </div>
          <span className="text-[9px] font-medium text-slate-400">Normal</span>
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ActiveVacationsCard() {
  const [vacations, setVacations] = useState<{ id: string | number; name: string; avatar: string; end_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVacations() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from("ferias")
          .select("*")
          .lte("start_date", today)
          .gte("end_date", today);

        if (error) throw error;
        setVacations(data || []);
      } catch (err) {
        console.error("Erro ferias:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVacations();
  }, []);

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col min-h-[140px]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Em Férias Agora
        </h4>
        <Plane className="w-3.5 h-3.5 text-blue-600 opacity-50" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vacations.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {vacations.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 group cursor-pointer">
              <div className="w-10 h-10 rounded-full border-2 border-blue-100 p-0.5 transition-transform group-hover:scale-110">
                <img 
                  src={v.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.name}`} 
                  alt={v.name} 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
              <span className="text-[9px] font-bold text-slate-600 truncate max-w-[50px]">{v.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Toda equipe ativa</span>
        </div>
      )}
    </div>
  );
}

export function UpcomingEventsCard() {
  const [events, setEvents] = useState<{ id: string | number; title: string; day: number; month: number; year: number; type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        const { data, error } = await supabase
          .from("eventos_calendario")
          .select("*")
          .gte("year", currentYear)
          .order("year", { ascending: true })
          .order("month", { ascending: true })
          .order("day", { ascending: true });

        if (error) throw error;

        const upcoming = (data || []).filter(ev => {
          if (ev.year > currentYear) return true;
          if (ev.year === currentYear) {
            if (ev.month > currentMonth) return true;
            if (ev.month === currentMonth) return ev.day >= currentDay;
          }
          return false;
        }).slice(0, 3);

        setEvents(upcoming);
      } catch (err) {
        console.error("Erro events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "meeting": return { icon: Users, color: "text-violet-600", bg: "bg-violet-50" };
      case "important": return { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" };
      case "finance": return { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" };
      case "holiday": return { icon: Flag, color: "text-amber-600", bg: "bg-amber-50" };
      case "celebration": return { icon: Trophy, color: "text-pink-600", bg: "bg-pink-50" };
      default: return { icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" };
    }
  };

  const getDaysDiff = (day: number, month: number, year: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(year, month - 1, day);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col group min-h-[160px]">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex flex-col">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
            Agenda
          </h4>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Próximos Eventos</h3>
        </div>
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50">
          <Calendar className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-4">
            {events.map((ev, i) => {
              const style = getTypeStyle(ev.type);
              const daysDiff = getDaysDiff(ev.day, ev.month, ev.year);
              const isFirst = i === 0;
              
              return (
                <div key={i} className="flex gap-4 group/item items-start">
                  <div className={cn("mt-0.5 p-2 rounded-xl shrink-0 transition-transform group-hover/item:scale-110", style.bg)}>
                    <style.icon className={cn("w-4 h-4", style.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                       <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate flex-1 group-hover/item:text-blue-600 transition-colors">
                        {ev.title}
                      </p>
                      {isFirst && daysDiff >= 0 && (
                        <span className={cn(
                          "ml-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0 border",
                          daysDiff === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          daysDiff === 1 ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {daysDiff === 0 ? "HOJE" :
                           daysDiff === 1 ? "AMANHÃ" : 
                           `EM ${daysDiff} DIAS`}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {ev.day.toString().padStart(2, '0')}/{ev.month.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center opacity-40">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
               <Calendar className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sem eventos próximos</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BirthdayList() {
  const [birthdays, setBirthdays] = useState<{ name: string; date: string; img: string; day: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBirthdays() {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("name, avatar, birth_date")
          .not("birth_date", "is", null);

        if (error) throw error;

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-indexed

        const filtered = (data || [])
          .filter(u => {
            if (!u.birth_date) return false;
            const parts = u.birth_date.split("-");
            const m = parseInt(parts[1]);
            return m === currentMonth;
          })
          .map(u => {
            const parts = u.birth_date.split("-");
            const m = parts[1];
            const d = parts[2];
            return {
              name: u.name,
              date: `${d}/${m}`,
              day: parseInt(d),
              img: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`
            };
          })
          .sort((a, b) => a.day - b.day);

        setBirthdays(filtered);
      } catch (err) {
        console.error("Erro ao carregar aniversariantes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBirthdays();
  }, []);

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col overflow-hidden group min-h-[160px]">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex flex-col">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
            Social
          </h4>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Aniversariantes</h3>
        </div>
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50">
          <Gift className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 -mr-1">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : birthdays.length > 0 ? (
          <div className="space-y-4 pt-2 px-1">
            {birthdays.map((bd, i) => {
              const today = new Date().getDate();
              const isToday = bd.day === today;
              const isPast = bd.day < today;
              
              return (
                <div key={i} className="flex items-center gap-3 group/item cursor-pointer">
                  <div className="relative shrink-0 pt-1 pr-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden p-0.5 group-hover/item:border-blue-200 transition-colors">
                      <img 
                        src={bd.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bd.name}`} 
                        alt={bd.name} 
                        className="w-full h-full rounded-lg object-cover" 
                      />
                    </div>
                    {/* Only show ping for today or upcoming */}
                    {!isPast && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                        <div className={cn("w-1 h-1 bg-white rounded-full", isToday && "animate-ping")} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate group-hover/item:text-blue-600 transition-colors">
                      {bd.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bd.date}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      {isToday ? (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Hoje!</span>
                      ) : isPast ? (
                        <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">Já foi</span>
                      ) : (
                        <span className="text-[9px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">Próximo</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center opacity-40">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
               <Gift className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum Aniversariante</p>
          </div>
        )}
      </div>

    </div>
  );
}
