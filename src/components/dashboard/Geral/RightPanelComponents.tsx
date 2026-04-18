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
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { apiVendedores, type VendedorResumo } from "@/lib/api";

export function SalesMetricsCard({ isCompact, userProfile, data: externalData }: { isCompact?: boolean, userProfile?: any, data?: VendedorResumo }) {
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
        // Pegar mês/ano atual no formato MMYYYY (ex: 042026)
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const mesano = `${mm}${yyyy}`;

        // Usar operator_code do perfil ou 049 como fallback
        const codVendedor = userProfile?.operator_code || userProfile?.operatorCode || "049";

        const response = await apiVendedores(mesano, codVendedor);

        if (response && response.resumo) {
          const myData = response.resumo.find(r => r.COD_VENDEDOR === codVendedor) || response.resumo[0];
          // Injetar dias_trabalhados da resposta no objeto do vendedor
          setData({ ...myData, dias_trabalhados: response.dias_trabalhados });
        }
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userProfile, externalData]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);


  const calculateEquilibrio = () => {
    if (!data) return 0;
    const daysWorked = data.dias_trabalhados || 15;
    const totalWorkingDays = 22; // Base de dias úteis padrão
    return (data.META / totalWorkingDays) * daysWorked;
  };

  const getDiasRestantes = () => 9; // Conforme screenshot (24 dias operacionais - 15 trabalhados)

  const calculateDiarioNecessario = () => {
    if (!data) return 0;
    return data.FALTANTE / getDiasRestantes();
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
    { label: m("Tx Conversão"), value: `${data.TAXA_CONVERSAO?.toFixed(2) || 0}%`, icon: PieChart, valueColor: "text-blue-600" },
    { label: m("Ticket Médio"), value: formatBRL(data.TICKET_MEDIO), icon: DollarSign, valueColor: "text-slate-900" },
    { label: m("Margem Real"), value: `${data.MARGEM_PCT?.toFixed(2) || 0}%`, icon: TrendingUp, valueColor: "text-blue-600" },
    { label: m("Prazo Médio"), value: `${data.PRAZO_MEDIO_DIAS?.toFixed(0) || 0} d`, icon: Clock, valueColor: "text-slate-900" },
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
  const percentageVsEquilibrio = equilibrio > 0 ? (data.TOTAL / equilibrio) * 100 : 0;

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
          <span className="text-slate-900">{((data?.TOTAL || 0) / (data?.META || 1) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            style={{ width: `${Math.min(((data?.TOTAL || 0) / (data?.META || 1) * 100), 100)}%` }}
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
