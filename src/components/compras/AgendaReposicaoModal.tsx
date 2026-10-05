// Agenda de reposição: "toda segunda, ver o que comprar da curva A".
//
// O agendamento vive no Supabase (reposicao_agenda) e quem executa é o backend.
// No dia marcado ele monta uma proposta de pedido por fornecedor da curva e
// avisa Compras; o envio para a Citel é feito por uma pessoa, depois de conferir.

import { useCallback, useEffect, useState } from "react";
import { X, Loader2, Plus, Trash2, Play, CalendarClock, CheckCircle2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { apiComprasCurvas, apiComprasExecutarAgenda, type CurvasResponse } from "@/lib/api";

const DIAS = [
  { valor: 1, label: "Segunda", sigla: "Seg" },
  { valor: 2, label: "Terça", sigla: "Ter" },
  { valor: 3, label: "Quarta", sigla: "Qua" },
  { valor: 4, label: "Quinta", sigla: "Qui" },
  { valor: 5, label: "Sexta", sigla: "Sex" },
];

const CURVAS = ["A", "B", "C"] as const;
// Cobertura da compra: quantos meses de venda média o pedido deve cobrir.
const MESES_COBERTURA = [1, 2, 3] as const;

export interface Agendamento {
  id: string;
  nome: string;
  dia_semana?: number;
  dias_semana?: number[] | null;
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

function obterDias(a: { dias_semana?: number[] | null; dia_semana?: number | null }): number[] {
  if (Array.isArray(a.dias_semana) && a.dias_semana.length > 0) {
    return a.dias_semana.slice().sort((x, y) => x - y);
  }
  if (a.dia_semana) {
    return [a.dia_semana];
  }
  return [1];
}

function formatarDias(dias: number[]): string {
  if (!dias.length) return "Nenhum dia";
  if (dias.length === 5) return "Segunda a Sexta";
  if (dias.length === 1) {
    return DIAS.find((d) => d.valor === dias[0])?.label || "Segunda";
  }
  return dias
    .slice()
    .sort((x, y) => x - y)
    .map((v) => DIAS.find((d) => d.valor === v)?.sigla || String(v))
    .join(", ");
}

function gerarNomeSugerido(curvaLetra: string, dias: number[]): string {
  if (!dias.length) return `Curva ${curvaLetra}`;
  if (dias.length === 5) return `Curva ${curvaLetra} — Seg a Sex`;
  if (dias.length === 1) {
    const nomeDia = DIAS.find((d) => d.valor === dias[0])?.label?.toLowerCase() || "segunda";
    return `Curva ${curvaLetra} — ${nomeDia}s`;
  }
  const siglas = dias
    .slice()
    .sort((x, y) => x - y)
    .map((v) => DIAS.find((d) => d.valor === v)?.sigla?.toLowerCase() || String(v))
    .join(", ");
  return `Curva ${curvaLetra} — ${siglas}`;
}

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
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1]);
  const [hora, setHora] = useState("08:00");
  const [curva, setCurva] = useState<"A" | "B" | "C">("A");
  const [meses, setMeses] = useState<number>(3);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

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

  function toggleDia(diaValor: number) {
    setDiasSelecionados((atuais) => {
      if (atuais.includes(diaValor)) {
        if (atuais.length <= 1) return atuais; // Mantém pelo menos um dia selecionado
        return atuais.filter((d) => d !== diaValor).sort((a, b) => a - b);
      }
      return [...atuais, diaValor].sort((a, b) => a - b);
    });
  }

  function iniciarEdicao(a: Agendamento) {
    setEditandoId(a.id);
    setNome(a.nome);
    setDiasSelecionados(obterDias(a));
    setHora(a.hora ? a.hora.slice(0, 5) : "08:00");
    setCurva(a.curva);
    setMeses(a.meses_estoque ?? 3);
    setErro(null);
    setResultado(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNome("");
    setDiasSelecionados([1]);
    setHora("08:00");
    setCurva("A");
    setMeses(3);
    setErro(null);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!diasSelecionados.length) {
      setErro("Selecione pelo menos um dia da semana.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setResultado(null);

    const nomeFinal = nome.trim() || gerarNomeSugerido(curva, diasSelecionados);
    const diasOrdenados = diasSelecionados.slice().sort((a, b) => a - b);
    const primeiroDia = diasOrdenados[0] || 1;

    if (editandoId) {
      const { error } = await supabase
        .from("reposicao_agenda")
        .update({
          nome: nomeFinal,
          dias_semana: diasOrdenados,
          dia_semana: primeiroDia,
          hora,
          curva,
          meses_estoque: meses,
        })
        .eq("id", editandoId);

      setSalvando(false);
      if (error) {
        setErro(error.message);
        return;
      }
      setResultado(`Agendamento "${nomeFinal}" atualizado com sucesso.`);
      cancelarEdicao();
      carregar();
    } else {
      const { error } = await supabase.from("reposicao_agenda").insert([{
        nome: nomeFinal,
        dias_semana: diasOrdenados,
        dia_semana: primeiroDia,
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
      setResultado(`Agendamento "${nomeFinal}" criado com sucesso.`);
      setNome("");
      carregar();
    }
  }

  async function alternar(a: Agendamento) {
    await supabase.from("reposicao_agenda").update({ ativo: !a.ativo }).eq("id", a.id);
    carregar();
  }

  async function excluir(a: Agendamento) {
    if (!confirm(`Excluir o agendamento "${a.nome}"?`)) return;
    if (editandoId === a.id) cancelarEdicao();
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
              {agendas.map((a) => {
                const dias = obterDias(a);
                const emEdicao = editandoId === a.id;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "px-5 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors",
                      emEdicao && "bg-blue-500/10 border-l-4 border-l-blue-500"
                    )}
                  >
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
                        {emEdicao && (
                          <span className="rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-px text-[9px] font-black uppercase">
                            em edição
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatarDias(dias)} às {a.hora ? a.hora.slice(0, 5) : "08:00"} · curva {a.curva}
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
                      <button
                        type="button"
                        onClick={() => (emEdicao ? cancelarEdicao() : iniciarEdicao(a))}
                        className={cn(
                          BOTAO,
                          emEdicao && "border-blue-500 text-blue-500 bg-blue-500/15"
                        )}
                        title={emEdicao ? "Cancelar edição" : "Editar agendamento"}
                      >
                        <Pencil className="w-3 h-3" />
                        {emEdicao ? "Editando" : "Editar"}
                      </button>
                      <button onClick={() => alternar(a)} className={BOTAO}>
                        {a.ativo ? "Pausar" : "Ativar"}
                      </button>
                      <button onClick={() => excluir(a)} className={cn(BOTAO, "text-rose-500")}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
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

        <form onSubmit={salvar} className="px-5 py-4 border-t border-border flex flex-col gap-3">
          {editandoId && (
            <div className="flex items-center justify-between bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 text-[11px] text-blue-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Pencil className="w-3.5 h-3.5" />
                Editando agendamento: <strong className="text-foreground">{nome || "Sem nome"}</strong>
              </span>
              <button
                type="button"
                onClick={cancelarEdicao}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Cancelar edição
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Nome */}
            <div className="sm:col-span-6">
              <span className={ROTULO}>Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={gerarNomeSugerido(curva, diasSelecionados)}
                className={ENTRADA}
              />
            </div>

            {/* Curva */}
            <div className="sm:col-span-2">
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
            </div>

            {/* Hora */}
            <div className="sm:col-span-2">
              <span className={ROTULO}>Hora</span>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={ENTRADA}
              />
            </div>

            {/* Cobertura */}
            <div className="sm:col-span-2" title="Quantos meses de venda média o pedido deve cobrir.">
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
            </div>
          </div>

          {/* Linha 2: Dias da semana e Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(ROTULO, "mb-0 mr-1")}>Dias:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-secondary/30 border border-border gap-1">
                {DIAS.map((d) => {
                  const ativo = diasSelecionados.includes(d.valor);
                  return (
                    <button
                      key={d.valor}
                      type="button"
                      onClick={() => toggleDia(d.valor)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer select-none",
                        ativo
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                      title={`${d.label} (clique para alternar)`}
                    >
                      {d.sigla}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (diasSelecionados.length === 5) {
                    setDiasSelecionados([1]);
                  } else {
                    setDiasSelecionados([1, 2, 3, 4, 5]);
                  }
                }}
                className="text-[9px] font-bold text-muted-foreground hover:text-blue-500 uppercase tracking-wider ml-1"
              >
                {diasSelecionados.length === 5 ? "Só Segunda" : "Seg–Sex"}
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {editandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold text-white transition-colors disabled:opacity-50",
                  editandoId
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
                )}
              >
                {salvando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : editandoId ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {editandoId ? "Salvar alterações" : "Agendar"}
              </button>
            </div>
          </div>
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
