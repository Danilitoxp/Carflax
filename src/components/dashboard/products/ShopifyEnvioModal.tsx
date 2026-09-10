import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ShoppingBag, Loader2, Check, AlertTriangle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  enviarProdutoParaShopify,
  type ProdutoParaShopify,
  type ResultadoEnvio,
  type ShopifyVariantInfo,
} from "@/lib/shopify-sync";

export interface ItemEnvio {
  produto: ProdutoParaShopify;
  /** variante já existente na loja — quando ausente, o produto será criado */
  existente?: ShopifyVariantInfo;
}

interface Props {
  itens: ItemEnvio[];
  onClose: () => void;
  /** chamado ao fechar depois de pelo menos um envio bem-sucedido */
  onConcluido: () => void;
}

const LIMITE_LISTA = 200;

export function ShopifyEnvioModal({ itens, onClose, onConcluido }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState<ResultadoEnvio[]>([]);

  const novos = itens.filter((i) => !i.existente).length;
  const atualizacoes = itens.length - novos;
  const finalizado = resultados.length > 0 && !enviando;
  const sucessos = resultados.filter((r) => r.ok).length;
  const falhas = resultados.filter((r) => !r.ok);

  const executar = async () => {
    setEnviando(true);
    setProgresso(0);
    const saida: ResultadoEnvio[] = [];
    // Sequencial de propósito: a Admin API da Shopify limita a 2 req/s e o
    // envio em paralelo derruba metade das chamadas com 429.
    for (const item of itens) {
      const r = await enviarProdutoParaShopify(item.produto, item.existente);
      saida.push(r);
      setProgresso(saida.length);
      setResultados([...saida]);
    }
    setEnviando(false);
    if (saida.some((r) => r.ok)) onConcluido();
  };

  const fechar = () => {
    if (enviando) return;
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={fechar} />

      <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-tight text-foreground">
                Enviar para a Shopify
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground">
                {novos} novo{novos === 1 ? "" : "s"} · {atualizacoes} atualização
                {atualizacoes === 1 ? "" : "ões"} de preço/estoque
              </p>
            </div>
          </div>
          <button
            onClick={fechar}
            disabled={enviando}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aviso */}
        {!finalizado && (
          <div className="px-6 py-3 border-b border-border bg-amber-500/5">
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-relaxed">
              Produtos novos entram como <strong>rascunho</strong> na loja (não ficam visíveis
              para o cliente até alguém publicar). Itens que já existem têm apenas preço e
              estoque acertados pelo ERP.
            </p>
          </div>
        )}

        {/* Lista / resultados */}
        <div className="flex-1 overflow-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-secondary/50 backdrop-blur-md border-b border-border">
              <tr>
                {["CÓDIGO", "DESCRIÇÃO", "AÇÃO", "PREÇO", "ESTOQUE", "STATUS"].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-4 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itens.slice(0, LIMITE_LISTA).map((item) => {
                const r = resultados.find((x) => x.cod === item.produto.cod);
                return (
                  <tr key={item.produto.cod} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground tabular-nums">
                      {item.produto.cod}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-[11px] font-black text-foreground uppercase tracking-tight line-clamp-1">
                        {item.produto.desc}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight border",
                          item.existente
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                            : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
                        )}
                      >
                        {item.existente ? "Atualizar" : "Criar"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[10px] font-black text-emerald-500 tabular-nums">
                      R$ {item.produto.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-[10px] font-black text-foreground tabular-nums">
                      {Math.max(0, Math.floor(item.produto.stock))}
                    </td>
                    <td className="py-2.5 px-4">
                      {r ? (
                        r.ok ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase">
                            <Check className="w-3 h-3" /> {r.acao}
                          </span>
                        ) : (
                          <span
                            title={r.erro}
                            className="inline-flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase"
                          >
                            <AlertTriangle className="w-3 h-3" /> falhou
                          </span>
                        )
                      ) : enviando ? (
                        <span className="text-[9px] font-black text-muted-foreground uppercase">
                          na fila
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {itens.length > LIMITE_LISTA && (
            <p className="py-3 text-center text-[10px] font-bold text-muted-foreground">
              +{itens.length - LIMITE_LISTA} itens não listados — todos serão enviados.
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border bg-secondary/20">
          <div className="text-[10px] font-bold text-muted-foreground">
            {enviando
              ? `Enviando ${progresso} de ${itens.length}...`
              : finalizado
                ? `${sucessos} enviado(s)${falhas.length ? ` · ${falhas.length} com erro` : ""}`
                : `${itens.length} produto(s) selecionado(s)`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fechar}
              disabled={enviando}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-30"
            >
              {finalizado ? "Fechar" : "Cancelar"}
            </button>
            {!finalizado && (
              <button
                onClick={executar}
                disabled={enviando || itens.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors disabled:opacity-40"
              >
                {enviando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Confirmar envio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
