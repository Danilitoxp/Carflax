// Gráficos do Fechamento do tráfego, usados pelo relatório da tela e pelo modo apresentação.
import type { ReactNode } from "react";
import { brl, brl0, int } from "./fechamento-formato";

// Valores pequenos (WhatsApp, centavos) com casas decimais; o resto arredondado.
const valorLinha = (v: number) => (Math.abs(v) < 10 ? (v < 0 ? "−" : "") + brl(Math.abs(v)) : brl0(v));

/** Variação contra o mês anterior, já com a cor certa (custo subir é ruim). */
export function Delta({ agora, antes, fmt, menorMelhor = false, vs = "mês anterior" }: { agora: number | null; antes: number | null | undefined; fmt: (v: number) => string; menorMelhor?: boolean; vs?: string }) {
  if (agora == null || antes == null) return null;
  const d = agora - antes;
  if (Math.abs(d) < 0.005 * Math.max(1, Math.abs(antes))) return <span className="gt-hint"> · igual a {vs}</span>;
  const bom = menorMelhor ? d < 0 : d > 0;
  return <span style={{ color: bom ? "var(--good)" : "var(--bad)" }}> · {d > 0 ? "+" : "−"}{fmt(Math.abs(d))} vs {vs}</span>;
}

export function Cascata({ linhas }: { linhas: [ReactNode, number, string, boolean][] }) {
  const max = Math.max(1, ...linhas.map(([, v]) => Math.abs(v)));
  // Cada barra começa onde a anterior terminou (as deduções descem a partir do
  // faturamento); as linhas de total recomeçam do zero.
  const segmentos: [number, number][] = [];
  let corrente = 0;
  linhas.forEach(([, valor, , total], i) => {
    if (total || i === 0) {
      segmentos.push([Math.min(0, valor), Math.max(0, valor)]);
      corrente = valor;
    } else {
      segmentos.push([corrente + valor, corrente]);
      corrente += valor;
    }
  });
  return (
    <div className="gt-wf">
      {linhas.map(([rotulo, valor, cor, total], i) => {
        const [a, b] = segmentos[i];
        const esq = (Math.max(0, Math.min(a, b)) / max) * 100;
        const larg = (Math.abs(b - a) / max) * 100;
        return (
          <div key={i} className={`gt-wf-row${total ? " tot" : ""}`}>
            <span className="lab">{rotulo}</span>
            <span className="trk"><i style={{ left: `${esq}%`, width: `${Math.max(larg, valor ? 0.8 : 0)}%`, background: cor }} /></span>
            <span className="amt">{valorLinha(valor)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Funil({ etapas }: { etapas: [ReactNode, number, string][] }) {
  const max = Math.max(1, ...etapas.map(([, v]) => v));
  return (
    <div className="gt-funil">
      {etapas.map(([rotulo, valor, dica], i) => (
        <div key={i} className="gt-funil-row">
          <div className="top"><span>{rotulo}</span><b>{int(valor)}</b></div>
          <span className="trk"><i style={{ width: `${(valor / max) * 100}%` }} /></span>
          <small>{dica}</small>
        </div>
      ))}
    </div>
  );
}
