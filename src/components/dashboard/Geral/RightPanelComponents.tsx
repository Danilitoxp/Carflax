// Dashboard Right Panel Components
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
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { apiDashboardGeral, type VendedorResumo, apiEntregasConcluidas, apiCampanhaMetas } from "@/lib/api";
import { calculateMonthlyWinner } from "@/lib/highlights_automation";
import { supabase } from "@/lib/supabase";

interface UserProfileLite {
  operator_code?: string;
  operatorCode?: string;
  name?: string;
  avatar?: string;
  role?: string;
}

export function SalesMetricsCard({ isCompact, userProfile, data: externalData, loading: externalLoading }: { isCompact?: boolean, userProfile?: UserProfileLite, data?: VendedorResumo, loading?: boolean }) {
  const [internalLoading, setInternalLoading] = useState(!externalData);
  const [data, setData] = useState<VendedorResumo | null>(externalData || null);
  const [allVendedores, setAllVendedores] = useState<VendedorResumo[]>([]);
  const [selectedCod, setSelectedCod] = useState<string>("TOTAL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    if (externalData) {
      setData(externalData);
      setInternalLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setInternalLoading(true);
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dataStr = `${yyyy}-${mm}-${dd}`;

        const role = userProfile?.role?.toUpperCase() || "";
        const isManager = role.includes("GERENTE") || role === "ADMIN";
        const codVendedor = userProfile?.operator_code || userProfile?.operatorCode || "049";

        // Se for gerente, buscamos tudo
        const response = await apiDashboardGeral(isManager ? undefined : codVendedor, dataStr);

        if (response && response.length > 0) {
          if (isManager) {
            setAllVendedores(response);
            
            // Agrega os dados de todos os vendedores para o estado inicial "TOTAL"
            const metaTotal = response.reduce((acc, r) => acc + Number(r.META || 0), 0);
            const faturadoTotal = response.reduce((acc, r) => acc + Number(r.FATURADO || 0), 0);
            const emAbertoTotal = response.reduce((acc, r) => acc + Number(r.EM_ABERTO || 0), 0);
            const totalTotal = response.reduce((acc, r) => acc + Number(r.TOTAL || 0), 0);

            const aggregated: VendedorResumo = {
              COD_VENDEDOR: "TOTAL",
              NOME_VENDEDOR: "TOTAL GERAL",
              META: metaTotal,
              FATURADO: faturadoTotal,
              EM_ABERTO: emAbertoTotal,
              TOTAL: totalTotal,
              FALTANTE: metaTotal - totalTotal,
              TOTAL_VENDIDO_HOJE: response.reduce((acc, r) => acc + Number(r.TOTAL_VENDIDO_HOJE || 0), 0),
              QTD_VENDAS: response.reduce((acc, r) => acc + Number(r.QTD_VENDAS || 0), 0),
              QTD_ORCAMENTOS: response.reduce((acc, r) => acc + Number(r.QTD_ORCAMENTOS || 0), 0),
              ORC_FECHADOS: response.reduce((acc, r) => acc + Number(r.ORC_FECHADOS || 0), 0),
              PRAZO_MEDIO_DIAS: response.reduce((acc, r) => acc + Number(r.PRAZO_MEDIO_DIAS || 0), 0) / response.length,
              TICKET_MEDIO: 0,
              TAXA_CONVERSAO: 0,
              dias_trabalhados: response[0].dias_trabalhados 
            };

            aggregated.TICKET_MEDIO = aggregated.QTD_VENDAS > 0 ? Number(aggregated.TOTAL) / aggregated.QTD_VENDAS : 0;
            aggregated.TAXA_CONVERSAO = Number(aggregated.QTD_ORCAMENTOS) > 0 
              ? (Number(aggregated.ORC_FECHADOS) / Number(aggregated.QTD_ORCAMENTOS)) * 100 
              : 0;

            setData(aggregated);
          } else {
            const myData = response.find(r => r.COD_VENDEDOR === codVendedor) || response[0];
            setData(myData);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
      } finally {
        setInternalLoading(false);
      }
    }

    fetchData();
  }, [userProfile, externalData]);

  const formatBRL = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num || 0);
  };


  // Funções de auxílio para cálculo de tempo (Lógica Gestão de Tempo)
  const getDiasUteisNoMes = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    let count = 0;
    for (let i = 1; i <= lastDay; i++) {
      const dayOfWeek = new Date(y, m, i).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  };

  const getDiasUteisRestantes = () => {
    const d = new Date();
    // Inicia a contagem a partir de amanhã (startOffset = 1 conforme Gestão de Tempo)
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    start.setDate(start.getDate() + 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    let count = 0;
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const day = dt.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  const calculateEquilibrio = () => {
    if (!data) return 0;
    const totalWorkingDays = getDiasUteisNoMes();
    const remainingDays = getDiasUteisRestantes();
    const daysPassed = data.dias_trabalhados ?? Math.max(0, totalWorkingDays - remainingDays);
    const metaNum = typeof data.META === 'string' ? parseFloat(data.META) : data.META;
    return (metaNum / totalWorkingDays) * daysPassed;
  };

  const getDiasRestantes = () => getDiasUteisRestantes();

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
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-8 animate-pulse">
        <div className="flex justify-center flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-10 w-full bg-secondary/50 dark:bg-slate-800/50 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-2">
              <div className="w-8 h-8 bg-secondary/50 dark:bg-slate-800/50 rounded-lg" />
              <div className="space-y-2 flex-1">
                <div className="h-1.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-2 w-3/4 bg-secondary/30 dark:bg-slate-800/30 rounded" />
              </div>
            </div>
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
      "bg-card border border-border rounded-xl shadow-sm flex flex-col",
      isCompact ? "p-4" : "p-5"
    )}>
      {/* 1. HEADER (Limpado) */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          {selectedCod !== "TOTAL" && (
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter truncate max-w-[150px]">
              {data?.NOME_VENDEDOR}
            </span>
          )}
        </div>
        <div className="relative">
          {(userProfile?.role?.toUpperCase().includes("DIRETOR") || 
            userProfile?.role?.toUpperCase().includes("GERENTE DE VENDAS") || 
            userProfile?.role?.toUpperCase() === "ADMIN") && (
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "p-1.5 rounded-lg transition-all hover:bg-secondary",
                isDropdownOpen && "bg-secondary"
              )}
            >
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Selecionar Vendedor</span>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-hide">
                  <button
                    onClick={() => {
                      setSelectedCod("TOTAL");
                      // Re-agregando (ou podemos salvar o aggregated num ref/state)
                      const response = allVendedores;
                      const metaTotal = response.reduce((acc, r) => acc + Number(r.META || 0), 0);
                      const totalTotal = response.reduce((acc, r) => acc + Number(r.TOTAL || 0), 0);
                      
                      const aggregated: VendedorResumo = {
                        COD_VENDEDOR: "TOTAL",
                        NOME_VENDEDOR: "TOTAL GERAL",
                        META: metaTotal,
                        FATURADO: response.reduce((acc, r) => acc + Number(r.FATURADO || 0), 0),
                        EM_ABERTO: response.reduce((acc, r) => acc + Number(r.EM_ABERTO || 0), 0),
                        TOTAL: totalTotal,
                        FALTANTE: metaTotal - totalTotal,
                        TOTAL_VENDIDO_HOJE: response.reduce((acc, r) => acc + Number(r.TOTAL_VENDIDO_HOJE || 0), 0),
                        QTD_VENDAS: response.reduce((acc, r) => acc + Number(r.QTD_VENDAS || 0), 0),
                        QTD_ORCAMENTOS: response.reduce((acc, r) => acc + Number(r.QTD_ORCAMENTOS || 0), 0),
                        ORC_FECHADOS: response.reduce((acc, r) => acc + Number(r.ORC_FECHADOS || 0), 0),
                        PRAZO_MEDIO_DIAS: response.reduce((acc, r) => acc + Number(r.PRAZO_MEDIO_DIAS || 0), 0) / Math.max(response.length, 1),
                        TICKET_MEDIO: 0,
                        TAXA_CONVERSAO: 0,
                        dias_trabalhados: response[0]?.dias_trabalhados 
                      };
                      aggregated.TICKET_MEDIO = aggregated.QTD_VENDAS > 0 ? Number(aggregated.TOTAL) / aggregated.QTD_VENDAS : 0;
                      aggregated.TAXA_CONVERSAO = Number(aggregated.QTD_ORCAMENTOS) > 0 ? (Number(aggregated.ORC_FECHADOS) / Number(aggregated.QTD_ORCAMENTOS)) * 100 : 0;
                      
                      setData(aggregated);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-xs font-bold transition-colors hover:bg-secondary flex items-center justify-between",
                      selectedCod === "TOTAL" ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20" : "text-foreground"
                    )}
                  >
                    <span>Total Geral</span>
                    {selectedCod === "TOTAL" && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>

                  {allVendedores
                    .sort((a, b) => (a.NOME_VENDEDOR || "").localeCompare(b.NOME_VENDEDOR || ""))
                    .map((v) => (
                      <button
                        key={v.COD_VENDEDOR}
                        onClick={() => {
                          setSelectedCod(v.COD_VENDEDOR);
                          setData(v);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-[11px] font-bold transition-colors hover:bg-secondary flex items-center justify-between",
                          selectedCod === v.COD_VENDEDOR ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20" : "text-slate-600 dark:text-slate-300"
                        )}
                      >
                        <span className="truncate uppercase pr-2">{v.NOME_VENDEDOR}</span>
                        {selectedCod === v.COD_VENDEDOR && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
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
              className="text-secondary dark:text-slate-800"
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
                percentageVsEquilibrio >= 100 ? "text-blue-600 dark:text-blue-500" : "text-rose-500"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center">
            <span className={cn(
              "text-2xl font-black tracking-tighter",
              percentageVsEquilibrio >= 100 ? "text-foreground" : "text-rose-600"
            )}>
              {percentageVsEquilibrio.toFixed(0)}%
            </span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
              {percentageVsEquilibrio.toFixed(0) === '100' 
                ? "Equilíbrio" 
                : (equilibrio - Number(total) > 0 
                    ? `- ${formatBRL(equilibrio - Number(total))}` 
                    : `+ ${formatBRL(Math.abs(equilibrio - Number(total)))}`
                  )
              }
            </span>
          </div>
        </div>
      </div>

      {/* 4. VALOR VENDIDO (MAIS DISCRETO) */}
      <div className="mb-4 flex flex-col items-center text-center">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-sans">
          Total Vendido Hoje
        </p>
        <h3 className="text-2xl font-black text-foreground tracking-tighter mb-1.5">
          {formatBRL(data?.TOTAL_VENDIDO_HOJE || 0)}
        </h3>
      </div>

      {/* Progress Bar (Meta) */}
      <div className="mb-8 px-2">
        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
          <span className="text-blue-600 dark:text-blue-500">Meta</span>
          <span className="text-foreground">{((Number(data?.TOTAL || 0)) / (Number(data?.META || 1)) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-secondary dark:bg-slate-800 rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            style={{ width: `${Math.min(((Number(data?.TOTAL || 0)) / (Number(data?.META || 1)) * 100), 100)}%` }}
          />
        </div>
      </div>

      {/* 4. GRID DE INDICADORES (Sober/Professional) */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <div className="mt-0.5 p-1.5 bg-secondary/50 dark:bg-slate-800/50 border border-border rounded-lg shrink-0 transition-colors group-hover:bg-card group-hover:border-slate-400/20">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate mb-0.5">{m.label}</span>
              <span className={cn("text-xs font-black tracking-tight", m.valueColor.includes('slate-900') ? 'text-foreground' : m.valueColor)}>
                {m.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmployeeOfMonthCard({ loading: externalLoading }: { loading?: boolean }) {
  const [employee, setEmployee] = useState<{ name: string; role: string; department: string; achievement: string; avatar: string } | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;
  
  useEffect(() => {
    async function fetchHighlight() {
      const now = new Date();
      const mesanoISO = now.toISOString().slice(0, 7); // '2026-04'
      const currentMonthNum = now.getMonth();

      try {
        setInternalLoading(true);

        // Agora usamos apenas a Automação, já que a tabela física foi removida
        const winner = await calculateMonthlyWinner(mesanoISO); 
        if (winner) {
           setEmployee({
             name: winner.name,
             role: winner.role || "Destaque",
             department: winner.department,
             achievement: winner.motivo,
             avatar: winner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.name}`
           });
           return;
        }

        // 3. Lógica Automática Híbrida (Fallback Visual)
        const sectors = ["Comercial", "Logística", "Social"];
        const focusSector = sectors[currentMonthNum % sectors.length];

        if (focusSector === "Comercial") {
          try {
            const sellersData = await apiCampanhaMetas(mesanoISO.replace("-", ""));
            const topSeller = (sellersData.resumo || [])
              .filter(v => Number(v.FATURAMENTO) > 0)
              .sort((a, b) => Number(b.FATURAMENTO) - Number(a.FATURAMENTO))[0];

            if (topSeller) {
              setEmployee({
                name: topSeller.NOME_VENDEDOR,
                role: "Consultor de Vendas",
                department: "Comercial",
                achievement: `Líder de faturamento do mês, atingindo R$ ${Number(topSeller.FATURAMENTO).toLocaleString("pt-BR")}.`,
                avatar: topSeller.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topSeller.COD_VENDEDOR}`
              });
              return;
            }
          } catch (err) {
            console.warn("Fallback: Falha na API comercial, tentando social...", err);
          }
        } else if (focusSector === "Logística") {
          try {
            const deliveries = await apiEntregasConcluidas();
            if (deliveries.success && deliveries.data.length > 0) {
              const driver = deliveries.data[0];
              setEmployee({
                name: "Equipe de Logística",
                role: "Operacional",
                department: "Expedição",
                achievement: `Eficiência recorde na entrega NF ${driver.NF}, garantindo prazos e satisfação do cliente.`,
                avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=logistics`
              });
              return;
            }
          } catch (err) {
            console.warn("Fallback: Falha na API logística, tentando social...", err);
          }
        } 
        
        // Social/Geral Fallback (Sempre funciona como última opção)
        const { data: users } = await supabase.from("usuarios").select("name, avatar, department, role").limit(20);
        if (users && users.length > 0) {
          const u = users[currentMonthNum % users.length];
          setEmployee({
            name: u.name,
            role: u.role || "Especialista",
            department: u.department || "Carflax",
            achievement: "Exemplo de proatividade e colaboração intersetorial durante este mês.",
            avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`
          });
        }
      } catch (err) {
        console.error("Erro destaque fatal:", err);
      } finally {
        setInternalLoading(false);
      }
    }

    fetchHighlight();
  }, []);

  if (loading || !employee) {
    return (
      <div className="flex-1 flex flex-col min-h-[320px] bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-pulse">
        <div className="h-20 bg-slate-100 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 flex flex-col items-center px-6 -mt-10 relative z-10 pb-6 space-y-4">
           <div className="w-24 h-24 rounded-3xl bg-card p-1.5 shadow-xl">
             <div className="w-full h-full rounded-2xl bg-secondary/50 dark:bg-slate-800/50" />
           </div>
           <div className="text-center space-y-2 w-full">
              <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded mx-auto" />
              <div className="h-3 w-1/2 bg-secondary/30 dark:bg-slate-800/30 rounded mx-auto" />
           </div>
           <div className="w-full h-24 bg-secondary/10 dark:bg-slate-800/20 rounded-2xl" />
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col min-h-[320px] bg-card border border-border rounded-2xl shadow-sm overflow-hidden group transition-all duration-500 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200">
      {/* Header Banner - Carflax Blue - Reduced height */}
      <div className="h-20 bg-gradient-to-br from-blue-700 to-blue-600 relative overflow-hidden flex items-center justify-center shrink-0">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(30deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(150deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(30deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(150deg, #000 12%, transparent 12.5%, transparent 87%, #000 87.5%, #000), linear-gradient(60deg, #999 25%, transparent 25.5%, transparent 75%, #999 75%, #999), linear-gradient(60deg, #999 25%, transparent 25.5%, transparent 75%, #999 75%, #999)", backgroundSize: "80px 140px" }} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
        

      </div>

      {/* Main Content Area - Reduced negative margin */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-10 relative z-10 pb-6">
        {/* Avatar Spotlight - Reduced bottom margin */}
        <div className="relative mb-3 group-hover:scale-105 transition-transform duration-500">
          <div className="w-24 h-24 rounded-3xl bg-card p-1.5 shadow-xl shadow-blue-950/20 border border-border overflow-hidden">
            <div className="w-full h-full rounded-2xl overflow-hidden bg-secondary dark:bg-slate-800 border border-border">
              <img src={employee.avatar} className="w-full h-full object-cover" alt={employee.name} />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center border-2 border-card shadow-lg">
            <Star className="w-3 h-3 text-white fill-current" />
          </div>
        </div>

        {/* Info Block - Reduced bottom margin */}
        <div className="text-center w-full mb-4">
          <h4 className="text-lg font-black text-foreground uppercase tracking-tighter leading-tight mb-1">
            {employee.name}
          </h4>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[9px] font-bold uppercase tracking-widest border border-blue-100/30">
              {employee.role}
            </span>
          </div>
        </div>

        {/* Achievement Quote - Compact */}
        <div className="w-full bg-slate-50/50 dark:bg-secondary/30 backdrop-blur-md rounded-2xl p-4 border border-slate-100 dark:border-border flex flex-col relative overflow-hidden group/quote">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-full blur-2xl -mr-8 -mt-8" />
          
          <div className="flex items-start gap-2 mb-2 relative z-10">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Motivo do Prêmio</span>
          </div>
          
          <p className="text-[11px] font-bold text-slate-700 dark:text-muted-foreground leading-relaxed italic relative z-10">
            "{employee.achievement}"
          </p>
        </div>


      </div>
    </div>
  );
}



export function WeatherTrafficCard() {
  const [weather] = useState({ temp: 24, condition: "Partly Cloudy", city: "São Paulo" });
  
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 overflow-hidden relative group cursor-pointer">
      {/* Background Gradient Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 opacity-50" />
      
      <div className="flex items-center justify-between relative z-10">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
          Clima e Trânsito
        </h4>
        <Sun className="w-3.5 h-3.5 text-amber-500" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="flex flex-col">
          <span className="text-3xl font-black text-foreground tracking-tighter leading-none">{weather.temp}°C</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{weather.city}</span>
        </div>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tight">Céu Limpo</span>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Sem previsão de chuva</span>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-foreground uppercase">Trânsito Fluindo</span>
          </div>
          <span className="text-[9px] font-medium text-muted-foreground">Normal</span>
        </div>
        <div className="w-full h-1 bg-secondary dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ActiveVacationsCard({ loading: externalLoading }: { loading?: boolean }) {
  const [vacations, setVacations] = useState<{ id: string | number; name: string; avatar: string; end_date: string }[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

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
        setInternalLoading(false);
      }
    }
    fetchVacations();
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col min-h-[140px]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
          Em Férias Agora
        </h4>
        <Plane className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 opacity-50" />
      </div>

      {loading ? (
        <div className="flex gap-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="h-1.5 w-8 bg-secondary/50 dark:bg-slate-800/50 rounded" />
            </div>
          ))}
        </div>
      ) : vacations.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {vacations.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 group cursor-pointer">
              <div className="w-10 h-10 rounded-full border-2 border-blue-100 dark:border-blue-900/50 p-0.5 transition-transform group-hover:scale-110">
                <img 
                  src={v.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.name}`} 
                  alt={v.name} 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[50px]">{v.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center opacity-40">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Toda equipe ativa</span>
        </div>
      )}
    </div>
  );
}

export function UpcomingEventsCard({ loading: externalLoading }: { loading?: boolean }) {
  const [events, setEvents] = useState<{ id: string | number; title: string; day: number; month: number; year: number; type: string }[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

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
        setInternalLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "meeting": return { icon: Users, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30" };
      case "important": return { icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30" };
      case "finance": return { icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" };
      case "holiday": return { icon: Flag, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" };
      case "celebration": return { icon: Trophy, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/30" };
      default: return { icon: Calendar, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" };
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
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col group min-h-[160px]">
      {!loading && (
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1">
              Agenda
            </h4>
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Próximos Eventos</h3>
          </div>
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border border-border">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-1.5 w-1/4 bg-secondary/50 dark:bg-slate-800/50 rounded" />
                </div>
              </div>
            ))}
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
                       <p className="text-xs font-black text-foreground uppercase tracking-tight truncate flex-1 group-hover/item:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {ev.title}
                      </p>
                      {isFirst && daysDiff >= 0 && (
                        <span className={cn(
                          "ml-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0 border",
                          daysDiff === 0 ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50" :
                          daysDiff === 1 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50" :
                          "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                        )}>
                          {daysDiff === 0 ? "HOJE" :
                           daysDiff === 1 ? "AMANHÃ" : 
                           `EM ${daysDiff} DIAS`}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                      {ev.day.toString().padStart(2, '0')}/{ev.month.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center opacity-40">
            <div className="w-12 h-12 bg-secondary/50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-3">
               <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Sem eventos próximos</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BirthdayList({ loading: externalLoading }: { loading?: boolean }) {
  const [birthdays, setBirthdays] = useState<{ name: string; date: string; img: string; day: number }[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

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
        setInternalLoading(false);
      }
    }

    fetchBirthdays();
  }, []);

  return (
    <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col overflow-hidden group min-h-[160px]">
      {!loading && (
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1">
              Social
            </h4>
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Aniversariantes</h3>
          </div>
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border border-border">
            <Gift className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 -mr-1">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-1.5 w-1/3 bg-secondary/50 dark:bg-slate-800/50 rounded" />
                </div>
              </div>
            ))}
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
                    <div className="w-10 h-10 rounded-xl bg-secondary/50 dark:bg-slate-800/50 border border-border overflow-hidden p-0.5 group-hover/item:border-blue-200 transition-colors">
                      <img 
                        src={bd.img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bd.name}`} 
                        alt={bd.name} 
                        className="w-full h-full rounded-lg object-cover" 
                      />
                    </div>
                    {/* Only show ping for today or upcoming */}
                    {!isPast && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-card flex items-center justify-center">
                        <div className={cn("w-1 h-1 bg-white rounded-full", isToday && "animate-ping")} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground uppercase tracking-tight truncate group-hover/item:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {bd.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{bd.date}</span>
                      <span className="w-1 h-1 rounded-full bg-secondary/50" />
                      {isToday ? (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">Hoje!</span>
                      ) : isPast ? (
                        <span className="text-[9px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-md">Já foi</span>
                      ) : (
                        <span className="text-[9px] font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">Próximo</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center opacity-40">
            <div className="w-12 h-12 bg-secondary/50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-3">
               <Gift className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nenhum Aniversariante</p>
          </div>
        )}
      </div>

    </div>
  );
}
