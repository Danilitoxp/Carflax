// Marketing › Landing page: taxa de conversão da página dos anúncios
// (orcamento.carflax.com.br). Visitas e cliques no WhatsApp contados por
// visitante, com os robôs do Google fora da conta. Dados: lp_eventos, via
// /api/marketing/trafego/landing-page.

import { useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut, CursorClick, Eye, Percent, Robot, Flask, CalendarBlank, CaretDown, ArrowsClockwise,
} from "@phosphor-icons/react";
import { apiLandingPage, type LandingPageRelatorio, type LpGrupo } from "@/lib/api";
import "./gestao-trafego.css";
import "./gestao-trafego-v2.css";
import "./landing-page.css";

const URL_LP = "https://orcamento.carflax.com.br";
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
const pct = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const dataBR = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

type Periodo = "hoje" | "7d" | "mes" | "mes-passado";
function intervalo(p: Periodo) {
  const hoje = hojeSP();
  const d = new Date(`${hoje}T12:00:00`);
  if (p === "hoje") return { inicio: hoje, fim: hoje };
  if (p === "7d") { const i = new Date(d); i.setDate(i.getDate() - 6); return { inicio: i.toISOString().slice(0, 10), fim: hoje }; }
  if (p === "mes") return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
  const i = new Date(d.getFullYear(), d.getMonth() - 1, 1), f = new Date(d.getFullYear(), d.getMonth(), 0);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { inicio: iso(i), fim: iso(f) };
}

const NOME_CIDADE: Record<string, string> = { cabreuva: "Cabreúva", itupeva: "Itupeva", vinhedo: "Vinhedo", louveira: "Louveira", jundiai: "Jundiaí" };
const NOME_LINHA: Record<string, string> = { ppr: "PPR / CPVC / PEAD", hidraulica: "Hidráulica", eletrica: "Elétrica", ferramentas: "Ferramentas", Geral: "Página geral" };

