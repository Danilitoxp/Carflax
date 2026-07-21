import { useState } from "react";
import {
  X, ShoppingCart, Calculator, Copy, Check, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendaGrande, FornecedorLeadTime } from "@/lib/api";

interface SimuladorCompraModalProps {
  itemAlert?: VendaGrande | null;
  fornecedorInitial?: FornecedorLeadTime | null;
  fornecedores: FornecedorLeadTime[];
  onClose: () => void;
}

export function SimuladorCompraModal({
  itemAlert,
  fornecedorInitial,
  fornecedores,
  onClose,
}: SimuladorCompraModalProps) {
  const [fornecedorSel, setFornecedorSel] = useState<string>(
    fornecedorInitial?.fornecedor || ""
  );
  const [nomeProduto, setNomeProduto] = useState<string>(itemAlert?.item || "");
  const [codProduto, setCodProduto] = useState<string>(itemAlert?.cod_item || "");
  const [qtdCompra, setQtdCompra] = useState<number>(
    itemAlert ? Math.max(10, Math.ceil(itemAlert.qtd * 1.2)) : 50
  );
  const [precoUnit, setPrecoUnit] = useState<number>(
    itemAlert ? Math.round((itemAlert.valor / (itemAlert.qtd || 1)) * 0.7 * 100) / 100 : 0
  );
  const [observacao, setObservacao] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const brMoney = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const brNum = (n: number) => n.toLocaleString("pt-BR");

  const fornecedorObj = fornecedores.find(
    (f) => f.fornecedor === fornecedorSel || f.cod_fornecedor === fornecedorSel
  );

  const leadTimeEst = fornecedorObj ? fornecedorObj.media_dias : 10;
  const totalEstimado = qtdCompra * precoUnit;

  const dataPrevista = new Date();
  dataPrevista.setDate(dataPrevista.getDate() + Math.round(leadTimeEst));
  const dataPrevistaFmt = dataPrevista.toLocaleDateString("pt-BR");

  const handleCopyResumo = () => {
    const texto = `📋 *PEDIDO DE COMPRA / COTAÇÃO - CARFLAX HUB*
────────────────────────────
📦 *Produto:* ${nomeProduto || "Item não especificado"} ${codProduto ? `(#${codProduto})` : ""}
🏬 *Fornecedor:* ${fornecedorSel || "A definir"}
🔢 *Quantidade Solicitada:* ${brNum(qtdCompra)} un.
💲 *Preço Unit. Estimado:* ${precoUnit > 0 ? brMoney(precoUnit) : "A cotar"}
💰 *Valor Total Estimado:* ${totalEstimado > 0 ? brMoney(totalEstimado) : "A cotar"}
🚚 *Lead Time Estimado:* ~${Math.round(leadTimeEst)} dias (Previsão: ${dataPrevistaFmt})
${observacao ? `📝 *Observação:* ${observacao}\n` : ""}
Gerado via Carflax HUB · Suprimentos`;

    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                Simulador de Compra
              </span>
              <h2 className="text-base font-black text-foreground leading-tight mt-0.5">
                Cotação de Pedido de Compra
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
          {itemAlert && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-500 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Alerta de Recompra detectado no ERP</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold">
                {itemAlert.ratio.toFixed(1)}x média
              </span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                Produto
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nomeProduto}
                  onChange={(e) => setNomeProduto(e.target.value)}
                  placeholder="Nome do produto..."
                  className="flex-1 pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="text"
                  value={codProduto}
                  onChange={(e) => setCodProduto(e.target.value)}
                  placeholder="Cód."
                  className="w-24 pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm font-mono font-bold text-foreground outline-none text-center"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                Fornecedor
              </label>
              <select
                value={fornecedorSel}
                onChange={(e) => setFornecedorSel(e.target.value)}
                className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">Selecione um fornecedor...</option>
                {fornecedores.map((f) => (
                  <option key={f.cod_fornecedor} value={f.fornecedor}>
                    {f.fornecedor} ({f.media_dias.toFixed(1)}d lead time)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Quantidade Desejada
                </label>
                <input
                  type="number"
                  min={1}
                  value={qtdCompra}
                  onChange={(e) => setQtdCompra(Number(e.target.value))}
                  className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Preço Custo Unit. (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={precoUnit}
                  onChange={(e) => setPrecoUnit(Number(e.target.value))}
                  className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                Observações
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Faturamento 30/60 dias..."
                className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-secondary/40 border border-border/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-primary" /> Resumo
              </span>
              <span className="text-primary">Estimativa</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Lead Time</p>
                <p className="text-sm font-black text-foreground">{Math.round(leadTimeEst)} dias</p>
              </div>

              <div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Previsão</p>
                <p className="text-sm font-black text-emerald-500">{dataPrevistaFmt}</p>
              </div>

              <div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Total Estimado</p>
                <p className="text-sm font-black text-primary">
                  {precoUnit > 0 ? brMoney(totalEstimado) : "A Cotar"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleCopyResumo}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-xs",
              copied
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-card border-border text-foreground hover:bg-secondary"
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-blue-500" /> Copiar Resumo (WhatsApp)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
