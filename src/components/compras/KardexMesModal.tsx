// Detalhe da venda de um item num mês: quem comprou e quanto.
//
// É o que o comprador faria na mão ao ver um mês fora da curva — conferir se a
// venda foi pulverizada entre clientes ou se saiu quase toda para um só, que é
// o que define se aquele mês entra ou não na média da reposição.

import { useEffect, useState } from "react";
import { X, Loader2, Users } from "lucide-react";
import { apiComprasKardexMes, type KardexMesResponse } from "@/lib/api";

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const brNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const brMoeda = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function KardexMesModal({
  item, descricao, mes, unidade, onFechar,
}: {
  item: string;
  descricao: string;
  mes: string;
  unidade: string | null;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<KardexMesResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiComprasKardexMes(item, mes)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar"));
  }, [item, mes]);

  const [ano, m] = mes.split("-");
  const rotulo = `${MESES_CURTOS[Number(m) - 1]}/${ano.slice(2)}`;
  const clientes = dados?.clientes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight">{descricao}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Código {item} · vendas de {rotulo}
            </p>
          </div>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-secondary shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!dados && !erro ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] font-bold text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : erro ? (
          <p className="py-16 text-center text-[12px] font-bold text-rose-500">{erro}</p>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-border bg-secondary/20 flex flex-wrap items-center gap-4">
              <Resumo titulo="Quantidade" valor={`${brNum(dados!.total_qtd, dados!.total_qtd % 1 ? 1 : 0)} ${unidade || ""}`} />
              <Resumo titulo="Clientes" valor={String(clientes.length)} />
              <Resumo titulo="Faturamento" valor={brMoeda(dados!.total_valor)} />
              <Resumo titulo="Orçamentos" valor={String((dados!.orcamentos || []).length)} />
            </div>

            <div className="flex-1 overflow-auto scrollbar-hide">
              {clientes.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[12px] font-bold text-muted-foreground">Nenhuma venda nesse mês</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 text-left text-[9px] font-black uppercase tracking-wider text-muted-foreground">Cliente</th>
                      <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-wider text-muted-foreground">Notas</th>
                      <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-wider text-muted-foreground">Qtd.</th>
                      <th className="px-5 py-2 text-right text-[9px] font-black uppercase tracking-wider text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {clientes.map((c) => (
                      <tr key={c.cod_cliente} className="hover:bg-secondary/30">
                        <td className="px-5 py-2.5">
                          <span className="text-[12px] font-bold">{c.cliente || c.cod_cliente}</span>
                          <span className="block text-[9px] font-bold text-muted-foreground">{c.cod_cliente}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-[11px] tabular-nums text-muted-foreground">{c.notas}</td>
                        <td className="px-3 py-2.5 text-right text-[12px] font-black tabular-nums">
                          {brNum(c.qtd, c.qtd % 1 ? 1 : 0)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-[11px] tabular-nums text-muted-foreground">
                          {brMoeda(c.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Orçamentos do mês: procura que existiu, tendo virado venda ou não. */}
            {(dados!.orcamentos || []).length > 0 && (
              <div className="border-t border-border">
                <p className="px-5 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/20">
                  Orçamentos do mês
                </p>
                <div className="max-h-48 overflow-auto scrollbar-hide divide-y divide-border/60">
                  {dados!.orcamentos.map((o) => (
                    <div key={`${o.documento}-${o.cod_cliente}`} className="px-5 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold truncate">{o.cliente || o.cod_cliente}</span>
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {o.data ? new Date(o.data).toLocaleDateString("pt-BR") : "—"} · nº {Number(o.documento)}
                          {o.virou_pedido ? " · virou pedido" : ""}
                        </span>
                      </div>
                      <span className="text-[12px] font-black tabular-nums shrink-0">
                        {brNum(o.qtd, o.qtd % 1 ? 1 : 0)} {unidade || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Resumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground">{titulo}</span>
      <span className="text-[13px] font-black tabular-nums">{valor}</span>
    </div>
  );
}
