import React from "react";
import {
  ShoppingCart, RefreshCw, Download, Plus, Timer, Building2,
  TrendingUp, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiData {
  totalPedidos: number;
  mediaGeral: number;
  lentos: number;
  estoqueCritico: number;
  totalAlertas: number;
  fornecedoresTotal: number;
}

interface ComprasHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onNovaCotacao: () => void;
  kpis: KpiData;
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent)}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-lg font-black tracking-tight text-foreground mt-0.5">
        {value}
      </p>
      {hint && (
        <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{hint}</p>
      )}
    </div>
  );
}

export function ComprasHeader({
  loading,
  onRefresh,
  onExport,
  onNovaCotacao,
  kpis,
}: ComprasHeaderProps) {
  const brNum = (n: number, dec = 0) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <div className="space-y-5 shrink-0 px-1">
      {/* Header Title & Top Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-primary rounded-full" />
            <ShoppingCart className="w-6 h-6 text-primary" />
            Compras & Suprimentos
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
            Inteligência de suprimentos · lead time e alertas de reposição
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-10 h-10 border border-border rounded-xl bg-card hover:bg-secondary text-muted-foreground transition-all active:scale-95 shadow-xs flex items-center justify-center group disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 group-hover:text-primary transition-colors",
                loading && "animate-spin"
              )}
            />
          </button>

          <button
            onClick={onExport}
            className="h-10 px-4 border border-border rounded-xl bg-card hover:bg-secondary text-foreground text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs"
            title="Exportar planilha Excel"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Exportar</span>
          </button>

          <button
            onClick={onNovaCotacao}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Cotação</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Lead Time Médio"
          value={`${brNum(kpis.mediaGeral, 1)} dias`}
          hint={`${brNum(kpis.totalPedidos)} pedidos nos últimos 6m`}
          icon={<Timer className="w-5 h-5" />}
          accent="text-blue-500 bg-blue-500/10"
        />

        <KpiCard
          label="Fornecedores"
          value={brNum(kpis.fornecedoresTotal)}
          hint="Fornecedores ativos"
          icon={<Building2 className="w-5 h-5" />}
          accent="text-violet-500 bg-violet-500/10"
        />

        <KpiCard
          label="Fornecedores Lentos"
          value={brNum(kpis.lentos)}
          hint="Entrega > 20 dias"
          icon={<TrendingUp className="w-5 h-5" />}
          accent={kpis.lentos > 0 ? "text-rose-500 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10"}
        />

        <KpiCard
          label="Alertas de Recompra"
          value={brNum(kpis.totalAlertas)}
          hint={`${brNum(kpis.estoqueCritico)} com estoque crítico`}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent={kpis.estoqueCritico > 0 ? "text-rose-500 bg-rose-500/10" : "text-amber-500 bg-amber-500/10"}
        />
      </div>
    </div>
  );
}
