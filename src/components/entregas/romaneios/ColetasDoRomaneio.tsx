// Coleta encaixada num romaneio, desenhada como uma linha da MESMA tabela das
// entregas (e na mesma lista arrastável). A diferença visual é o selo COLETA
// rosa no lugar do selo ENTREGA, o nº do pedido de compra no lugar da NF e o
// valor de compra no lugar do valor da nota.

import { GripVertical, PackageCheck, MapPin, CheckCircle2, Undo2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { marcarColetada, tirarDoRomaneio } from "./coletas-acoes";
import type { Coleta } from "@/components/compras/ColetasView";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Selo de tipo da linha do romaneio. */
export function SeloTipo({ tipo }: { tipo: "entrega" | "coleta" }) {
  return tipo === "coleta" ? (
    <span className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/30 text-pink-600 dark:text-pink-400 text-[9px] font-black uppercase tracking-widest">
      Coleta
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest">
      Entrega
    </span>
  );
}

/** As cinco células da linha de coleta (Status, Nº, Fornecedor, Valor, Ações). */
export function CelulasColeta({
  coleta: c,
  arrastavel,
  podeEditar,
  aberta,
  onAlternarItens,
  onMudou,
  usuarioId,
}: {
  coleta: Coleta;
  arrastavel: boolean;
  podeEditar: boolean;
  aberta: boolean;
  onAlternarItens: () => void;
  onMudou: () => void;
  usuarioId?: string;
}) {
  const feita = c.status === "coletada";
  const itens = c.itens.split("\n").filter((l) => l.trim());
  return (
    <>
      <td className="py-3 px-4 align-top">
        <div className="flex items-center gap-3">
          {arrastavel && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />}
          {feita ? (
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-100/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center border border-pink-100/50">
              <PackageCheck className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
            </div>
          )}
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              feita ? "text-emerald-600 dark:text-emerald-400" : "text-pink-600 dark:text-pink-400",
            )}
          >
            {feita ? "COLETADA" : "AGUARD."}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 align-top">
        <div className="flex items-center gap-2">
          <SeloTipo tipo="coleta" />
          {c.pedido_compra ? (
            <span className="text-[11px] font-black text-foreground tracking-tighter" title={`Pedido de compra · empresa ${c.pedido_empresa ?? "—"}`}>
              PC #{c.pedido_compra}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground">sem pedido</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 max-w-[400px] align-top">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-black text-foreground uppercase tracking-tight leading-none mb-0.5">{c.fornecedor}</span>
          <div className="flex items-center gap-1.5 opacity-60">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase truncate tracking-tight">
              {[c.endereco, c.bairro, c.cidade, c.uf].filter(Boolean).join(" - ")}
            </span>
          </div>
          {(c.urgencia === "alta" && c.justificativa) || c.observacao ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-tighter border border-blue-100/50">
                OBS
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase italic tracking-tight truncate">
                {c.urgencia === "alta" && c.justificativa ? `Urgente: ${c.justificativa}` : c.observacao}
              </span>
            </div>
          ) : null}
          {aberta && (
            <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
              <p className="text-xs whitespace-pre-wrap text-foreground/90 normal-case">{itens.join("\n")}</p>
              {c.contato && <p className="text-[10px] text-muted-foreground">Contato: {c.contato}</p>}
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-right align-top">
        {c.valor_compra != null ? (
          <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tracking-tighter whitespace-nowrap" title="Valor de compra dos itens a coletar">
            {brl(Number(c.valor_compra))}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
        )}
      </td>
      <td className="py-3 px-4 align-top">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={onAlternarItens}
            className="p-1.5 rounded-md hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-colors"
            title="Ver itens"
          >
            <Package className="w-4 h-4" />
          </button>
          {podeEditar && !feita && (
            <>
              <button
                onClick={async () => {
                  await marcarColetada(c.id, usuarioId);
                  onMudou();
                }}
                className="p-1.5 rounded-md hover:bg-emerald-50 text-slate-300 hover:text-emerald-600"
                title="Marcar como coletada"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={async () => {
                  await tirarDoRomaneio(c.id);
                  onMudou();
                }}
                className="p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500"
                title="Tirar do romaneio (volta para a fila de coletas)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </>
  );
}
