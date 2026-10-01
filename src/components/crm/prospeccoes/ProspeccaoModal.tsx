// Registro da prospecção: o que aconteceu na tentativa de contato.
//
// Antes o botão "Prospectar" só pedia uma data e criava um follow-up no
// calendário; o resultado da ligação se perdia. Aqui o vendedor diz se falou com
// o cliente, por que ele parou de comprar, se tem interesse e quando retornar —
// tudo gravado em prospeccao_contatos, com o follow-up continuando a ir para o
// calendário quando há data de próximo contato.

import { useState } from "react";
import { X, Loader2, Check, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const CONTATOS = {
  falou: { label: "Falei com o cliente", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  nao_atendeu: { label: "Não atendeu", cls: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30" },
  retornar_depois: { label: "Pediu para retornar", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  contato_errado: { label: "Contato errado", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
} as const;

export const MOTIVOS = {
  preco: "Preço alto",
  prazo_entrega: "Prazo de entrega",
  falta_estoque: "Falta de estoque",
  atendimento: "Atendimento",
  concorrente: "Está comprando do concorrente",
  sem_demanda: "Obra parada / sem demanda",
  financeiro: "Financeiro (crédito, cobrança)",
  fechou: "Fechou ou mudou de ramo",
  outro: "Outro",
} as const;

export const INTERESSES = {
  sim: { label: "Tem interesse", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  talvez: { label: "Talvez", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  nao: { label: "Sem interesse", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
} as const;

export type ContatoTipo = keyof typeof CONTATOS;
export type MotivoTipo = keyof typeof MOTIVOS;
export type InteresseTipo = keyof typeof INTERESSES;

export interface ProspeccaoContato {
  id: string;
  criado_em: string;
  criado_por_nome: string | null;
  cliente_id: string;
  contato: ContatoTipo;
  motivo: MotivoTipo | null;
  motivo_detalhe: string | null;
  interesse: InteresseTipo | null;
  proximo_contato: string | null;
  observacao: string | null;
}

interface ClienteProspeccao {
  cliente_id: string;
  nome_cliente: string;
  recencia_dias: number;
  valor_total: number;
  cod_vendedor: string;
}

export function ProspeccaoModal({
  cliente,
  usuario,
  onFechar,
  onSalvo,
}: {
  cliente: ClienteProspeccao;
  usuario: { id?: string; nome?: string; operatorCode?: string };
  onFechar: () => void;
  onSalvo: (registro: ProspeccaoContato) => void;
}) {
  const [contato, setContato] = useState<ContatoTipo | null>(null);
  const [motivo, setMotivo] = useState<MotivoTipo | "">("");
  const [motivoDetalhe, setMotivoDetalhe] = useState("");
  const [interesse, setInteresse] = useState<InteresseTipo | "">("");
  const [proximoContato, setProximoContato] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const falou = contato === "falou";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!contato) return;
    setErro(null);
    setSalvando(true);

    const registro = {
      criado_por: usuario.id ?? null,
      criado_por_nome: usuario.nome ?? null,
      cod_vendedor: usuario.operatorCode || cliente.cod_vendedor || null,
      cliente_id: cliente.cliente_id,
      nome_cliente: cliente.nome_cliente,
      recencia_dias: cliente.recencia_dias,
      valor_total: cliente.valor_total,
      contato,
      motivo: falou && motivo ? motivo : null,
      motivo_detalhe: falou && motivoDetalhe.trim() ? motivoDetalhe.trim() : null,
      interesse: falou && interesse ? interesse : null,
      proximo_contato: proximoContato || null,
      observacao: observacao.trim() || null,
    };

    const { data, error } = await supabase
      .from("prospeccao_contatos")
      .insert([registro])
      .select()
      .single();

    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    // Data combinada vira follow-up no calendário, como era antes do formulário.
    if (proximoContato) {
      const [ano, mes, dia] = proximoContato.split("-").map(Number);
      const primeiroNome = usuario.nome?.split(" ")[0] || "";
      await supabase.from("eventos_calendario").insert([{
        title: `FOLLOW-UP: ${cliente.nome_cliente.toUpperCase()}${primeiroNome ? ` - Vendedor: ${primeiroNome}` : ""}`,
        description: [
          `Prospecção — cliente sem compra há ${cliente.recencia_dias} dias.`,
          `Contato: ${CONTATOS[contato].label}.`,
          falou && motivo ? `Motivo de não comprar: ${MOTIVOS[motivo]}.` : "",
          falou && interesse ? `Interesse: ${INTERESSES[interesse].label}.` : "",
          observacao.trim(),
        ].filter(Boolean).join(" "),
        type: "follow-up",
        vendedor_codigo: usuario.operatorCode || cliente.cod_vendedor || "",
        day: dia,
        month: mes,
        year: ano,
      }]);
    }

    setSalvando(false);
    onSalvo(data as ProspeccaoContato);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl bg-card border border-border shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[12px] font-black uppercase tracking-tight flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" /> Registrar prospecção
            </h2>
            <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{cliente.nome_cliente}</p>
            <p className="text-[10px] text-muted-foreground">
              Sem comprar há {cliente.recencia_dias} dias
            </p>
          </div>
          <button type="button" onClick={onFechar} className="p-1 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <Campo titulo="Conseguiu falar com o cliente?" obrigatorio>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CONTATOS) as ContatoTipo[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContato(c)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors",
                    contato === c ? CONTATOS[c].cls : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {CONTATOS[c].label}
                </button>
              ))}
            </div>
          </Campo>

          {falou && (
            <>
              <Campo titulo="Por que não compra mais?">
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoTipo | "")}
                  className={ENTRADA}
                >
                  <option value="">Selecione…</option>
                  {(Object.keys(MOTIVOS) as MotivoTipo[]).map((m) => (
                    <option key={m} value={m}>{MOTIVOS[m]}</option>
                  ))}
                </select>
                {motivo && (
                  <input
                    value={motivoDetalhe}
                    onChange={(e) => setMotivoDetalhe(e.target.value)}
                    placeholder={motivo === "concorrente" ? "Qual concorrente e por quê?" : "Detalhe (opcional)"}
                    className={cn(ENTRADA, "mt-2")}
                  />
                )}
              </Campo>

              <Campo titulo="Tem interesse em voltar a comprar?">
                <div className="flex gap-2">
                  {(Object.keys(INTERESSES) as InteresseTipo[]).map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInteresse(interesse === i ? "" : i)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-colors",
                        interesse === i ? INTERESSES[i].cls : "border-border text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {INTERESSES[i].label}
                    </button>
                  ))}
                </div>
              </Campo>
            </>
          )}

          <Campo titulo="Próximo contato">
            <input
              type="date"
              value={proximoContato}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setProximoContato(e.target.value)}
              className={ENTRADA}
            />
            <p className="text-[9px] text-muted-foreground mt-1">
              Com data preenchida, entra como follow-up no calendário.
            </p>
          </Campo>

          <Campo titulo="Observação">
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="O que o cliente falou, o que ficou combinado…"
              className={ENTRADA}
            />
          </Campo>

          {erro && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-600 dark:text-red-400">
              {erro}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-border px-4 py-2 text-[10px] font-black uppercase tracking-wide hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!contato || salvando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[10px] font-black uppercase tracking-wide text-primary-foreground disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar prospecção
          </button>
        </div>
      </form>
    </div>
  );
}

const ENTRADA =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-medium outline-none focus:border-primary/60";

function Campo({ titulo, obrigatorio, children }: { titulo: string; obrigatorio?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
        {titulo}
        {obrigatorio && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
