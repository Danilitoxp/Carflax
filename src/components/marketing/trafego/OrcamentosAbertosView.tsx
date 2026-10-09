// Marketing › Orçamentos em aberto: orçamentos do WhatsApp (últimos 30 dias)
// que ainda não viraram venda, por vendedor. Parado há 48h ou mais fica em
// destaque — é o mesmo corte do aviso automático que o vendedor recebe no HUB.

import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise, ClipboardText, Clock, CurrencyCircleDollar, Users } from "@phosphor-icons/react";
import { apiOrcamentosAbertos, type OrcamentosAbertos } from "@/lib/api";
import "./gestao-trafego.css";
import "./gestao-trafego-v2.css";
import "./landing-page.css";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const tempo = (h: number | null) => (h == null ? "—" : h < 48 ? `${h}h` : `${Math.floor(h / 24)} dias`);

export function OrcamentosAbertosView() {
  const [dados, setDados] = useState<OrcamentosAbertos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [vendedor, setVendedor] = useState<string>("todos");
  const [soAtrasados, setSoAtrasados] = useState(false);

  useEffect(() => {
    let vivo = true;
    apiOrcamentosAbertos()
      .then((r) => { if (vivo) { setDados(r); setErro(null); } })
      .catch((e) => vivo && setErro((e as Error).message));
    return () => { vivo = false; };
  }, [versao]);

  const itens = useMemo(() => (dados?.itens || [])
    .filter((i) => vendedor === "todos" || i.vendedor === vendedor)
    .filter((i) => !soAtrasados || i.atrasado), [dados, vendedor, soAtrasados]);

  return (
    <div className="gt gt2 lp">
      <div className="gt-wrap">
        <header className="gt2-head">
          <div>
            <nav className="gt2-trilha" aria-label="Você está em"><span>Marketing</span><i>›</i><span>Orçamentos em aberto</span></nav>
            <h1>Orçamentos <em>em aberto</em></h1>
            <p className="gt2-sub">Orçamentos do WhatsApp dos últimos 30 dias que ainda não viraram venda.</p>
          </div>
          <div className="gt2-acoes">
            <button type="button" className="gt-btn ghost" onClick={() => { setDados(null); setVersao((v) => v + 1); }}>
              <ArrowsClockwise size={15} weight="bold" /> Atualizar
            </button>
          </div>
        </header>

        {erro && <div className="gt-banner bad"><b>Não foi possível carregar:</b> {erro}</div>}

        <div className="gt2-kpis">
          <Kpi icone={<ClipboardText size={24} weight="duotone" />} titulo="Orçamentos abertos" valor={!dados ? "…" : String(dados.total.qtd)} sub="sem venda e não perdidos" />
          <Kpi icone={<CurrencyCircleDollar size={24} weight="duotone" />} titulo="Valor em aberto" valor={!dados ? "…" : brl(dados.total.valor)} sub="soma dos orçamentos" />
          <Kpi icone={<Clock size={24} weight="duotone" />} titulo="Parados há 48h+" valor={!dados ? "…" : String(dados.total.atrasados)} sub="vendedor recebe aviso (até 7 dias)" />
          <Kpi icone={<Users size={24} weight="duotone" />} titulo="Vendedores" valor={!dados ? "…" : String(dados.porVendedor.length)} sub="com orçamento em aberto" />
        </div>

        <div className="lp-grade oa-grade">
          <section className="gt2-card">
            <div className="gt2-card-head"><h3>Por vendedor</h3></div>
            {!dados ? <p className="lp-vazio">Carregando…</p> : (
              <table className="lp-tab">
                <thead><tr><th>Vendedor</th><th className="num">Qtd</th><th className="num">48h+</th><th className="num">Valor</th></tr></thead>
                <tbody>
                  {dados.porVendedor.map((v) => (
                    <tr key={v.vendedor} className={`oa-linha ${vendedor === v.vendedor ? "ativa" : ""}`}
                      onClick={() => setVendedor(vendedor === v.vendedor ? "todos" : v.vendedor)}>
                      <td>{v.vendedor}</td>
                      <td className="num">{v.qtd}</td>
                      <td className="num">{v.atrasados}</td>
                      <td className="num">{brl(v.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="lp-nota">Clique num vendedor para filtrar a lista.</p>
          </section>

          <section className="gt2-card">
            <div className="gt2-card-head">
              <h3>Orçamentos{vendedor !== "todos" ? ` · ${vendedor}` : ""}</h3>
              <label className="oa-check"><input type="checkbox" checked={soAtrasados} onChange={(e) => setSoAtrasados(e.target.checked)} /> só 48h+</label>
            </div>
            {!dados ? <p className="lp-vazio">Carregando…</p> : !itens.length ? <p className="lp-vazio">Nenhum orçamento em aberto.</p> : (
              <div className="oa-rolagem">
                <table className="lp-tab">
                  <thead><tr><th>Cliente</th><th>Vendedor</th><th className="num">Parado</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {itens.map((i) => (
                      <tr key={i.remote_jid}>
                        <td>{i.cliente}</td>
                        <td>{i.vendedor}</td>
                        <td className="num"><span className={i.atrasado ? "oa-atraso" : undefined}>{tempo(i.horas_parado)}</span></td>
                        <td className="num">{brl(i.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icone, titulo, valor, sub }: { icone: React.ReactNode; titulo: string; valor: string; sub: string }) {
  return (
    <div className="gt2-kpi"><span className="ico">{icone}</span><div>
      <p>{titulo}</p><b>{valor}</b><small>{sub}</small>
    </div></div>
  );
}
