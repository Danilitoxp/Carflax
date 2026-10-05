// Agenda de reposição: "toda segunda, ver o que comprar da curva A".
//
// O agendamento vive no Supabase (reposicao_agenda) e quem executa é o backend.
// No dia marcado ele monta uma proposta de pedido por fornecedor da curva e
// avisa Compras; o envio para a Citel é feito por uma pessoa, depois de conferir.

import { useCallback, useEffect, useState } from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Play,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Check,
  Clock,
  Package,
  CalendarDays,
  Sparkles,
} from "lucide-react";
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

const CURVA_CONFIG: Record<string, { badge: string; bgCard: string; cor: string; label: string }> = {
  A: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bgCard: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30",
    cor: "text-emerald-400",
    label: "Curva A (80%)",
  },
  B: {
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    bgCard: "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30",
    cor: "text-blue-400",
    label: "Curva B (15%)",
  },
  C: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    bgCard: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30",
    cor: "text-amber-400",
    label: "Curva C (5%)",
  },
};

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

/** Exibe os 5 dias da semana como pills gráficos na listagem */
function VisualizadorDias({ diasAtivos }: { diasAtivos: number[] }) {
  return (
    <div className="inline-flex items-center gap-1 bg-secondary/40 p-1 rounded-lg border border-border/50">
      {DIAS.map((d) => {
        const ativo = diasAtivos.includes(d.valor);
        return (
          <span
            key={d.valor}
            title={ativo ? `${d.label} (executa neste dia)` : `${d.label} (não executa)`}
            className={cn(
              "px-2 py-0.5 text-[10px] font-black uppercase rounded transition-all select-none",
              ativo
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/40"
                : "text-muted-foreground/30 opacity-40 hover:opacity-60"
            )}
          >
            {d.sigla}
          </span>
        );
      })}
    </div>
  );
}

