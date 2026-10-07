import { useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  salvarParametros, SEM_EQUIPE,
  type ComissaoParametros, type EquipeComissao, type FaixaComissao,
} from "./comissao-service";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface ParametrosModalProps {
  mesRef: Date;
  parametros: ComissaoParametros;
  /** Equipes em tela, para cadastrar a meta de faturamento de cada uma. */
  equipes: EquipeComissao[];
  usuario?: { id?: string; name?: string };
  onFechar: () => void;
  onSalvo: () => void;
}

/**
 * Edita a regra da comissão. Salva SEMPRE na vigência do mês em tela: mexer
 * olhando outubro não reescreve a comissão de setembro, que já foi paga.
 */
export function ParametrosModal({ mesRef, parametros, equipes, usuario, onFechar, onSalvo }: ParametrosModalProps) {
  const [form, setForm] = useState<ComissaoParametros>({
    ...parametros,
    faixas: [...parametros.faixas],
    metas_equipe: { ...parametros.metas_equipe },
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const vigenciaDoMes = parametros.vigencia_inicio.startsWith(
    `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}`,
  );

  const setNum = (campo: keyof ComissaoParametros) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor === "" ? 0 : Number(valor.replace(",", ".")) }));

  /** Campo vazio = tira a meta cadastrada e volta para a soma das metas dos membros. */
  const setMetaEquipe = (equipeId: string, valor: string) =>
    setForm((f) => {
      const metas = { ...f.metas_equipe };
      if (valor.trim() === "") delete metas[equipeId];
      else metas[equipeId] = Number(valor.replace(",", "."));
      return { ...f, metas_equipe: metas };
    });

  const setFaixa = (i: number, campo: keyof FaixaComissao, valor: string) =>
    setForm((f) => ({
      ...f,
      faixas: f.faixas.map((x, idx) =>
        idx !== i ? x : { ...x, [campo]: valor === "" ? (campo === "max" ? null : 0) : Number(valor.replace(",", ".")) },
      ),
    }));

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await salvarParametros(mesRef, form, usuario);
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[88vh] overflow-y-auto scrollbar-hide"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Parâmetros da comissão</h2>
            <p className="text-[10px] text-muted-foreground">
              Vigência: {MESES[mesRef.getMonth()]} {mesRef.getFullYear()}
            </p>
          </div>
          <button type="button" onClick={onFechar} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!vigenciaDoMes && (
            <p className="text-[11px] bg-blue-50 dark:bg-blue-900/20 border border-blue-300/60 rounded-lg px-3 py-2 text-blue-800 dark:text-blue-200">
              Hoje este mês usa a regra de {parametros.vigencia_inicio}. Salvando aqui, você cria uma
              vigência própria para {MESES[mesRef.getMonth()]} em diante, sem alterar os meses anteriores.
            </p>
          )}

          <div>
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Meta de faturamento por equipe (R$)
            </span>
            <div className="space-y-1.5 mt-1">
              {equipes.filter((eq) => eq.id !== SEM_EQUIPE).map((eq) => (
                <div key={eq.id} className="grid grid-cols-[1fr_9rem] gap-2 items-center">
                  <span className="text-[11px] truncate">{eq.nome}</span>
                  <input
                    className={inputCls}
                    placeholder="soma das metas"
                    value={form.metas_equipe[eq.id] === undefined ? "" : String(form.metas_equipe[eq.id])}
                    onChange={(ev) => setMetaEquipe(eq.id, ev.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Em branco, a equipe usa a soma das metas dos membros. O balcão tem meta própria.
            </p>
          </div>

          <Campo label="Meta de margem bruta individual (%)"
            valor={String(form.meta_margem_bruta_pct)} onChange={setNum("meta_margem_bruta_pct")} />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Conversão · Mesa B2B (%)"
              valor={String(form.meta_conversao_pct)} onChange={setNum("meta_conversao_pct")} />
            <Campo label="Conversão · Balcão B2C (%)"
              valor={String(form.meta_conversao_balcao_pct)} onChange={setNum("meta_conversao_balcao_pct")} />
          </div>
          <p className="text-[10px] text-muted-foreground -mt-2">
            Pelo cargo do vendedor: "Vendedor B2B" usa a meta da mesa; "Vendedor B2C", a do balcão.
          </p>
          <Campo label="Meta de margem bruta da equipe (%)"
            valor={String(form.meta_margem_loja_pct)} onChange={setNum("meta_margem_loja_pct")} />
          <Campo label="Valor de cada bônus (R$)" dica="São 5 bônus, em cascata"
            valor={String(form.bonus_valor)} onChange={setNum("bonus_valor")} />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Faixas de faturamento</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, faixas: [...f.faixas, { min: 0, max: null, pct: 0 }] }))}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border border-border hover:bg-secondary"
              >
                <Plus className="w-3 h-3" /> Faixa
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_1fr_4.5rem_1.75rem] gap-1.5 text-[9px] uppercase text-muted-foreground font-bold px-1">
                <span>De (R$)</span><span>Até (R$)</span><span>%</span><span />
              </div>
              {form.faixas.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_4.5rem_1.75rem] gap-1.5">
                  <input className={inputCls} value={String(f.min)} onChange={(ev) => setFaixa(i, "min", ev.target.value)} />
                  <input className={inputCls} placeholder="sem teto"
                    value={f.max === null ? "" : String(f.max)} onChange={(ev) => setFaixa(i, "max", ev.target.value)} />
                  <input className={inputCls} value={String(f.pct)} onChange={(ev) => setFaixa(i, "pct", ev.target.value)} />
                  <button
                    type="button"
                    onClick={() => setForm((x) => ({ ...x, faixas: x.faixas.filter((_, idx) => idx !== i) }))}
                    className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600"
                    title="Remover faixa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              O índice é o da faixa em que o faturamento cai. Deixe "até" vazio na última, para não ter teto.
            </p>
          </div>

          {erro && <p className="text-[11px] text-rose-600">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border sticky bottom-0 bg-card">
          <button type="button" onClick={onFechar} className="text-xs font-bold px-3 py-2 rounded-lg hover:bg-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500";

function Campo({ label, valor, onChange, dica }: {
  label: string; valor: string; onChange: (v: string) => void; dica?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase text-muted-foreground">{label}</span>
      <input className={cn(inputCls, "mt-1")} value={valor} onChange={(ev) => onChange(ev.target.value)} />
      {dica && <span className="text-[10px] text-muted-foreground">{dica}</span>}
    </label>
  );
}
