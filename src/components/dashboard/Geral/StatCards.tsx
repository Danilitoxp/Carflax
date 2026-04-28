import { TrendingUp, Wallet, ArrowUpRight, ShoppingBag, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react";
import { apiVendedores, type VendedorResumo } from "@/lib/api";

import { type UserProfile } from "@/App";

export function StatCards({ userProfile, loading: externalLoading }: { userProfile?: UserProfile | null, loading?: boolean }) {
  const [internalLoading, setInternalLoading] = useState(true);
  const [data, setData] = useState<VendedorResumo | null>(null);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    async function fetchData() {
      try {
        setInternalLoading(true);
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const mesano = `${mm}${yyyy}`;
        const codVendedor = userProfile?.operator_code || userProfile?.operatorCode || "049";
        const response = await apiVendedores(mesano, codVendedor);
        if (response && response.resumo) {
          const myData = response.resumo.find(r => r.COD_VENDEDOR === codVendedor) || response.resumo[0];
          setData(myData);
        }
      } catch (error) {
        console.error("Erro ao carregar StatCards:", error);
      } finally {
        setInternalLoading(false);
      }
    }
    fetchData();
  }, [userProfile]);

  const formatBRL = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const stats = data ? [
    {
      title: "Total Vendido",
      value: formatBRL(Number(data.TOTAL || 0)),
      change: `${Number(data.ATINGIMENTO_PCT || 0).toFixed(1)}% da meta`,
      icon: Wallet,
      color: "blue",
    },
    {
      title: "Taxa de Conversão",
      value: `${Number(data.TAXA_CONVERSAO || 0).toFixed(1)}%`,
      change: "Mensal",
      icon: ArrowUpRight,
      color: "emerald",
    },
    {
      title: "Qtd. Vendas",
      value: String(data.QTD_VENDAS || 0),
      change: "Este mês",
      icon: ShoppingBag,
      color: "amber",
    },
    {
      title: "Ticket Médio",
      value: formatBRL(Number(data.TICKET_MEDIO || 0)),
      change: "Por venda",
      icon: Tag,
      color: "rose",
    },
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-32 bg-white border border-border rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-xl",
              stat.color === "blue" ? "bg-blue-500/10 text-blue-500" :
              stat.color === "amber" ? "bg-amber-500/10 text-amber-500" :
              stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-500" :
              "bg-rose-500/10 text-rose-500"
            )}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
            <div className="flex flex-col">
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
              
              {stat.title === "Total Vendido" && data && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-blue-500">Meta</span>
                    <span className="text-slate-900">{Number(data.ATINGIMENTO_PCT || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      style={{ width: `${Math.min(Number(data.ATINGIMENTO_PCT || 0), 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-1">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
