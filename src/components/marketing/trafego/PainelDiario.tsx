import { useEffect, useMemo, useState } from "react";
import { apiTrafegoDiario, type TrafegoDiarioResponse } from "@/lib/api";

const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Topo do eixo em número "redondo" (200, 400, 600…) acima do maior dia. */
function topoEixo(max: number) {
  if (max <= 0) return 100;
  const passo = max > 1000 ? 500 : max > 400 ? 200 : max > 100 ? 100 : 50;
  return Math.ceil(max / passo) * passo;
}

/**
 * Gasto por dia (gráfico do mês inteiro, Google + Meta empilhados) ao lado do
 * desempenho de cada dia (gasto, contatos e custo por contato).
 */
export function PainelDiario({ inicio, fim, fimMes, recarregar }: { inicio: string; fim: string; fimMes: string; recarregar: number }) {
  const [dados, setDados] = useState<TrafegoDiarioResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    apiTrafegoDiario(inicio, fim)
      .then((d) => { if (vivo) { setDados(d); setErro(null); } })
      .catch((e) => { if (vivo) setErro((e as Error).message); });
    return () => { vivo = false; };
  }, [inicio, fim, recarregar]);

  // Eixo com todos os dias do mês, inclusive os que ainda não chegaram.
  const dias = useMemo(() => {
    const porData = new Map((dados?.dias || []).map((d) => [d.data, d]));
    const ultimo = Number(fimMes.slice(8, 10));
    return Array.from({ length: ultimo }, (_, i) => {
      const data = `${inicio.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
      const d = porData.get(data);
      return { data, google: d?.google || 0, meta: d?.meta || 0, contatos: (d?.contatosGoogle || 0) + (d?.contatosMeta || 0), passou: data <= fim };
    });
  }, [dados, inicio, fim, fimMes]);

  const topo = topoEixo(Math.max(0, ...dias.map((d) => d.google + d.meta)));
  const marcas = [0, 1, 2, 3].map((i) => (topo / 3) * i);
  const linhasTabela = dias.filter((d) => d.passou).reverse();
  const media = (() => {
    const g = linhasTabela.reduce((s, d) => s + d.google + d.meta, 0);
    const c = linhasTabela.reduce((s, d) => s + d.contatos, 0);
    return c > 0 ? g / c : null;
  })();

  return (
    <div className="gt2-duo">
      <section className="gt2-card">
        <div className="gt2-card-head">
          <h3>Gasto por dia</h3>
          <div className="gt2-legend"><span><i style={{ background: "var(--google)" }} />Google</span><span><i style={{ background: "var(--meta)" }} />Meta</span></div>
        </div>
        {erro ? <p className="gt-hint">{erro}</p> : (
          <div className="gt2-chart" role="img" aria-label={`Gasto diário de ${inicio} a ${fim}`}>
            <div className="gt2-eixo">{[...marcas].reverse().map((m) => <span key={m}>{brl0(m)}</span>)}</div>
            <div className="gt2-plot">
              <div className="gt2-grade">{marcas.map((m) => <i key={m} />)}</div>
              <div className="gt2-barras">
                {dias.map((d) => {
                  const dow = new Date(`${d.data}T12:00:00`).getDay();
                  return (
                    <div key={d.data} className={`gt2-dia${dow === 0 || dow === 6 ? " fds" : ""}`}
                      title={`${SEMANA[dow]}, ${d.data.slice(8)}/${d.data.slice(5, 7)}: ${brl(d.google + d.meta)} · Google ${brl(d.google)} · Meta ${brl(d.meta)} · ${d.contatos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} contatos`}>
                      <div className="col">
                        <i className="g" style={{ height: `${(d.google / topo) * 100}%` }} />
                        <i className="m" style={{ height: `${(d.meta / topo) * 100}%` }} />
                      </div>
                      <span>{d.data.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="gt2-card">
        <div className="gt2-card-head"><h3>Desempenho por dia</h3></div>
        <div className="gt2-tbl-scroll">
          <table className="gt2-tbl">
            <thead><tr><th>Dia</th><th>Gasto</th><th>Contatos</th><th>Custo/contato</th></tr></thead>
            <tbody>
              {!dados && !erro && <tr><td colSpan={4}><div className="gt-skel" /></td></tr>}
              {dados && linhasTabela.map((d) => {
                const gasto = d.google + d.meta;
                const cpl = d.contatos > 0 ? gasto / d.contatos : null;
                const cor = cpl == null || media == null ? undefined : cpl <= media ? "var(--good)" : cpl > media * 1.4 ? "var(--bad)" : "var(--warn)";
                const dow = new Date(`${d.data}T12:00:00`).getDay();
                return (
                  <tr key={d.data}>
                    <td>{SEMANA[dow]}, {d.data.slice(8)}/{d.data.slice(5, 7)}</td>
                    <td>{brl0(gasto)}</td>
                    <td>{d.contatos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                    <td style={{ color: cor }}>{cpl == null ? "—" : brl(cpl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