export function AgendaReposicaoModal({
  usuario,
  onFechar,
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
        if (atuais.length <= 1) return atuais; // Mantém pelo menos um dia ativo
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
          : "Nada a repor nos fornecedores dessa curva agora."
      );
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao executar");
    } finally {
      setExecutandoId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[14px] font-black uppercase tracking-tight flex items-center gap-2 text-foreground">
                Agenda de Reposição Automática
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                O sistema monta as propostas de pedido nos dias programados e notifica Compras para conferência.
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo das Curvas de Fornecedores */}
        {curvas && (
          <div className="px-6 py-3 border-b border-border bg-secondary/15 flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {curvas.resumo.map((c) => {
                const cfg = CURVA_CONFIG[c.curva] || CURVA_CONFIG.A;
                return (
                  <div
                    key={c.curva}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl border bg-gradient-to-br flex items-center justify-between transition-all",
                      cfg.bgCard
                    )}
                  >
                    <div>
                      <span className={cn("text-[9px] font-black uppercase tracking-wider block", cfg.cor)}>
                        {cfg.label}
                      </span>
                      <span className="text-[13px] font-black text-foreground">
                        {c.fornecedores} fornecedores
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-foreground/90 bg-background/70 px-2 py-1 rounded-lg border border-border/60">
                      {brMoedaCompacta(c.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/75">
              Classificação dos últimos {curvas.meses} meses: Curva A = 80% do valor · Curva B = até 95% · Curva C = restante.
            </p>
          </div>
        )}

        {/* Lista de Agendamentos */}
        <div className="flex-1 overflow-auto scrollbar-hide p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Agendamentos Ativos ({agendas.length})
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              Clique em <strong>Editar</strong> para alterar dias ou horários
            </span>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] font-bold text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Carregando agendamentos…
            </div>
          ) : agendas.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-border bg-secondary/10">
              <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-[12px] font-bold text-foreground">Nenhum agendamento configurado</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Utilize o formulário abaixo para criar a primeira agenda por curva.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {agendas.map((a) => {
                const dias = obterDias(a);
                const emEdicao = editandoId === a.id;
                const cfg = CURVA_CONFIG[a.curva] || CURVA_CONFIG.A;

                return (
                  <div
                    key={a.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5",
                      emEdicao
                        ? "bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10"
                        : "bg-card border-border/80 hover:border-border hover:bg-secondary/25"
                    )}
                  >
                    <div className="flex flex-col gap-2 min-w-0">
                      {/* Título e Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-black text-foreground">{a.nome}</span>
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                            cfg.badge
                          )}
                        >
                          Curva {a.curva}
                        </span>
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                            a.ativo
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-border bg-secondary/40 text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              a.ativo ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                            )}
                          />
                          {a.ativo ? "ativo" : "pausado"}
                        </span>
                        {emEdicao && (
                          <span className="rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                            em edição
                          </span>
                        )}
                      </div>

                      {/* Informações detalhadas com os Dias em destaque */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <VisualizadorDias diasAtivos={dias} />
                        <span className="text-muted-foreground/30">·</span>
                        <span className="inline-flex items-center gap-1 font-bold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md border border-border/50">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          {a.hora ? a.hora.slice(0, 5) : "08:00"}
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          {a.meses_estoque ?? 3} {(a.meses_estoque ?? 3) === 1 ? "mês" : "meses"} de cobertura
                        </span>
                      </div>

                      {/* Status de execução e erro */}
                      {a.ultima_execucao && (
                        <span className="text-[10px] text-muted-foreground/75">
                          Último disparo: {new Date(a.ultima_execucao).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(a.ultima_execucao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {a.ultimo_erro && (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-2 py-0.5 w-fit">
                          Erro: {a.ultimo_erro}
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => executar(a)}
                        disabled={executandoId === a.id}
                        className={cn(BOTAO, "bg-secondary/40 hover:bg-blue-600 hover:text-white hover:border-blue-500")}
                        title="Gera as propostas agora manualmente"
                      >
                        {executandoId === a.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        Gerar agora
                      </button>
                      <button
                        type="button"
                        onClick={() => (emEdicao ? cancelarEdicao() : iniciarEdicao(a))}
                        className={cn(
                          BOTAO,
                          emEdicao
                            ? "border-blue-500 text-blue-400 bg-blue-500/15"
                            : "hover:border-blue-500 hover:text-blue-400"
                        )}
                        title={emEdicao ? "Cancelar edição" : "Editar agendamento"}
                      >
                        <Pencil className="w-3 h-3" />
                        {emEdicao ? "Editando" : "Editar"}
                      </button>
                      <button
                        onClick={() => alternar(a)}
                        className={BOTAO}
                        title={a.ativo ? "Pausar agendamento" : "Ativar agendamento"}
                      >
                        {a.ativo ? "Pausar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluir(a)}
                        className={cn(BOTAO, "text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/40")}
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {resultado && (
          <div className="mx-5 mb-2 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{resultado}</span>
          </div>
        )}
        {erro && (
          <div className="mx-5 mb-2 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2 text-[11px] font-bold text-rose-400">
            {erro}
          </div>
        )}

        {/* Formulário de Criação / Edição */}
        <form onSubmit={salvar} className="p-5 border-t border-border bg-secondary/10 flex flex-col gap-3.5">
          {/* Barra de Modo de Edição */}
          {editandoId ? (
            <div className="flex items-center justify-between bg-blue-500/15 px-3.5 py-2 rounded-xl border border-blue-500/30 text-[11px] text-blue-300">
              <span className="flex items-center gap-2 font-bold">
                <Pencil className="w-3.5 h-3.5 text-blue-400" />
                Editando agendamento: <strong className="text-white">{nome || "Sem nome"}</strong>
              </span>
              <button
                type="button"
                onClick={cancelarEdicao}
                className="text-[10px] font-bold text-blue-300 hover:text-white underline cursor-pointer"
              >
                Cancelar edição
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Novo agendamento de reposição</span>
            </div>
          )}

          {/* Linha 1: Nome, Curva, Hora e Cobertura */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <span className={ROTULO}>Nome da agenda</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={gerarNomeSugerido(curva, diasSelecionados)}
                className={ENTRADA}
              />
            </div>

            <div className="sm:col-span-2">
              <span className={ROTULO}>Curva</span>
              <select
                value={curva}
                onChange={(e) => setCurva(e.target.value as "A" | "B" | "C")}
                className={ENTRADA}
              >
                {CURVAS.map((c) => (
                  <option key={c} value={c} className="bg-card text-foreground">
                    Curva {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <span className={ROTULO}>Hora</span>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={ENTRADA}
              />
            </div>

            <div className="sm:col-span-3" title="Quantos meses de venda média o pedido deve cobrir.">
              <span className={ROTULO}>Cobertura</span>
              <select
                value={meses}
                onChange={(e) => setMeses(Number(e.target.value))}
                className={ENTRADA}
              >
                {MESES_COBERTURA.map((m) => (
                  <option key={m} value={m} className="bg-card text-foreground">
                    {m} {m === 1 ? "mês" : "meses"} de estoque
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Seletor Visual dos Dias da Semana */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={ROTULO}>Frequência semanal (dias de disparo)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiasSelecionados([1, 2, 3, 4, 5])}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Todos (Seg–Sex)
                </button>
                <span className="text-muted-foreground/30 text-[10px]">·</span>
                <button
                  type="button"
                  onClick={() => setDiasSelecionados([1, 3, 5])}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Seg, Qua, Sex
                </button>
                <span className="text-muted-foreground/30 text-[10px]">·</span>
                <button
                  type="button"
                  onClick={() => setDiasSelecionados([1])}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Só Segunda
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {DIAS.map((d) => {
                const ativo = diasSelecionados.includes(d.valor);
                return (
                  <button
                    key={d.valor}
                    type="button"
                    onClick={() => toggleDia(d.valor)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all select-none cursor-pointer",
                      ativo
                        ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30 scale-[1.02]"
                        : "bg-secondary/40 border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <span className="text-[13px] font-black tracking-tight">{d.sigla}</span>
                    <span
                      className={cn(
                        "text-[9px] font-medium tracking-wide mt-0.5",
                        ativo ? "text-blue-100" : "text-muted-foreground/70"
                      )}
                    >
                      {d.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumo dinâmico e Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                Dispara toda <strong className="text-foreground">{formatarDias(diasSelecionados)}</strong> às{" "}
                <strong className="text-foreground">{hora}</strong> para os fornecedores da{" "}
                <strong className="text-foreground">Curva {curva}</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {editandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3.5 py-2 text-[11px] font-bold text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[11px] font-bold text-white transition-all shadow-md disabled:opacity-50 cursor-pointer",
                  editandoId
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                )}
              >
                {salvando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : editandoId ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {editandoId ? "Salvar alterações" : "Agendar reposição"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const ENTRADA =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground outline-none focus:border-blue-500/80 transition-colors";
const ROTULO = "block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1";
const BOTAO =
  "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer";

