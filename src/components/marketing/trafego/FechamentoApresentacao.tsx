import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CaretLeft, CaretRight, CornersOut, CornersIn, X,
  Storefront, Package, Bank, CreditCard, ShoppingCart, Megaphone, Wallet, ChartLineUp, Receipt,
} from "@phosphor-icons/react";
import type { TrafegoFechamento } from "@/lib/api";
import { brl, brl0, int, x1, pct, dataBR, nomeMes, CANAL, rotuloComparacao } from "./fechamento-formato";
import { Delta, Cascata, Funil } from "./fechamento-graficos";
import { LogoGoogle, LogoMeta, LogoWhatsapp } from "./LogosMarca";

// Ícone ao lado do rótulo: marca do canal (na cor dele) ou um ícone discreto.
function Rot({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return <span className="ap-rot">{icone}<span>{children}</span></span>;
}
const ICL = { size: "1.25em", weight: "regular" } as const;
const iconeCanal = (canal: string) =>
  canal === "google" ? <LogoGoogle /> : canal === "meta" ? <LogoMeta /> : <LogoWhatsapp />;

/**
 * Modo apresentação do Fechamento: os mesmos números da tela, ao vivo, em
 * slides de tela cheia para levar à diretoria. ← → / espaço navegam, Esc sai.
 */
export function FechamentoApresentacao({ dados, anterior, soNovos, onFechar, apresentador }: {
  dados: TrafegoFechamento;
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
    {
      id: "canais", titulo: "Resultado por canal",
      corpo: (
        <table className="ap-tbl">
          <thead><tr><th>Canal</th><th className="num">Investimento</th><th className="num">Leads</th><th className="num">Clientes</th><th className="num">Faturado</th><th className="num">ROAS</th></tr></thead>
          <tbody>
            {dados.porCanal.map((c) => (
              <tr key={c.canal}>
                <td><Rot icone={iconeCanal(c.canal)}>{CANAL[c.canal]}</Rot></td>
                <td className="num">{brl0(c.investimento)}</td>
                <td className="num">{int(c.leadsHub)}</td>
                <td className="num">{int(soNovos ? c.novos : c.clientes)}</td>
                <td className="num">{brl0(soNovos ? c.faturamentoNovos : c.faturamento)}</td>
                <td className="num">{c.investimento > 0 ? x1(soNovos ? c.roas : c.roasTodos) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
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
