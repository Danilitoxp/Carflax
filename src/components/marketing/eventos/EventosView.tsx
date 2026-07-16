import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Clock, Users, ChevronLeft, PartyPopper, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { FornecedoresTab } from "./FornecedoresTab";
import { ConvidadosTab } from "./ConvidadosTab";
import {
  type Evento, type EventoFornecedor, type EventoConvidado,
  fetchEventos, fetchFornecedores, fetchConvidados,
  formatDate, formatHora, diasAte, formatBRL, mensagemErro,
} from "./types";

type Aba = "fornecedores" | "convidados";

const ABAS: { k: Aba; label: string }[] = [
  { k: "fornecedores", label: "Fornecedores" },
  { k: "convidados", label: "Convidados / RSVP" },
];

// Mesma paleta dos badges de status da tela de Campanhas.
const STATUS_COLOR: Record<Evento["status"], string> = {
  planejamento: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  confirmado: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  realizado: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
  cancelado: "bg-secondary/40 text-muted-foreground border-border opacity-50",
};

export function EventosView() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selecionado, setSelecionado] = useState<Evento | null>(null);
  const [aba, setAba] = useState<Aba>("fornecedores");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [fornecedores, setFornecedores] = useState<EventoFornecedor[]>([]);
  const [convidados, setConvidados] = useState<EventoConvidado[]>([]);

  const carregarEventos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      setEventos(await fetchEventos());
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarDetalhe = useCallback(async (eventoId: string) => {
    setErro(null);
    try {
      const [f, c] = await Promise.all([
        fetchFornecedores(eventoId),
        fetchConvidados(eventoId),
      ]);
      setFornecedores(f); setConvidados(c);
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }, []);

  useEffect(() => { carregarEventos(); }, [carregarEventos]);

  useEffect(() => {
    if (selecionado) carregarDetalhe(selecionado.id);
  }, [selecionado, carregarDetalhe]);

  const recarregar = useCallback(() => {
    if (selecionado) carregarDetalhe(selecionado.id);
  }, [selecionado, carregarDetalhe]);

  // Atualiza o evento em si (hoje: brindes do kit). Reflete na hora no card
  // selecionado e na lista, para não precisar recarregar a tela inteira.
  const salvarBrindes = useCallback(async (campos: Partial<Evento>) => {
    if (!selecionado) return;
    const { data, error } = await supabase
      .from("eventos")
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq("id", selecionado.id)
      .select()
      .single();
    if (error) { setErro(mensagemErro(error)); return; }
    const atualizado = data as Evento;
    setSelecionado(atualizado);
    setEventos(prev => prev.map(e => (e.id === atualizado.id ? atualizado : e)));
  }, [selecionado]);

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-background h-full">
        <div className="animate-pulse space-y-4 max-w-5xl">
          <div className="h-8 w-64 bg-secondary rounded-lg" />
          <div className="h-32 w-full bg-secondary/50 rounded-xl" />
          <div className="h-64 w-full bg-secondary/30 rounded-xl" />
        </div>
      </div>
    );
  }

  if (erro && !selecionado) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background h-full">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">Não foi possível carregar</h2>
          <p className="text-xs font-bold text-muted-foreground mb-4">{erro}</p>
          <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
            Se a mensagem fala em tabela inexistente, as migrations de eventos ainda não foram aplicadas no banco.
          </p>
        </div>
      </div>
    );
  }

  // ── Lista de eventos ──────────────────────────────────────────────────────
  // Mesma linguagem visual da tela de Campanhas: header em caixa e grid de
  // cards 4/5 — um card por evento.
  if (!selecionado) {
    return (
      <div className="h-full flex flex-col pt-4 px-3 sm:px-6 pb-2 overflow-hidden bg-background">
        <style>{`
          @keyframes border-trace {
            0%, 100% { clip-path: inset(0 0 98% 0); }
            25%  { clip-path: inset(0 0 0 98%); }
            50%  { clip-path: inset(98% 0 0 0); }
            75%  { clip-path: inset(0 98% 0 0); }
          }
          .animate-border-trace { animation: border-trace 4s linear infinite; }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0 bg-secondary/20 p-4 rounded-3xl border border-border/40">
          <div>
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Eventos</h2>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-70">
              Fornecedores, Convidados e Execução
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
          {eventos.length === 0 ? (
            <div className="bg-card border border-border rounded-[32px] py-16 text-center">
              <PartyPopper className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nenhum evento cadastrado</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-6">
              {eventos.map(ev => {
                const dias = diasAte(ev.data_evento);
                // Borda animada só no evento que ainda vai acontecer e não foi
                // cancelado — é o que merece atenção no meio da grade.
                const emDestaque = dias >= 0 && ev.status !== "cancelado";
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelecionado(ev)}
                    className={cn(
                      "aspect-[4/5] rounded-[32px] p-6 flex flex-col transition-all duration-500 cursor-pointer group relative overflow-hidden backdrop-blur-md hover:scale-[1.02]",
                      emDestaque
                        ? "border border-blue-500/30 bg-card/60 shadow-2xl shadow-blue-600/10 hover:shadow-blue-500/20"
                        : "border border-border/40 bg-card/40 shadow-lg hover:shadow-2xl hover:border-blue-500/30"
                    )}
                  >
                    {emDestaque && (
                      <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute inset-0 border-2 border-blue-500 rounded-[32px] animate-border-trace opacity-40 shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-blue-600/5 to-transparent" />
                      </div>
                    )}

                    {/* Contador no topo, como o "Ver Ranking" das campanhas */}
                    <div className="relative z-10 flex justify-end mb-2">
                      {dias >= 0 && (
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.15em] opacity-80">
                          {dias === 0 ? "É hoje!" : `Faltam ${dias} dias`}
                        </span>
                      )}
                    </div>

                    {/* Bloco visual */}
                    <div className="flex-1 bg-secondary/30 rounded-[24px] p-4 flex flex-col items-center justify-center border border-border/20 mb-4 transition-all group-hover:bg-blue-500/5 group-hover:rotate-1 relative overflow-hidden group-hover:border-blue-500/20 z-10">
                      <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-2xl shadow-blue-600/40 group-hover:scale-110 transition-all duration-700 group-hover:rotate-6 mb-2">
                        <PartyPopper className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-2xl font-black text-foreground tracking-tighter leading-none">
                        {formatDate(ev.data_evento).slice(0, 5)}
                      </span>
                      {ev.hora_inicio && (
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          {formatHora(ev.hora_inicio)} às {formatHora(ev.hora_fim)}
                        </span>
                      )}
                    </div>

                    {/* Identificação */}
                    <div className="space-y-2 relative z-10">
                      <h3 className="text-[11px] font-black text-foreground truncate uppercase tracking-tight group-hover:text-blue-500 transition-colors">
                        {ev.nome}
                      </h3>
                      {ev.local && (
                        <p className="text-[9px] font-bold text-muted-foreground tracking-widest leading-none border-l-2 border-blue-500/30 pl-2 truncate">
                          {ev.local}
                        </p>
                      )}
                      <div className="pt-1">
                        <span className={cn("inline-flex px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all", STATUS_COLOR[ev.status])}>
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Detalhe do evento ─────────────────────────────────────────────────────
  const dias = diasAte(selecionado.data_evento);
  const confirmados = convidados.filter(c => c.status === "confirmado").length;
  const verbaConfirmada = fornecedores
    .filter(f => f.status === "confirmado")
    .reduce((a, f) => a + Number(f.cota_valor || 0), 0);
  const pctBrindes = selecionado.brindes_meta > 0
    ? (selecionado.brindes_recebidos / selecionado.brindes_meta) * 100
    : 0;

  return (
    <div className="flex-1 p-6 lg:p-8 bg-background h-full overflow-y-auto">
      <button
        onClick={() => setSelecionado(null)}
        className="flex items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-widest mb-4 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Todos os eventos
      </button>

      {/* Cabeçalho */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", STATUS_COLOR[selecionado.status])}>
                {selecionado.status}
              </span>
              {dias >= 0 && (
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  {dias === 0 ? "É hoje!" : `Faltam ${dias} dias`}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">{selecionado.nome}</h1>
            {selecionado.subtitulo && (
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{selecionado.subtitulo}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold text-muted-foreground">
              <div className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> {formatDate(selecionado.data_evento)}</div>
              {selecionado.hora_inicio && <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {formatHora(selecionado.hora_inicio)} às {formatHora(selecionado.hora_fim)}</div>}
              {selecionado.local && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {selecionado.local}</div>}
              <div className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Meta: {selecionado.publico_meta_min}–{selecionado.publico_meta_max} presentes</div>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-right">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Verba</span>
              <p className="text-lg font-black text-foreground tracking-tighter">{formatBRL(verbaConfirmada)}</p>
              <span className="text-[9px] font-bold text-muted-foreground">de {formatBRL(selecionado.verba_meta)}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Confirmados</span>
              <p className="text-lg font-black text-emerald-600 tracking-tighter">{confirmados}</p>
              <span className="text-[9px] font-bold text-muted-foreground">de {convidados.length} convidados</span>
            </div>

            {/* Kit Instalador: controle único do evento */}
            <div className="text-right">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Kit Instalador</span>
              <div className="flex items-center gap-1 justify-end">
                <input
                  type="number"
                  min={0}
                  defaultValue={selecionado.brindes_recebidos}
                  onBlur={e => salvarBrindes({ brindes_recebidos: Math.max(0, parseInt(e.target.value) || 0) })}
                  title="Brindes já recebidos"
                  className="w-16 px-2 py-0.5 text-lg font-black text-foreground tracking-tighter bg-transparent border border-border rounded-md text-right focus:outline-none focus:border-blue-500"
                />
                <span className="text-sm font-black text-muted-foreground">/</span>
                <input
                  type="number"
                  min={0}
                  defaultValue={selecionado.brindes_meta}
                  onBlur={e => salvarBrindes({ brindes_meta: Math.max(0, parseInt(e.target.value) || 0) })}
                  title="Meta de brindes para o kit"
                  className="w-16 px-2 py-0.5 text-lg font-black text-muted-foreground tracking-tighter bg-transparent border border-border rounded-md text-right focus:outline-none focus:border-blue-500"
                />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground">recebidos / meta</span>
            </div>
          </div>
        </div>

        {/* Progresso do kit */}
        {selecionado.brindes_meta > 0 && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
              <span className="text-blue-600 dark:text-blue-500 uppercase tracking-widest">Brindes do Kit Instalador</span>
              <span className="text-foreground">{pctBrindes.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary dark:bg-slate-800 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(pctBrindes, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {ABAS.map(a => (
          <button
            key={a.k}
            onClick={() => setAba(a.k)}
            className={cn(
              "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all",
              aba === a.k
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground bg-secondary/30"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {erro && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-3 mb-4">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{erro}</span>
        </div>
      )}

      {aba === "fornecedores" && <FornecedoresTab evento={selecionado} fornecedores={fornecedores} onChange={recarregar} />}
      {aba === "convidados" && <ConvidadosTab evento={selecionado} convidados={convidados} onChange={recarregar} />}
    </div>
  );
}
