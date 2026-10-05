import { Fragment, useEffect, useState } from "react";
import { Ban, ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { apiComprasPedidos, apiComprasItensPedido, apiComprasCancelarPedido, type PedidoCompra, type ItemPedidoCompra } from "@/lib/api";

const statusLabel = { nao_recebido: "Não recebido", parcial: "Recebido parcialmente", baixado: "Baixado" };
const moeda = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (value: string | null) => value ? value.split("-").reverse().join("/") : "—";
const numero = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });

function ItensPedido({ pedido }: { pedido: PedidoCompra }) {
  const [itens, setItens] = useState<ItemPedidoCompra[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    apiComprasItensPedido(pedido.empresa, pedido.pedido).then(r => { if (ativo) setItens(r.data); })
      .catch(e => { if (ativo) setErro(e instanceof Error ? e.message : "Falha ao carregar itens."); });
    return () => { ativo = false; };
  }, [pedido.empresa, pedido.pedido]);
  if (erro) return <p className="p-4 text-sm text-rose-500">{erro}</p>;
  if (!itens) return <p className="p-4 flex gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando itens…</p>;
  return <div className="overflow-x-auto border-t border-border"><table className="w-full text-xs text-left">
    <thead className="text-muted-foreground bg-secondary/30"><tr>{["Código", "Produto", "Unidade", "Quantidade", "Baixada", "Pendente", "Preço", "Total"].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead>
    <tbody>{itens.map((i, index) => <tr key={`${i.cod}-${index}`} className="border-t border-border/50"><td className="p-3 text-primary font-bold">{i.cod}</td><td className="p-3">{i.descricao}</td><td className="p-3">{i.unidade || "—"}</td>{[i.quantidade, i.quantidade_baixada, i.pendente].map((v, j) => <td className="p-3" key={j}>{numero(v)}</td>)}<td className="p-3 whitespace-nowrap">{moeda(i.preco)}</td><td className="p-3 whitespace-nowrap">{moeda(i.total)}</td></tr>)}</tbody>
  </table>{!itens.length && <p className="p-4 text-sm text-muted-foreground">Pedido sem itens registrados.</p>}</div>;
}