export function LandingPageView() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dados, setDados] = useState<LandingPageRelatorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const { inicio, fim } = useMemo(() => intervalo(periodo), [periodo]);

  useEffect(() => {
    let vivo = true;
    apiLandingPage(inicio, fim)
      .then((r) => { if (vivo) { setDados(r); setErro(null); } })
      .catch((e) => vivo && setErro((e as Error).message));
    return () => { vivo = false; };
  }, [inicio, fim, versao]);

  const variacao = dados && dados.anterior.taxa != null && dados.total.taxa != null ? dados.total.taxa - dados.anterior.taxa : null;
  const maxSerie = Math.max(1, ...(dados?.serie || []).map((s) => s.visitas));

  return (
    <div className="gt gt2 lp">
      <div className="gt-wrap">
        <header className="gt2-head">
          <div>
            <nav className="gt2-trilha" aria-label="Você está em"><span>Marketing</span><i>›</i><span>Landing page</span></nav>
            <h1>Landing <em>page</em></h1>
            <p className="gt2-sub">Quantos visitam a página dos anúncios e quantos chamam no WhatsApp.</p>
          </div>
          <div className="gt2-acoes">
            <label className="gt2-mes" htmlFor="lp-periodo">
              <CalendarBlank size={17} />
              <select id="lp-periodo" aria-label="Período" value={periodo} onChange={(e) => { setDados(null); setPeriodo(e.target.value as Periodo); }}>
                <option value="hoje">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="mes">Este mês</option>
                <option value="mes-passado">Mês passado</option>
              </select>
              <CaretDown size={14} />
            </label>
            <button type="button" className="gt-btn ghost" onClick={() => { setDados(null); setVersao((v) => v + 1); }}>
              <ArrowsClockwise size={15} weight="bold" /> Atualizar
            </button>
            <a className="gt-btn ghost" href={URL_LP} target="_blank" rel="noopener noreferrer">
              <ArrowSquareOut size={15} weight="bold" /> Abrir página
            </a>
          </div>
        </header>

        {erro && <div className="gt-banner bad"><b>Não foi possível carregar:</b> {erro}</div>}

        <div className="gt2-kpis">
          <Kpi icone={<Eye size={24} weight="duotone" />} titulo="Visitantes" valor={!dados ? "…" : int(dados.total.visitas)}
            sub={dados ? `${int(dados.anuncio.visitas)} do anúncio · ${int(dados.organico.visitas)} diretos` : ""} />
          <Kpi icone={<CursorClick size={24} weight="duotone" />} titulo="Chamaram no WhatsApp" valor={!dados ? "…" : int(dados.total.cliques)}
            sub={dados ? `${int(dados.anuncio.cliques)} vindos do anúncio` : ""} />
          <Kpi icone={<Percent size={24} weight="duotone" />} titulo="Taxa de conversão" valor={!dados ? "…" : pct(dados.total.taxa)}
            sub={dados ? (variacao == null ? "sem período anterior para comparar"
              : `${variacao >= 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs ${dataBR(dados.periodo.anteriorInicio)}–${dataBR(dados.periodo.anteriorFim)}`) : ""}
            tom={variacao == null ? undefined : variacao >= 0 ? "bom" : "ruim"} />
          <Kpi icone={<Robot size={24} weight="duotone" />} titulo="Robôs fora da conta" valor={!dados ? "…" : int(dados.robos)}
            sub="verificações do Google, sem código de clique" />
        </div>

        <div className="lp-grade">
          <section className="gt2-card">
            <div className="gt2-card-head"><h3>Por campanha</h3></div>
            <Tabela linhas={dados?.porCampanha} />
          </section>

          <section className="gt2-card">
            <div className="gt2-card-head"><h3><Flask size={18} weight="duotone" /> Teste A/B do título</h3></div>
            {!dados ? <p className="lp-vazio">Carregando…</p> : (
              <>
                {dados.testeAB.variantes.map((v) => (
                  <div key={v.variante} className={`lp-ab ${dados.testeAB.vencedora === v.variante ? "ganhou" : ""}`}>
                    <span className="lp-ab-letra">{v.variante.toUpperCase()}</span>
                    <div className="lp-ab-txt">
                      <b>“{v.titulo}”</b>
                      <small>{int(v.visitas)} visitantes · {int(v.cliques)} chamaram</small>
                    </div>
                    <strong>{pct(v.taxa)}</strong>
                  </div>
                ))}
                <p className="lp-nota">
                  {dados.testeAB.vencedora
                    ? `Variante ${dados.testeAB.vencedora.toUpperCase()} venceu com ${pct(dados.testeAB.confianca)} de confiança.`
                    : `Ainda sem vencedor${dados.testeAB.confianca != null ? ` (confiança ${pct(dados.testeAB.confianca)})` : ""}. Precisa de 100 visitantes em cada título e 95% de confiança.`}
                  {" "}Só entra quem chega na versão geral (sem linha nem cidade).
                </p>
              </>
            )}
          </section>

          <section className="gt2-card">
            <div className="gt2-card-head"><h3>Por cidade</h3></div>
            <Tabela linhas={dados?.porCidade.map((c) => ({ ...c, nome: NOME_CIDADE[c.nome] || c.nome }))} vazio="Nenhuma visita das campanhas de cidade no período." />
          </section>

          <section className="gt2-card">
            <div className="gt2-card-head"><h3>Por linha de produto</h3></div>
            <Tabela linhas={dados?.porLinha.map((c) => ({ ...c, nome: NOME_LINHA[c.nome] || c.nome }))} />
          </section>

          <section className="gt2-card">
            <div className="gt2-card-head"><h3>Por aparelho</h3></div>
            <Tabela linhas={dados?.porDispositivo.map((c) => ({ ...c, nome: c.nome === "celular" ? "Celular" : c.nome === "computador" ? "Computador" : c.nome }))} />
          </section>

          <section className="gt2-card">
            <div className="gt2-card-head"><h3>Por dia</h3></div>
            {!dados?.serie.length ? <p className="lp-vazio">{dados ? "Sem visitas no período." : "Carregando…"}</p> : (
              <div className="lp-serie" role="img" aria-label="Visitantes e cliques por dia">
                {dados.serie.map((s) => (
                  <div key={s.dia} className="lp-dia" title={`${dataBR(s.dia)}: ${s.visitas} visitantes, ${s.cliques} chamaram (${pct(s.taxa)})`}>
                    <div className="lp-barra" style={{ height: `${(s.visitas / maxSerie) * 100}%` }}>
                      <i style={{ height: s.visitas ? `${(s.cliques / s.visitas) * 100}%` : 0 }} />
                    </div>
                    <span>{s.dia.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="lp-nota"><span className="lp-leg v" /> visitantes <span className="lp-leg c" /> chamaram no WhatsApp</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icone, titulo, valor, sub, tom }: { icone: React.ReactNode; titulo: string; valor: string; sub: string; tom?: "bom" | "ruim" }) {
  return (
    <div className="gt2-kpi"><span className="ico">{icone}</span><div>
      <p>{titulo}</p><b>{valor}</b>
      <small style={tom ? { color: tom === "bom" ? "var(--good)" : "var(--bad)" } : undefined}>{sub}</small>
    </div></div>
  );
}

function Tabela({ linhas, vazio = "Sem visitas no período." }: { linhas?: LpGrupo[]; vazio?: string }) {
  if (!linhas) return <p className="lp-vazio">Carregando…</p>;
  if (!linhas.length) return <p className="lp-vazio">{vazio}</p>;
  const max = Math.max(...linhas.map((l) => l.taxa ?? 0), 1);
  return (
    <table className="lp-tab">
      <thead><tr><th>Nome</th><th className="num">Visitantes</th><th className="num">Chamaram</th><th className="num">Taxa</th></tr></thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.nome}>
            <td>{l.nome}</td>
            <td className="num">{int(l.visitas)}</td>
            <td className="num">{int(l.cliques)}</td>
            <td className="num"><span className="lp-taxa"><i style={{ width: `${((l.taxa ?? 0) / max) * 100}%` }} />{pct(l.taxa)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
