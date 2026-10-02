import { useState } from "react";
import {
  apiTrafegoProgramacao,
  type TrafegoCampanha,
  type TrafegoDia,
} from "@/lib/api";
import { DIAS, resumoProgramacao } from "./programacao-util";

// ── Dias e horários ─────────────────────────────────────────────────────────
export function ProgramacaoModal({ campanhas, inicial, onFechar, onSalvo }: {
  /** Campanhas do Google que podem receber a programação. */
  campanhas: TrafegoCampanha[];
  /** Quando vem de uma linha da tabela: só essa marcada. */
  inicial?: TrafegoCampanha;
  onFechar: () => void;
  onSalvo: (texto: string) => void;
}) {
  const base = inicial?.programacao || [];
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    () => new Set(inicial ? [inicial.id] : campanhas.filter((c) => c.status === "ENABLED").map((c) => c.id)),
  );
  const [dias, setDias] = useState<Set<TrafegoDia>>(() => (base.length ? new Set(base.map((b) => b.dia)) : new Set(DIAS.slice(0, 5).map((d) => d.id))));
  const [inicio, setInicio] = useState(() => (base.length ? Math.floor(base[0].inicio) : 8));
  const [fim, setFim] = useState(() => (base.length ? Math.ceil(base[0].fim) : 18));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const horariosDiferentes = base.length > 0 && new Set(base.map((b) => `${b.inicio}-${b.fim}`)).size > 1;

  function preset(ids: TrafegoDia[], i: number, f: number) {
    setDias(new Set(ids));
    setInicio(i);
    setFim(f);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const ordem = DIAS.map((d) => d.id).filter((d) => dias.has(d));
      const r = await apiTrafegoProgramacao([...selecionadas], ordem, inicio, fim);
      const ok = r.resultados.filter((x) => x.ok).length;
      const resumo = resumoProgramacao(ordem.map((dia) => ({ dia, inicio, fim })));
      onSalvo(`Programação "${resumo}" aplicada em ${ok} campanha(s) do Google.${r.error ? ` Falhou: ${r.error}` : ""}`);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const horas = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="gt-overlay" role="dialog" aria-modal="true" aria-label="Dias e horários" onClick={() => !salvando && onFechar()}>
      <div className="gt-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Dias e horários</h3>
        <p>Os anúncios do Google só aparecem nos dias e horários marcados (horário de Brasília). Fora deles, a campanha não gasta.</p>

        <div className="gt-actions" style={{ marginTop: 6 }}>
          <button type="button" className="gt-btn ghost small" onClick={() => preset(DIAS.slice(0, 5).map((d) => d.id), 8, 18)}>Seg–Sex 8h–18h</button>
          <button type="button" className="gt-btn ghost small" onClick={() => preset(DIAS.slice(0, 6).map((d) => d.id), 8, 18)}>Seg–Sáb 8h–18h</button>
          <button type="button" className="gt-btn ghost small" onClick={() => preset(DIAS.map((d) => d.id), 0, 24)}>Todos os dias, 24h</button>
        </div>

        <div className="gt-dias-sel" role="group" aria-label="Dias da semana">
          {DIAS.map((d) => (
            <label key={d.id} className={dias.has(d.id) ? "on" : ""}>
              <input type="checkbox" checked={dias.has(d.id)} onChange={() => setDias((s) => { const n = new Set(s); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; })} />
              {d.curto}
            </label>
          ))}
        </div>

        <div className="gt-form" style={{ marginTop: 10 }}>
          <label htmlFor="gt-h-ini">Começa às
            <select id="gt-h-ini" value={inicio} onChange={(e) => setInicio(Number(e.target.value))}>
              {horas.slice(0, 24).map((h) => <option key={h} value={h}>{h}h</option>)}
            </select>
          </label>
          <label htmlFor="gt-h-fim">Termina às
            <select id="gt-h-fim" value={fim} onChange={(e) => setFim(Number(e.target.value))}>
              {horas.slice(1).map((h) => <option key={h} value={h}>{h === 24 ? "24h (meia-noite)" : `${h}h`}</option>)}
            </select>
          </label>
        </div>
        {horariosDiferentes && <p className="gt-hint" style={{ marginTop: 8 }}>Hoje esta campanha tem horários diferentes por dia ({resumoProgramacao(base)}). Ao salvar, todos os dias marcados ficam com o mesmo horário.</p>}

        {!inicial && (
          <>
            <h4 style={{ margin: "16px 0 6px" }}>Aplicar em</h4>
            <div className="gt-camp-sel">
              {campanhas.map((c) => (
                <label key={c.id} className="gt-check">
                  <input type="checkbox" checked={selecionadas.has(c.id)} onChange={() => setSelecionadas((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
                  <span>{c.nome} <span className="gt-hint">· {resumoProgramacao(c.programacao)}{c.status !== "ENABLED" ? " · pausada" : ""}</span></span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="gt-banner info" style={{ marginTop: 14 }}>
          <span><b>Meta:</b> com orçamento diário, a Meta não permite escolher dias. Para tirar o fim de semana, pause a campanha na sexta e ative na segunda, ou crie uma regra automática no Gerenciador de Anúncios.</span>
        </div>
        {erro && <div className="gt-banner bad" style={{ marginTop: 10 }}><span><b>Não foi possível.</b> {erro}</span></div>}

        <div className="gt-modal-foot">
          <button type="button" className="gt-btn ghost" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button type="button" className="gt-btn" onClick={salvar} disabled={salvando || dias.size === 0 || selecionadas.size === 0 || fim <= inicio}>
            {salvando ? "Aplicando…" : `Aplicar em ${selecionadas.size} campanha(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