export function PedidosComprasView() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [status, setStatus] = useState("aberto");
  const [empresa, setEmpresa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<PedidoCompra | null>(null);
  useEffect(() => {
    let ativo = true;
    apiComprasPedidos({ busca: filtroBusca, status, empresa, pagina: String(pagina) })
      .then(r => { if (ativo) { setPedidos(r.data); setTotal(r.total); } })
      .catch(e => { if (ativo) setErro(e instanceof Error ? e.message : "Falha ao carregar pedidos."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [filtroBusca, status, empresa, pagina, versao]);
  const preparar = () => { setCarregando(true); setErro(null); setAberto(null); };
  const paginas = Math.max(1, Math.ceil(total / 50));
  return <div className="h-full min-h-0 flex flex-col gap-4 p-5">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-black">Pedidos de compra</h1><p className="text-xs text-muted-foreground">Todos os pedidos do ERP, do mais recente ao mais antigo.</p></div><button disabled={carregando} onClick={() => { preparar(); setVersao(v => v + 1); }} className="flex items-center gap-2 p-2 rounded-xl border border-border text-xs font-bold disabled:opacity-50"><RefreshCw className="w-4 h-4" /> Atualizar</button></div>
    <div className="flex flex-wrap gap-2"><form className="flex gap-2 flex-1 min-w-64" onSubmit={e => { e.preventDefault(); preparar(); setPagina(1); setFiltroBusca(busca.trim()); setVersao(v => v + 1); }}><input aria-label="Buscar pedido ou fornecedor" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número do pedido, código ou nome do fornecedor" className="flex-1 min-w-0 bg-secondary border border-border rounded-xl px-3 py-2 text-sm" /><button aria-label="Buscar" className="p-2 border border-border rounded-xl"><Search className="w-4 h-4" /></button></form>
      <select aria-label="Status do pedido" value={status} onChange={e => { preparar(); setPagina(1); setStatus(e.target.value); }} className="bg-secondary border border-border rounded-xl p-2 text-sm"><option value="">Todos os status</option><option value="aberto">Em aberto</option><option value="nao_recebido">Não recebidos</option><option value="parcial">Recebidos parcialmente</option><option value="baixado">Baixados</option></select>
      <select aria-label="Empresa" value={empresa} onChange={e => { preparar(); setPagina(1); setEmpresa(e.target.value); }} className="bg-secondary border border-border rounded-xl p-2 text-sm"><option value="">Todas as empresas</option>{["001", "002", "003"].map(c => <option key={c}>{c}</option>)}</select></div>
    <p className="text-xs text-muted-foreground">{total.toLocaleString("pt-BR")} pedidos encontrados</p>
    <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[1800px] text-xs text-left">
        <caption className="sr-only">Pedidos de compra do ERP</caption>
        <thead className="sticky top-0 z-10 bg-secondary text-muted-foreground">
          <tr>{["Itens", "Pedido", "Empresa", "Cód. fornecedor", "Fornecedor", "Data pedido", "Faturamento", "Entrega prevista", "Cond. pagamento", "Status", "Total itens", "IPI", "SUB / ST", "FCP", "Frete", "Total pedido", "Comprador", ""].map((label, index) => (
            <th scope="col" key={label || "acoes"} className={`px-3 py-3 whitespace-nowrap font-bold ${index >= 10 && index <= 15 ? "text-right" : ""}`}>{label}</th>
          ))}</tr>
        </thead>
        <tbody>
          {erro ? <tr><td colSpan={18} role="alert" className="p-6 text-rose-500">{erro}</td></tr>
            : carregando ? <tr><td colSpan={18} className="p-8"><span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando pedidos…</span></td></tr>
            : !pedidos.length ? <tr><td colSpan={18} className="p-6 text-muted-foreground">Nenhum pedido encontrado.</td></tr>
            : pedidos.map(p => {
              const key = `${p.empresa}-${p.pedido}`;
              const expandido = aberto === key;
              return <Fragment key={key}>
                <tr className={`border-t border-border/50 hover:bg-secondary/40 ${expandido ? "bg-primary/5" : "even:bg-secondary/10"}`}>
                  <td className="px-3 py-2"><button aria-label={`${expandido ? "Ocultar" : "Mostrar"} itens do pedido ${p.pedido}`} aria-expanded={expandido} aria-controls={`itens-${key}`} onClick={() => setAberto(expandido ? null : key)} className="p-1.5 rounded-md hover:bg-secondary focus-visible:outline focus-visible:outline-primary">{expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button></td>
                  <td className="px-3 py-2 font-bold text-primary whitespace-nowrap">{p.pedido}</td>
                  <td className="px-3 py-2">{p.empresa}</td>
                  <td className="px-3 py-2">{p.cod_fornecedor}</td>
                  <td className="px-3 py-2 min-w-64 font-semibold">{p.fornecedor || p.cod_fornecedor}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{dataBR(p.data_pedido)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{dataBR(p.data_faturamento)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{dataBR(p.data_entrega)}</td>
                  <td className="px-3 py-2">{p.condicao_pagamento || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap" title={p.motivo_baixa || undefined}><span className={`font-bold ${p.status === "parcial" ? "text-amber-500" : p.status === "nao_recebido" ? "text-sky-500" : "text-muted-foreground"}`}>{statusLabel[p.status]}</span></td>
                  {[p.total_itens, p.total_ipi, p.total_sub, p.total_fcp, p.total_frete, p.total].map((value, index) => <td key={index} className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${index === 5 ? "font-bold" : ""}`}>{moeda(value)}</td>)}
                  <td className="px-3 py-2 min-w-56">{[p.cod_comprador, p.comprador].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-3 py-2">
                    {p.status === "nao_recebido" && (
                      <button
                        onClick={() => setCancelando(p)}
                        title="Cancelar este pedido no ERP"
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 whitespace-nowrap"
                      >
                        <Ban className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </td>
                </tr>
                {expandido && <tr id={`itens-${key}`}><td colSpan={18} className="bg-secondary/10"><ItensPedido pedido={p} /></td></tr>}
              </Fragment>;
            })}
        </tbody>
      </table>
    </div>
    {cancelando && (
      <CancelarPedidoModal
        pedido={cancelando}
        onFechar={() => setCancelando(null)}
        onCancelado={() => { setCancelando(null); preparar(); setVersao(v => v + 1); }}
      />
    )}
    <div className="flex justify-end items-center gap-3 text-xs"><button disabled={pagina <= 1 || carregando} onClick={() => { preparar(); setPagina(p => p - 1); }} className="border border-border rounded-lg px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {pagina} de {paginas}</span><button disabled={pagina >= paginas || carregando} onClick={() => { preparar(); setPagina(p => p + 1); }} className="border border-border rounded-lg px-3 py-2 disabled:opacity-40">Próxima</button></div>
  </div>;
}

/**
 * Confirmação do cancelamento. Exige o motivo digitado e repete o valor do
 * pedido: cancelar é baixa total no ERP e não tem desfazer, então a tela cobra
 * uma confirmação consciente em vez de um confirm() de uma linha só.
 */
function CancelarPedidoModal({ pedido, onFechar, onCancelado }: {
  pedido: PedidoCompra; onFechar: () => void; onCancelado: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const cancelar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await apiComprasCancelarPedido(pedido.empresa, pedido.pedido, motivo.trim(), pedido.cod_comprador);
      onCancelado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao cancelar");
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-black">Cancelar pedido {pedido.pedido}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {pedido.fornecedor || pedido.cod_fornecedor} · empresa {pedido.empresa} · {moeda(pedido.total)}
          </p>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            O pedido recebe baixa total no ERP, sem recebimento, e sai do "em aberto". Ele continua no
            histórico — a Citel não apaga pedido — e os itens voltam a contar como necessidade na reposição.
          </p>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Motivo</span>
            <input
              autoFocus
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex.: quantidade errada, comprado em duplicidade"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-rose-500/60"
            />
          </label>
          {erro && <p className="text-[11px] text-rose-500">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button onClick={onFechar} className="text-xs font-bold px-3 py-2 rounded-lg hover:bg-secondary">Voltar</button>
          <button
            onClick={cancelar}
            disabled={enviando || motivo.trim().length < 3}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {enviando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Cancelar pedido
          </button>
        </div>
      </div>
    </div>
  );
}
