// Propostas de compra montadas pela agenda de reposição.
//
// É um painel que ocupa o lugar da tabela na tela de Reposição (não um modal):
// a conferência do pedido merece a tela inteira. Uma proposta por fornecedor,
// com os itens e a quantidade sugerida — o comprador ajusta, tira o que não quer
// e só então envia; aí sim o pedido é criado na Citel (POST /pedidocompra).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Loader2, Send, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, PackageSearch, Building2, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { apiComprasEnviarProposta } from "@/lib/api";

export interface PropostaItem {
  cod: string;
  descricao: string;
  unidade: string | null;
  media: number;
  saldo: number;
  em_pedido: number;
  sugestao: number;
  preco?: number; // último preço de compra deste fornecedor
}

export interface Proposta {
  id: string;
  criado_em: string;
  agenda_nome: string | null;
  curva: string | null;
  cod_fornecedor: string;
  fornecedor: string | null;
  itens: PropostaItem[];
  total_itens: number;
  status: "pendente" | "enviada" | "descartada";
  pedido_erp: string | null;
  erro: string | null;
}

const brNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const brMoeda = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PropostasCompraPainel({
  usuario, onVoltar, aoMudar,
}: {
  usuario: { id?: string; operatorCode?: string };
  onVoltar: () => void;
  aoMudar?: () => void;
}) {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  // Quantidades editadas na tela, por proposta e item.
  const [ajustes, setAjustes] = useState<Record<string, Record<string, number>>>({});

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("reposicao_propostas")
      .select("*")
      .eq("status", "pendente")
      .order("criado_em", { ascending: false });
    if (error) setErro(error.message);
    else {
      const lista = (data || []) as Proposta[];
      setPropostas(lista);
      // Uma proposta só: já abre, evita um clique à toa.
      if (lista.length === 1) setAberta(lista[0].id);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const qtdDe = (p: Proposta, i: PropostaItem) => ajustes[p.id]?.[i.cod] ?? i.sugestao;

  const totais = useMemo(() => ({
    propostas: propostas.length,
    itens: propostas.reduce((s, p) => s + (p.itens?.length || 0), 0),
    fornecedores: new Set(propostas.map((p) => p.cod_fornecedor)).size,
  }), [propostas]);

  function ajustar(p: Proposta, cod: string, valor: number) {
    setAjustes((a) => ({ ...a, [p.id]: { ...(a[p.id] || {}), [cod]: Math.max(0, valor) } }));
  }

  /** Tira o item da proposta de vez (grava), não só zera a quantidade. */
  async function removerItem(p: Proposta, cod: string) {
    const restantes = (p.itens || []).filter((i) => i.cod !== cod);
    setPropostas((lista) => lista.map((x) => (
      x.id === p.id ? { ...x, itens: restantes, total_itens: restantes.length } : x
    )));
    const { error } = await supabase
      .from("reposicao_propostas")
      .update({ itens: restantes, total_itens: restantes.length })
      .eq("id", p.id);
    if (error) {
      setErro(error.message);
      carregar();
    }
  }

  async function enviar(p: Proposta) {
    const itens = (p.itens || []).map((i) => ({ ...i, sugestao: qtdDe(p, i) })).filter((i) => i.sugestao > 0);
    if (!itens.length) {
      setErro("Nenhum item com quantidade para enviar.");
      return;
    }
    if (!confirm(`Criar o pedido de compra de ${itens.length} item(ns) para ${p.fornecedor || p.cod_fornecedor} na Citel?`)) return;

    setEnviandoId(p.id);
    setErro(null);
    setSucesso(null);
    try {
      const r = await apiComprasEnviarProposta(p.id, itens, usuario.operatorCode, usuario.id);
      setSucesso(
        [
          r.pedido ? `Pedido ${r.pedido} criado na Citel` : "Pedido criado na Citel",
          `${r.itens} item(ns)`,
          r.condicao ? `condição ${r.condicao}` : "",
          r.comprador ? `comprador ${r.comprador}` : "",
        ].filter(Boolean).join(" · ") + ".",
      );
      await carregar();
      aoMudar?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setEnviandoId(null);
    }
  }

  async function descartar(p: Proposta) {
    if (!confirm(`Descartar a proposta de ${p.fornecedor || p.cod_fornecedor}?`)) return;
    await supabase
      .from("reposicao_propostas")
      .update({ status: "descartada", descartada_em: new Date().toISOString(), descartada_por: usuario.id ?? null })
      .eq("id", p.id);
    carregar();
    aoMudar?.();
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
      <div className="shrink-0 px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onVoltar}
            title="Voltar para a lista de reposição"
            className="mt-0.5 inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold hover:bg-secondary"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight">Propostas de compra</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Confira as quantidades, tire o que não vai comprar e envie. O pedido só entra na Citel ao enviar.
            </p>
          </div>
        </div>

        {!carregando && propostas.length > 0 && (
          <div className="flex items-center gap-4">
            <Resumo titulo="Fornecedores" valor={brNum(totais.fornecedores)} />
            <Resumo titulo="Itens" valor={brNum(totais.itens)} />
          </div>
        )}
      </div>

      {sucesso && (
        <p className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {sucesso}
          <button onClick={() => setSucesso(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </p>
      )}
      {erro && (
        <p className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {erro}
          <button onClick={() => setErro(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-auto scrollbar-hide p-4 space-y-3">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] font-bold text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : propostas.length === 0 ? (
          <div className="py-16 text-center">
            <PackageSearch className="w-9 h-9 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[12px] font-black text-muted-foreground">Nenhuma proposta pendente</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Use "Gerar agora" na agenda para montar as propostas da curva.
            </p>
          </div>
        ) : (
          propostas.map((p) => {
            const itens = p.itens || [];
            const aberto = aberta === p.id;
            const unidades = itens.reduce((s, i) => s + qtdDe(p, i), 0);
            const valor = itens.reduce((s, i) => s + qtdDe(p, i) * (i.preco || 0), 0);
            const semPreco = itens.filter((i) => !(i.preco && i.preco > 0)).length;
            const semEstoque = itens.filter((i) => i.saldo <= 0).length;

            return (
              <section
                key={p.id}
                className={cn(
                  "rounded-xl border bg-background/40 overflow-hidden transition-colors",
                  aberto ? "border-blue-500/40" : "border-border",
                )}
              >
                <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <button
                    onClick={() => setAberta(aberto ? null : p.id)}
                    className="flex items-center gap-3 min-w-0 text-left flex-1"
                  >
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      aberto ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground",
                    )}>
                      {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[12px] font-black truncate">
                          {p.fornecedor || p.cod_fornecedor}
                        </span>
                        {p.curva && (
                          <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-px text-[9px] font-black text-blue-600 dark:text-blue-400">
                            curva {p.curva}
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        {itens.length} {itens.length === 1 ? "item" : "itens"} · {brNum(unidades)} unidades
                        {valor > 0 && ` · ${brMoeda(valor)}`}
                        {semEstoque > 0 && ` · ${semEstoque} sem estoque`}
                        {` · ${new Date(p.criado_em).toLocaleDateString("pt-BR")}`}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => enviar(p)}
                      disabled={enviandoId === p.id || !itens.length}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {enviandoId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Enviar à Citel
                    </button>
                    <button
                      onClick={() => descartar(p)}
                      title="Descartar a proposta inteira"
                      className="inline-flex items-center rounded-lg border border-border p-2 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </header>

                {semPreco > 0 && (
                  <p className="mx-4 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {semPreco} {semPreco === 1 ? "item sem preço de compra" : "itens sem preço de compra"} — o ERP recusa o pedido sem preço. Tire esses itens ou compre pelo sistema.
                  </p>
                )}

                {p.erro && (
                  <p className="mx-4 mb-3 rounded-lg bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold text-rose-500">
                    {p.erro}
                  </p>
                )}

                {aberto && (
                  <div className="border-t border-border/60">
                    {itens.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                        Todos os itens foram removidos. Descarte a proposta ou gere de novo.
                      </p>
                    ) : (
                      <table className="w-full border-collapse">
                        <thead className="bg-secondary/40">
                          <tr>
                            <th className={TH}>Código</th>
                            <th className={cn(TH, "text-left")}>Produto</th>
                            <th className={TH}>Média/mês</th>
                            <th className={TH}>Saldo</th>
                            <th className={TH}>Pendente</th>
                            <th className={cn(TH, "text-right")}>Preço</th>
                            <th className={cn(TH, "text-right")}>Comprar</th>
                            <th className={cn(TH, "text-right")}>Total</th>
                            <th className={cn(TH, "w-10")} />
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map((i, idx) => (
                            <tr
                              key={i.cod}
                              className={cn(
                                "border-t border-border/40 hover:bg-secondary/30",
                                idx % 2 === 1 && "bg-secondary/10",
                              )}
                            >
                              <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                {i.cod}
                              </td>
                              <td className="px-3 py-2 text-[11px] font-medium">{i.descricao}</td>
                              <td className="px-3 py-2 text-center text-[11px] tabular-nums text-muted-foreground">
                                {brNum(i.media, 1)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={cn(
                                  "inline-block min-w-[2.25rem] rounded-md border px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                                  i.saldo <= 0
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "border-border text-muted-foreground",
                                )}>
                                  {brNum(i.saldo)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center text-[11px] tabular-nums text-muted-foreground">
                                {i.em_pedido ? brNum(i.em_pedido) : "—"}
                              </td>
                              <td className={cn(
                                "px-3 py-2 text-right text-[11px] tabular-nums",
                                i.preco && i.preco > 0 ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400",
                              )}>
                                {i.preco && i.preco > 0 ? brMoeda(i.preco) : "sem preço"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  <input
                                    value={qtdDe(p, i)}
                                    onChange={(e) => ajustar(p, i.cod, Number(e.target.value.replace(/\D/g, "")))}
                                    inputMode="numeric"
                                    className={cn(
                                      "w-20 rounded-lg border bg-background px-2 py-1 text-right text-[11px] font-black tabular-nums outline-none focus:border-blue-500/60",
                                      qtdDe(p, i) === 0 ? "border-rose-500/40 text-rose-500" : "border-border",
                                    )}
                                  />
                                  <span className="w-7 text-left text-[9px] font-bold uppercase text-muted-foreground">
                                    {i.unidade || ""}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-[11px] font-bold tabular-nums">
                                {i.preco && i.preco > 0 ? brMoeda(i.preco * qtdDe(p, i)) : "—"}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  onClick={() => removerItem(p, i.cod)}
                                  title="Tirar este item do pedido"
                                  className="rounded-md p-1 text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

const TH = "px-3 py-2 text-center text-[9px] font-black uppercase tracking-wider text-muted-foreground";

function Resumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="text-center">
      <span className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground">{titulo}</span>
      <span className="text-[14px] font-black tabular-nums">{valor}</span>
    </div>
  );
}
