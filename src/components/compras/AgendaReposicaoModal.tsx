// Agenda de reposição: "toda segunda, ver o que comprar da curva A".
//
// O agendamento vive no Supabase (reposicao_agenda) e quem executa é o backend.
// No dia marcado ele monta uma proposta de pedido por fornecedor da curva e
// avisa Compras; o envio para a Citel é feito por uma pessoa, depois de conferir.

import { useCallback, useEffect, useState } from "react";
import { X, Loader2, Plus, Trash2, Play, CalendarClock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { apiComprasCurvas, apiComprasExecutarAgenda, type CurvasResponse } from "@/lib/api";

const DIAS = [
  { valor: 1, label: "Segunda" },
  { valor: 2, label: "Terça" },
  { valor: 3, label: "Quarta" },
  { valor: 4, label: "Quinta" },
  { valor: 5, label: "Sexta" },
];

const CURVAS = ["A", "B", "C"] as const;
// Cobertura da compra: quantos meses de venda média o pedido deve cobrir.
const MESES_COBERTURA = [1, 2, 3] as const;

export interface Agendamento {
  id: string;
  nome: string;
  dia_semana: number;
  hora: string;
  curva: "A" | "B" | "C";
  /** Meses de cobertura usados ao gerar as propostas. Antigas vêm sem, e valem 3. */
  meses_estoque?: number | null;
  ativo: boolean;
  ultima_execucao: string | null;
  ultimo_erro: string | null;
}

const brMoedaCompacta = (n: number) =>
  n >= 1000000 ? `R$ ${(n / 1000000).toFixed(1)}M` : `R$ ${Math.round(n / 1000)}k`;

export function AgendaReposicaoModal({
  usuario, onFechar,
}: {
  usuario: { id?: string; nome?: string };
  onFechar: () => void;
}) {
  const [agendas, setAgendas] = useState<Agendamento[]>([]);
  const [curvas, setCurvas] = useState<CurvasResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [executandoId, setExecutandoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [dia, setDia] = useState(1);
  const [hora, setHora] = useState("08:00");
  const [curva, setCurva] = useState<"A" | "B" | "C">("A");
  const [meses, setMeses] = useState<number>(3);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("reposicao_agenda")
      .select("*")
      .order("dia_semana")
      .order("hora");
    if (error) setErro(error.message);
    else setAgendas((data || []) as Agendamento[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    apiComprasCurvas().then(setCurvas).catch(() => setCurvas(null));
  }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("reposicao_agenda").insert([{
      nome: nome.trim() || `Curva ${curva} — ${DIAS.find((d) => d.valor === dia)?.label}`,
      dia_semana: dia,
      hora,
      curva,
      meses_estoque: meses,
      criado_por: usuario.id ?? null,
      criado_por_nome: usuario.nome ?? null,
    }]);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setNome("");
    carregar();
  }

  async function alternar(a: Agendamento) {
    await supabase.from("reposicao_agenda").update({ ativo: !a.ativo }).eq("id", a.id);
    carregar();
  }

  async function excluir(a: Agendamento) {
    if (!confirm(`Excluir o agendamento "${a.nome}"?`)) return;
    await supabase.from("reposicao_agenda").delete().eq("id", a.id);
    carregar();
  }

  async function executar(a: Agendamento) {
    setExecutandoId(a.id);
    setResultado(null);
    setErro(null);
    try {
      const r = await apiComprasExecutarAgenda(a.id, a.meses_estoque ?? undefined);
      setResultado(
        r.propostas
          ? `${r.propostas} proposta(s) montada(s) com ${r.itens} item(ns). Confira antes de enviar ao ERP.`
          : "Nada a repor nos fornecedores dessa curva agora.",
      );
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao executar");
    } finally {
      setExecutandoId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-500" /> Agenda de reposição
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No dia marcado, o sistema monta um pedido por fornecedor da curva e avisa Compras.
              O envio para a Citel é feito por você, depois de conferir.
            </p>
          </div>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-secondary shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Curvas calculadas pelo valor comprado nos últimos 12 meses */}
        {curvas && (
          <div className="px-5 py-3 border-b border-border bg-secondary/20 flex flex-wrap gap-4">
            {curvas.resumo.map((c) => (
              <div key={c.curva}>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Curva {c.curva}
                </span>
                <span className="block text-[12px] font-black">
                  {c.fornecedores} fornecedores
                  <span className="ml-1.5 text-[10px] font-bold text-muted-foreground">
                    {brMoedaCompacta(c.valor)}
                  </span>
                </span>
              </div>
            ))}
            <p className="w-full text-[9px] text-muted-foreground">
              Classificação pelo valor comprado nos últimos {curvas.meses} meses: A soma 80% do valor, B até 95%.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto scrollbar-hide">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] font-bold text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : agendas.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-muted-foreground">
              Nenhum agendamento ainda. Crie o primeiro abaixo.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {agendas.map((a) => (
                <div key={a.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold">{a.nome}</span>
                      <span className={cn(
                        "rounded-md border px-1.5 py-px text-[9px] font-black uppercase",
                        a.ativo
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border text-muted-foreground",
                      )}>
                        {a.ativo ? "ativo" : "pausado"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {DIAS.find((d) => d.valor === a.dia_semana)?.label} às {a.hora.slice(0, 5)} · curva {a.curva}
                      {" · "}{a.meses_estoque ?? 3} {(a.meses_estoque ?? 3) === 1 ? "mês" : "meses"} de cobertura
                      {a.ultima_execucao
                        ? ` · último: ${new Date(a.ultima_execucao).toLocaleDateString("pt-BR")}`
                        : " · nunca executou"}
                    </span>
                    {a.ultimo_erro && (
                      <span className="block text-[10px] text-rose-500">Erro: {a.ultimo_erro}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => executar(a)} disabled={executandoId === a.id} className={BOTAO}>
                      {executandoId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Gerar agora
                    </button>
                    <button onClick={() => alternar(a)} className={BOTAO}>
                      {a.ativo ? "Pausar" : "Ativar"}
                    </button>
                    <button onClick={() => excluir(a)} className={cn(BOTAO, "text-rose-500")}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {resultado && (
          <p className="mx-5 mb-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> {resultado}
          </p>
        )}
        {erro && (
          <p className="mx-5 mb-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-500">{erro}</p>
        )}

        <form onSubmit={criar} className="px-5 py-4 border-t border-border flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[150px]">
            <span className={ROTULO}>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Curva A — segundas"
              className={ENTRADA}
            />
          </label>
          <label>
            <span className={ROTULO}>Dia</span>
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className={ENTRADA}>
              {DIAS.map((d) => (
                <option key={d.valor} value={d.valor} className="bg-card text-foreground">{d.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={ROTULO}>Hora</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={ENTRADA} />
          </label>
          <label>
            <span className={ROTULO}>Curva</span>
            <select
              value={curva}
              onChange={(e) => setCurva(e.target.value as "A" | "B" | "C")}
              className={ENTRADA}
            >
              {CURVAS.map((c) => (
                <option key={c} value={c} className="bg-card text-foreground">Curva {c}</option>
              ))}
            </select>
          </label>
          <label title="Quantos meses de venda média o pedido deve cobrir. Menos meses = compra mais curta.">
            <span className={ROTULO}>Cobertura</span>
            <select
              value={meses}
              onChange={(e) => setMeses(Number(e.target.value))}
              className={ENTRADA}
            >
              {MESES_COBERTURA.map((m) => (
                <option key={m} value={m} className="bg-card text-foreground">
                  {m} {m === 1 ? "mês" : "meses"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Agendar
          </button>
        </form>
      </div>
    </div>
  );
}

const ENTRADA =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-medium outline-none focus:border-blue-500/60";
const ROTULO = "block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1";
const BOTAO =
  "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold hover:bg-secondary disabled:opacity-50";
