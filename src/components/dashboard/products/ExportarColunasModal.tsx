import { useEffect, useState } from "react";
import { apiCaditeColunas } from "@/lib/api";
import { Save, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColunaExport {
  key: string;
  label: string;
}

/**
 * Escolhe quais colunas aparecem na tabela de Produtos (e vão para a
 * planilha) e em que ordem. A ordem é a de marcação (dá para ajustar com as setas).
 */
export function ExportarColunasModal({
  colunas,
  inicial,
  onFechar,
  onSalvar,
}: {
  colunas: ColunaExport[];
  inicial: string[];
  onFechar: () => void;
  onSalvar: (keys: string[]) => void;
}) {
  const [cadite, setCadite] = useState<string[] | null>(null);
  const [erroCadite, setErroCadite] = useState(false);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string[]>(inicial.filter((k) => k.startsWith("cadite:") || colunas.some((c) => c.key === k)));
  const nome = (k: string) => (k.startsWith("cadite:") ? k.slice(7) : colunas.find((c) => c.key === k)?.label ?? k);

  // Todos os campos da CADITE (cadastro do item no ERP), lidos do banco.
  useEffect(() => {
    apiCaditeColunas().then(setCadite, () => setErroCadite(true));
  }, []);
  const caditeFiltrada = (cadite ?? []).filter((c) => c.toLowerCase().includes(busca.trim().toLowerCase()));

  const alternar = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const mover = (i: number, d: -1 | 1) =>
    setSel((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Colunas da tabela</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-secondary" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Marque o que aparece na tabela. A planilha baixa exatamente essas colunas.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Colunas</span>
              <span className="flex gap-2 text-xs">
                <button className="text-blue-500 hover:underline" onClick={() => setSel(colunas.map((c) => c.key))}>Todas</button>
                <button className="text-muted-foreground hover:underline" onClick={() => setSel([])}>Nenhuma</button>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {colunas.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer text-sm">
                  <input type="checkbox" checked={sel.includes(c.key)} onChange={() => alternar(c.key)} className="accent-emerald-600" />
                  {c.label}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 mb-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Campos da CADITE {cadite ? `(${cadite.length})` : ""}
              </span>
              {cadite && (
                <button
                  className="text-xs text-blue-500 hover:underline"
                  onClick={() => setSel((s) => [...s, ...caditeFiltrada.map((c) => `cadite:${c}`).filter((k) => !s.includes(k))])}
                >
                  Marcar {busca ? "filtrados" : "todos"}
                </button>
              )}
            </div>
            {erroCadite ? (
              <p className="text-sm text-red-500">Não foi possível carregar os campos da CADITE.</p>
            ) : !cadite ? (
              <p className="text-sm text-muted-foreground">Carregando campos…</p>
            ) : (
              <>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar campo (ex.: NCM, PESO, ITE_)"
                  className="w-full mb-2 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                />
                <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto pr-1">
                  {caditeFiltrada.map((c) => {
                    const k = `cadite:${c}`;
                    return (
                      <label key={k} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/50 cursor-pointer text-xs font-mono">
                        <input type="checkbox" checked={sel.includes(k)} onChange={() => alternar(k)} className="accent-emerald-600" />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-muted-foreground mb-2">Ordem na tabela</span>
            {sel.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma coluna marcada.</p>
            ) : (
              <ol className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
                {sel.map((k, i) => (
                  <li key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/40 text-sm">
                    <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
                    <span className="flex-1">{nome(k)}</span>
                    <button disabled={i === 0} onClick={() => mover(i, -1)} className="disabled:opacity-30" aria-label="Subir">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button disabled={i === sel.length - 1} onClick={() => mover(i, 1)} className="disabled:opacity-30" aria-label="Descer">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl text-sm hover:bg-secondary">Cancelar</button>
          <button
            disabled={sel.length === 0}
            onClick={() => onSalvar(sel)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40")}
          >
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
