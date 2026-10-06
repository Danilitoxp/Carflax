import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CaretLeft, CaretRight, CornersOut, CornersIn, X,
  Storefront, Package, Bank, CreditCard, ShoppingCart, Megaphone, Wallet, ChartLineUp, Receipt,
  Timer, FileText, Funnel, Tag,
} from "@phosphor-icons/react";
import type { TrafegoFechamento } from "@/lib/api";
import type { ReportsAnalytics } from "@/lib/marketing-service";
import { brl, brl0, int, x1, pct, dataBR, nomeMes, CANAL, rotuloComparacao } from "./fechamento-formato";
import { Delta, Cascata, Funil, Evolucao } from "./fechamento-graficos";
import { LogoGoogle, LogoMeta, LogoWhatsapp } from "./LogosMarca";

// Ícone ao lado do rótulo: marca do canal (na cor dele) ou um ícone discreto.
function Rot({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return <span className="ap-rot">{icone}<span>{children}</span></span>;
}
const minutos = (v: number | null) =>
  v == null ? "—" : v < 60 ? `${Math.round(v)} min` : `${Math.floor(v / 60)}h${String(Math.round(v % 60)).padStart(2, "0")}`;
const ICL = { size: "1.25em", weight: "regular" } as const;
const iconeCanal = (canal: string) =>
  canal === "google" ? <LogoGoogle /> : canal === "meta" ? <LogoMeta /> : <LogoWhatsapp />;

/**
 * Modo apresentação do Fechamento: os mesmos números da tela, ao vivo, em
 * slides de tela cheia para levar à diretoria. ← → / espaço navegam, Esc sai.
 */
export function FechamentoApresentacao({ dados, anterior, soNovos, onFechar, apresentador, marketing, evolucao }: {
  dados: TrafegoFechamento;
  /** Meses do ano até o atual, para o gráfico de evolução. */
  evolucao?: { rotulo: string; investimento: number; faturamento: number; resultado: number }[] | null;
  /** Números da tela Desempenho de Marketing (leads, atendimento, tags) no mesmo período. */
  marketing?: ReportsAnalytics | null;
  /** Quem está apresentando: foto e nome no rodapé de cada slide. */
  apresentador?: { name: string; avatar?: string | null } | null;
  anterior: TrafegoFechamento | null;
  soNovos: boolean;
  onFechar: () => void;
}) {
  const palco = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [cheia, setCheia] = useState(false);

  const r = soNovos ? dados.resultado : dados.resultadoTodos;
  const ant = anterior ? (soNovos ? anterior.resultado : anterior.resultadoTodos) : undefined;
  const inv = dados.investimento;
  const volta = inv.total > 0 ? r.contribuicao / inv.total : null;
  const base = soNovos ? "clientes novos" : "todos os clientes";
  const mes = nomeMes(dados.mes);
  const vs = rotuloComparacao(anterior);
  const campanhas = dados.porCampanha.filter((c) => c.gasto > 0).slice(0, 8);
  const mk = marketing ?? null;
  const tags = dados.porTema ?? [];
  const atendentes = (mk?.bySeller ?? []).filter((s) => s.salesCount > 0).sort((a, b) => b.salesValue - a.salesValue || b.leads - a.leads).slice(0, 8);
  const clientes = dados.clientes.filter((c) => !soNovos || c.novo).sort((a, b) => b.venda - a.venda).slice(0, 8);

  const slides: { id: string; titulo: string; corpo: ReactNode }[] = [
    {
      id: "capa", titulo: "",
      corpo: (
        <div className="ap-capa">
          <span className="ap-eyebrow">Fechamento do tráfego pago</span>
          <h1>{mes}</h1>
          <p>{dados.periodo.parcial ? `Parcial até ${dataBR(dados.periodo.fim)}` : `${dataBR(dados.periodo.inicio)} a ${dataBR(dados.periodo.fim)}`} · base: {base}</p>
          <div className="ap-marcas" aria-label="Canais: Google Ads, Meta Ads e WhatsApp">
            <span><LogoGoogle /> Google Ads</span>
            <span><LogoMeta /> Meta Ads</span>
            <span><LogoWhatsapp /> WhatsApp</span>
          </div>
        </div>
      ),
    },
    {
      id: "resultado", titulo: "O que sobrou para a empresa",
      corpo: (
        <div className="ap-hero">
          <span className="ap-l">Resultado depois de todos os custos</span>
          <b className={r.resultado >= 0 ? "pos" : "neg"}>{brl0(r.resultado)}</b>
          {volta != null && <p>Cada <strong>R$ 1</strong> investido voltou <strong>{brl(volta)}</strong></p>}
          <p className="ap-sub">
            Investimos {brl0(inv.total)}; {soNovos ? `${int(r.clientes)} clientes novos` : `${int(r.clientes)} clientes`} compraram {brl0(r.faturamento)}
            <Delta vs={vs} agora={r.resultado} antes={ant?.resultado} fmt={brl0} />
          </p>
        </div>
      ),
    },
    {
      id: "cascata", titulo: "Do faturamento ao resultado",
      corpo: (
        <div className="ap-cascata">
          <Cascata linhas={[
            [<Rot icone={<Storefront {...ICL} />}>Faturado (notas emitidas)</Rot>, r.faturamento, "var(--google)", false],
            [<Rot icone={<Package {...ICL} />}>Mercadoria (custo real)</Rot>, -r.custoMercadoria, "var(--ink-3)", false],
            [<Rot icone={<Bank {...ICL} />}>Impostos ({dados.premissas.impostosPct.toString().replace(".", ",")}%)</Rot>, -r.impostos, "var(--warn)", false],
            [<Rot icone={<CreditCard {...ICL} />}>Cartão e comissão ({dados.premissas.taxasPct.toString().replace(".", ",")}%)</Rot>, -r.taxas, "var(--warn)", false],
            [<Rot icone={<Wallet {...ICL} />}>Margem de contribuição</Rot>, r.contribuicao, "var(--destaque)", true],
            [<Rot icone={iconeCanal("google")}>Mídia Google</Rot>, -inv.google, "var(--google)", false],
            [<Rot icone={iconeCanal("meta")}>Mídia Meta</Rot>, -inv.meta, "var(--meta)", false],
            ...(inv.whatsappDetalhe ? [[<Rot icone={iconeCanal("whatsapp")}>WhatsApp API oficial</Rot>, -(inv.whatsapp || 0), "var(--wpp)", false] as [ReactNode, number, string, boolean]] : []),
            ...inv.fixosItens.map((i) => [<Rot icone={<Receipt {...ICL} />}>{i.descricao}</Rot>, -i.valor, "var(--ink-3)", false] as [ReactNode, number, string, boolean]),
            [<Rot icone={<ChartLineUp {...ICL} />}>Resultado</Rot>, r.resultado, r.resultado >= 0 ? "var(--good)" : "var(--bad)", true],
          ]} />
        </div>
      ),
    },
    {
      id: "numeros", titulo: "Investimento e retorno",
      corpo: (
        <div className="ap-kpis">
          <div><span className="ap-l"><Rot icone={<Megaphone {...ICL} />}>Investimento total</Rot></span><b>{brl0(inv.total)}</b><small>{brl0(inv.midia)} em anúncios{inv.whatsappDetalhe ? ` + ${brl(inv.whatsapp || 0)} de WhatsApp` : ""}{inv.fixos ? ` + ${brl0(inv.fixos)} fixos` : ""}<Delta vs={vs} agora={inv.total} antes={anterior?.investimento.total} fmt={brl0} menorMelhor /></small></div>
          <div><span className="ap-l"><Rot icone={<Storefront {...ICL} />}>Faturado em notas ({base})</Rot></span><b>{brl0(r.faturamento)}</b><small>{int(r.clientes)} clientes · {int(r.pedidos)} pedidos<Delta vs={vs} agora={r.faturamento} antes={ant?.faturamento} fmt={brl0} /></small></div>
          <div><span className="ap-l"><Rot icone={<ChartLineUp {...ICL} />}>ROAS</Rot></span><b className={r.resultado >= 0 ? "pos" : "neg"}>{x1(r.roas)}</b><small>faturamento ÷ investimento · só mídia {x1(r.roasMidia)}</small></div>
          <div><span className="ap-l"><Rot icone={<Receipt {...ICL} />}>Ticket médio</Rot></span><b>{r.ticketMedio ? brl0(r.ticketMedio) : "—"}</b><small>markup real {r.markup == null ? "—" : `${r.markup.toFixed(1).replace(".", ",")}%`} · empate em {r.faturamentoParaEmpatar ? brl0(r.faturamentoParaEmpatar) : "—"}</small></div>
        </div>
      ),
    },
    {
      id: "funil", titulo: "Do contato à venda",
      corpo: (
        <div className="ap-funil">
          <Funil etapas={[
            [<Rot icone={<span className="ap-duo">{iconeCanal("google")}{iconeCanal("meta")}</span>}>Contatos nas plataformas</Rot>, dados.funil.contatosPlataforma, "conversões Google + conversas Meta"],
            [<Rot icone={iconeCanal("whatsapp")}>Leads no WhatsApp do tráfego</Rot>, dados.funil.leadsHub, "número exclusivo dos anúncios"],
            [<Rot icone={<Storefront {...ICL} />}>Com cadastro no ERP</Rot>, dados.funil.identificadosErp, `dos ${int(dados.funil.leadsJanela)} leads dos últimos ${dados.premissas.janelaDias} dias`],
            [<Rot icone={<ShoppingCart {...ICL} />}>Compraram no mês</Rot>, dados.funil.clientes, `${dados.funil.novos} novos · ${dados.funil.recorrentes} já eram clientes`],
          ]} />
          <p className="ap-nota">O faturamento é um piso: só entra quem foi encontrado no ERP ({pct(dados.cobertura.erpSobreLeads)} dos leads).</p>
        </div>
      ),
    },
    ...(mk ? [{
      id: "atendimento", titulo: "Atendimento e conversão",
      corpo: (
        <div className="ap-kpis tres">
          <div><span className="ap-l"><Rot icone={iconeCanal("whatsapp")}>Leads que chegaram</Rot></span><b>{int(mk.totals.leads)}</b><small>{dataBR(dados.periodo.inicio)} a {dataBR(dados.periodo.fim)}<Delta vs={vs} agora={mk.totals.leads} antes={mk.previous.leads} fmt={int} /></small></div>
          <div><span className="ap-l"><Rot icone={<Timer {...ICL} />}>Tempo médio de 1ª resposta</Rot></span><b>{minutos(mk.totals.avgResponseMinutes)}</b><small>do primeiro contato à resposta do vendedor<Delta vs={vs} agora={mk.totals.avgResponseMinutes ?? 0} antes={mk.previous.avgResponseMinutes ?? undefined} fmt={minutos} menorMelhor /></small></div>
          <div><span className="ap-l"><Rot icone={<FileText {...ICL} />}>Orçamentos enviados</Rot></span><b>{int(mk.totals.quotesCount)}</b><small>{brl0(mk.totals.quotesValue)} orçados<Delta vs={vs} agora={mk.totals.quotesCount} antes={mk.previous.quotesCount} fmt={int} /></small></div>
          <div><span className="ap-l"><Rot icone={<ShoppingCart {...ICL} />}>Pedidos fechados</Rot></span><b>{int(mk.totals.salesCount)}</b><small>{brl0(mk.totals.salesValue)} vendidos<Delta vs={vs} agora={mk.totals.salesCount} antes={mk.previous.salesCount} fmt={int} /></small></div>
          <div><span className="ap-l"><Rot icone={<Funnel {...ICL} />}>Conversão</Rot></span><b>{pct(mk.totals.convByCount / 100)}</b><small>lead → pedido · {pct(mk.totals.convByQuote / 100)} dos orçamentos viram pedido</small></div>
          <div><span className="ap-l"><Rot icone={<Receipt {...ICL} />}>Ticket médio do pedido</Rot></span><b>{mk.totals.avgTicket ? brl0(mk.totals.avgTicket) : "—"}</b><small>pedidos registrados no HUB<Delta vs={vs} agora={mk.totals.avgTicket} antes={mk.previous.avgTicket} fmt={brl0} /></small></div>
        </div>
      ),
    }] : []),
    ...(atendentes.length ? [{
      id: "atendentes", titulo: "Desempenho por atendente",
      corpo: (
        <table className="ap-tbl">
          <thead><tr><th>Atendente</th><th className="num">Leads</th><th className="num">1ª resposta</th><th className="num">Orçamentos</th><th className="num">Pedidos</th><th className="num">Conversão</th><th className="num">Vendido</th></tr></thead>
          <tbody>
            {atendentes.map((s) => (
              <tr key={s.id}>
                <td><span className="ap-rot">{s.avatar ? <img className="ap-ava" src={s.avatar} alt="" /> : <span className="ap-ava">{s.name.slice(0, 1)}</span>}<span>{s.name}</span></span></td>
                <td className="num">{int(s.leads)}</td>
                <td className="num">{minutos(s.avgResponseMinutes)}</td>
                <td className="num">{int(s.quotesCount)}</td>
                <td className="num">{int(s.salesCount)}</td>
                <td className="num">{pct(s.convRate / 100)}</td>
                <td className="num">{brl0(s.salesValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    }] : []),
    ...(dados.topItens?.length ? [{
      id: "itens", titulo: "Itens mais vendidos do mês",
      corpo: (
        <table className="ap-tbl ap-tbl-compacta">
          <thead><tr><th>#</th><th>Item</th><th className="num">Qtd.</th><th className="num">Vendido</th><th className="num">Margem</th></tr></thead>
          <tbody>
            {dados.topItens.map((i, n) => (
              <tr key={i.item}>
                <td className="num">{n + 1}º</td>
                <td>{i.descricao}</td>
                <td className="num">{i.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                <td className="num">{brl0(i.venda)}</td>
                <td className="num">{i.venda > 0 ? pct(i.margem / i.venda) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    }] : []),
    ...(tags.length ? [{
      id: "tags", titulo: "Resultado por tag",
      corpo: (
        <table className="ap-tbl">
          <thead><tr><th>Tag</th><th className="num">Investido</th><th className="num">Cliques</th><th className="num">Contatos</th><th className="num">Custo/contato</th></tr></thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.tema}>
                <td><Rot icone={<Tag {...ICL} />}>{t.tema}{t.gasto === 0 && <small className="ap-off"> · sem cliques no período</small>}</Rot></td>
                <td className="num">{brl0(t.gasto)}</td>
                <td className="num">{int(t.cliques)}</td>
                <td className="num">{int(t.contatos)}</td>
                <td className="num">{t.contatos > 0 ? brl(t.gasto / t.contatos) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    }] : []),
    ...(campanhas.length ? [{
      id: "campanhas", titulo: "Resultado por campanha",
      corpo: (
        <table className="ap-tbl">
          <thead><tr><th>Campanha</th><th className="num">Gasto</th><th className="num">Leads</th><th className="num">Clientes</th><th className="num">Faturado</th><th className="num">ROAS</th></tr></thead>
          <tbody>
            {campanhas.map((c) => {
              const roas = soNovos ? c.roas : c.roasTodos;
              return (
                <tr key={c.nome}>
                  <td><Rot icone={iconeCanal(/\(Meta\)$/.test(c.nome) ? "meta" : "google")}>{c.nome.replace(/\[CARFLAX\]\s*-?\s*/g, "").replace(/\s*\(Meta\)$/, "").trim()}</Rot></td>
                  <td className="num">{brl0(c.gasto)}</td>
                  <td className="num">{c.leadsHub == null ? "—" : int(c.leadsHub)}</td>
                  <td className="num">{(soNovos ? c.clientes : c.clientesTodos) ?? "—"}</td>
                  <td className="num">{(soNovos ? c.faturamento : c.faturamentoTodos) == null ? "—" : brl0((soNovos ? c.faturamento : c.faturamentoTodos) as number)}</td>
                  <td className="num" style={{ color: roas == null ? undefined : roas >= 4 ? "var(--good)" : roas >= 2 ? "var(--warn)" : "var(--bad)" }}>{x1(roas)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ),
    }] : []),
    ...(clientes.length ? [{
      id: "clientes", titulo: soNovos ? "Maiores clientes novos do mês" : "Maiores clientes do mês",
      corpo: (
        <table className="ap-tbl">
          <thead><tr><th>Cliente</th><th>Canal</th><th>1º contato</th><th className="num">Pedidos</th><th className="num">Faturado</th></tr></thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.cod}>
                <td>{c.cliente}</td>
                <td><Rot icone={iconeCanal(c.canal)}>{CANAL[c.canal] || c.canal}</Rot></td>
                <td>{dataBR(c.primeiroContato)}</td>
                <td className="num">{c.pedidos}</td>
                <td className="num">{brl0(c.venda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    }] : []),
    {
      id: "metodo", titulo: "Como é calculado",
      corpo: (
        <ul className="ap-lista">
          <li><b>Investimento:</b> gasto do Google Ads e do Meta Ads no mês, pelas APIs, mais custos fixos de marketing cadastrados no HUB.</li>
          <li><b>Retorno:</b> notas faturadas no ERP no mês, de clientes que chamaram no WhatsApp exclusivo do tráfego nos {dados.premissas.janelaDias} dias anteriores; só pedidos emitidos depois do primeiro contato.</li>
          <li><b>Custos:</b> mercadoria pelo custo real de cada venda; impostos de {dados.premissas.impostosPct.toString().replace(".", ",")}% e cartão e comissão de {dados.premissas.taxasPct.toString().replace(".", ",")}% sobre o faturamento.</li>
          <li><b>Fora da conta:</b> aluguel, salários e demais custos da loja, que existem com ou sem anúncio.</li>
        </ul>
      ),
    },
    ...(evolucao && evolucao.length > 1 ? [{
      id: "evolucao", titulo: `Evolução em ${dados.mes.slice(0, 4)}`,
      corpo: <Evolucao meses={evolucao} />,
    }] : []),
  ];
  const total = slides.length;

  const ir = useCallback((n: number) => setAtual((a) => Math.min(total - 1, Math.max(0, a + n))), [total]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); ir(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); ir(-1); }
      else if (e.key === "Home") setAtual(0);
      else if (e.key === "End") setAtual(total - 1);
      else if (e.key === "Escape" && !document.fullscreenElement) onFechar();
    };
    const fs = () => setCheia(!!document.fullscreenElement);
    window.addEventListener("keydown", tecla);
    document.addEventListener("fullscreenchange", fs);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, [ir, total, onFechar]);

  // Sai da tela cheia ao fechar a apresentação.
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else palco.current?.requestFullscreen?.().catch(() => {});
  }

  const s = slides[atual];
  return (
    <div className="ap" ref={palco} role="dialog" aria-modal="true" aria-label={`Apresentação do fechamento de ${mes}`}>
      <div className="ap-palco">
        <section key={s.id} className={`ap-slide ap-${s.id}`} aria-live="polite">
          {s.titulo && <header className="ap-topo"><span className="ap-eyebrow">{mes}{dados.periodo.parcial ? " · parcial" : ""}</span><h2>{s.titulo}</h2></header>}
          <div className="ap-corpo">{s.corpo}</div>
          <footer className="ap-rodape">
            {apresentador?.name
              ? <span className="ap-autor">{apresentador.avatar ? <img src={apresentador.avatar} alt="" /> : <i>{apresentador.name.charAt(0)}</i>}<b>{apresentador.name}</b><small>Marketing · Carflax</small></span>
              : <span>Carflax · Tráfego pago</span>}<span>{atual + 1} / {total}</span></footer>
        </section>
      </div>
      <nav className="ap-ctrl" aria-label="Navegação da apresentação">
        <button type="button" onClick={() => ir(-1)} disabled={atual === 0} aria-label="Slide anterior"><CaretLeft size={18} weight="bold" /></button>
        <span>{atual + 1} / {total}</span>
        <button type="button" onClick={() => ir(1)} disabled={atual === total - 1} aria-label="Próximo slide"><CaretRight size={18} weight="bold" /></button>
        <button type="button" onClick={alternarTelaCheia} aria-label={cheia ? "Sair da tela cheia" : "Tela cheia"}>{cheia ? <CornersIn size={18} weight="bold" /> : <CornersOut size={18} weight="bold" />}</button>
        <button type="button" onClick={onFechar} aria-label="Fechar apresentação"><X size={18} weight="bold" /></button>
      </nav>
    </div>
  );
}
