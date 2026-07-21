import { useState } from "react";
import {
  Building2, Clock, Truck, Package, X, CheckCircle2,
  AlertTriangle, Calendar, ShoppingBag, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FornecedorLeadTime } from "@/lib/api";

interface FornecedorDetalhesModalProps {
  fornecedor: FornecedorLeadTime | null;
  onClose: () => void;
  onNovaCotacao?: (fornecedor: FornecedorLeadTime) => void;
}

export function FornecedorDetalhesModal({
  fornecedor,
  onClose,
  onNovaCotacao,
}: FornecedorDetalhesModalProps) {
  const [copied, setCopied] = useState(false);

  if (!fornecedor) return null;

  const brNum = (n: number, dec = 0) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const getStatusTag = (dias: number) => {
    if (dias <= 7) {
      return {
        label: "Entrega Rápida",
        bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        desc: "Fornecedor altamente eficiente (entrega ≤ 7 dias).",
      };
    }
    if (dias <= 20) {
      return {
        label: "Prazo Normal",
        bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        desc: "Entrega no padrão de mercado (8 a 20 dias).",
      };
    }
    return {
      label: "Gargalo de Entrega",
      bg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      desc: "Prazo longo (> 20 dias). Exige maior estoque de segurança.",
    };
  };

  const status = getStatusTag(fornecedor.media_dias);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fornecedor.cod_fornecedor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  Parceiro Homologado
                </span>
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  #{fornecedor.cod_fornecedor}
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:bg-secondary rounded transition-colors text-muted-foreground hover:text-foreground"
                    title="Copiar código"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <h2 className="text-base font-black text-foreground leading-tight mt-0.5">
                {fornecedor.fornecedor}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Status Alert Banner */}
          <div className={cn("p-3.5 rounded-2xl border flex items-start gap-3 text-xs font-semibold", status.bg)}>
            {fornecedor.media_dias <= 7 ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold leading-none">{status.label}</p>
              <p className="text-[11px] opacity-90 mt-1">{status.desc}</p>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 border border-border/50 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-wider">Lead Time Médio</span>
              </div>
              <p className="text-xl font-black text-foreground">
                {brNum(fornecedor.media_dias, 1)}{" "}
                <span className="text-xs font-bold text-muted-foreground">dias</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Min: {brNum(fornecedor.min_dias)}d · Max: {brNum(fornecedor.max_dias)}d
              </p>
            </div>

            <div className="bg-secondary/40 border border-border/50 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-wider">Pedidos Concluídos</span>
              </div>
              <p className="text-xl font-black text-foreground">
                {brNum(fornecedor.pedidos)}{" "}
                <span className="text-xs font-bold text-muted-foreground">pedidos</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Últimos 6 meses</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 border-t border-border pt-4 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 opacity-60" /> Última Entrada NF
              </span>
              <span className="font-bold text-foreground">
                {fornecedor.ultima_entrada ? (
                  new Date(fornecedor.ultima_entrada + "T00:00:00").toLocaleDateString("pt-BR")
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 opacity-60" /> Menor Tempo Registrado
              </span>
              <span className="font-bold text-emerald-500">
                {brNum(fornecedor.min_dias)} dias
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 opacity-60" /> Maior Tempo Registrado
              </span>
              <span className="font-bold text-rose-500">
                {brNum(fornecedor.max_dias)} dias
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors"
          >
            Fechar
          </button>
          {onNovaCotacao && (
            <button
              onClick={() => {
                onClose();
                onNovaCotacao(fornecedor);
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Simular Cotação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
