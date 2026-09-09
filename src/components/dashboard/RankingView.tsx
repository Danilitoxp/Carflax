import { useState, useEffect, useRef, useCallback } from "react";
import { Crown, TrendingUp, TrendingDown, Minus, Flame, Volume2, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./ranking-animations.css";
import { BeamsBackground } from "@/components/ui/beams-background";
import { RANKING_COUNT_DURATION_MS, useAnimatedRanking } from "./use-animated-ranking";
import { RankingCelebration } from "./RankingCelebration";
import { createRankingEventTracker, type RankingSeller } from "./ranking-events";
import { useRankingCelebrations } from "./use-ranking-celebrations";
import { hasOvertake } from "./ranking-overtake";
import { useRankingMovement } from "./use-ranking-movement";
import {
  apiRankingDia,
  apiDashboardGeral,
  type RankingDiaRow,
  type VendedorResumo,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { buildAvatarResolver, type AvatarResolver } from "@/lib/avatar-by-code";
import { cn } from "@/lib/utils";
import { calcMetaDiaria } from "@/lib/dias-uteis";

/**
 * Ranking do dia — painel de parede.
 *
 * Feito para ficar aberto num telão, então NÃO mostra valor em real: só posição,
 * percentual da meta e evolução. O que a loja precisa enxergar de longe é quem
 * está na frente e quem está subindo, não quanto cada um faturou.
 *
 * "Meta diária" é o `DIARIO` do Dashboard Geral: o que falta da meta do mês
 * dividido pelos dias úteis restantes. Ela SOBE quando o vendedor atrasa e CAI
 * quando ele adianta — é o ritmo necessário hoje, a mesma conta do card
 * individual, para os dois números não se contradizerem.
 */

// 15s contra o endpoint enxuto (/ranking-dia), que tem cache de 15s no
// servidor. Cada ciclo cai numa entrada nova de cache, então a tela acompanha a
// venda quase ao vivo sem repetir consulta pesada no ERP.
const INTERVALO_MS = 15 * 1000;
type Linha = RankingSeller;

const num = (v: unknown) => (typeof v === "string" ? parseFloat(v) : Number(v)) || 0;

const diaIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** % da meta diária. Sem meta (já bateu o mês), quem vendeu conta como 100%. */
const percentualDaMeta = (vendido: number, meta: number) =>
  meta > 0 ? (vendido / meta) * 100 : vendido > 0 ? 100 : 0;

/** Percentual de cada vendedor num dia passado — base da variação. */
function percentuaisDoDia(resposta: VendedorResumo[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const r of resposta || []) {
    const cod = String(r.COD_VENDEDOR);
    if (cod === "MEDIA" || cod.startsWith("TEAM:")) continue;
    mapa.set(cod, percentualDaMeta(num(r.TOTAL_VENDIDO_HOJE), num(r.DIARIO)));
  }
  return mapa;
}

function Variacao({ v }: { v: number | null }) {
  if (v === null) return <span className="text-[10px] font-black text-white/30">—</span>;
  const zero = Math.abs(v) < 1;
  const Icone = zero ? Minus : v > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-black tabular-nums",
        zero ? "text-white/40" : v > 0 ? "text-emerald-400" : "text-rose-400",
      )}
    >
      <Icone className="w-3 h-3" />
      {zero ? "0%" : `${Math.abs(Math.round(v))}%`}
    </span>
  );
}

function MovementBadge({ change }: { change?: number }) {
  const Icon = change && change > 0 ? ArrowUp : ArrowDown;
  const label = change ? `${change > 0 ? "Subiu" : "Desceu"} ${Math.abs(change)} ${Math.abs(change) === 1 ? "posição" : "posições"}` : "";
  return <AnimatePresence>
    {!!change && <motion.span
      key={change > 0 ? "up" : "down"}
      initial={{ opacity: 0, y: change > 0 ? 6 : -6, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      title={label} aria-label={label}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-black tabular-nums",
        change > 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300")}>
      <Icon aria-hidden="true" className="h-3 w-3" />{Math.abs(change)}
    </motion.span>}
  </AnimatePresence>;
}

export function RankingView() {
  const [linhasRecebidas, setLinhas] = useState<Linha[]>([]);
  const linhas = useAnimatedRanking(linhasRecebidas);
  const { active, enqueue, close, clear, play } = useRankingCelebrations();
  const movements = useRankingMovement(linhas.map((row) => row.cod), !!active);
  const trackerRef = useRef(createRankingEventTracker());
  const dayRef = useRef("");
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);

  const resolverRef = useRef<AvatarResolver | null>(null);
  const ontemRef = useRef<Map<string, number>>(new Map());
  const rankingExibidoRef = useRef<Linha[]>([]);
  const ultrapassagemTocouRef = useRef(false);
  useEffect(() => {
    if (!active && !ultrapassagemTocouRef.current && hasOvertake(rankingExibidoRef.current, linhas)) {
      ultrapassagemTocouRef.current = true;
      play("overtake");
    }
    rankingExibidoRef.current = linhas;
  }, [linhas, active, play]);

  const carregar = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      if (!resolverRef.current) {
        const { data } = await supabase.from("usuarios").select("operator_code, avatar");
        resolverRef.current = buildAvatarResolver(data || []);
      }

      const linhasApi = await apiRankingDia();
      if (!mountedRef.current) return;
      const ontem = ontemRef.current;

      const lista = (linhasApi || [])
        .map((r: RankingDiaRow) => {
          const cod = String(r.COD_VENDEDOR);
          const vendidoHoje = num(r.VENDIDO_HOJE);
          // Mesma função do card do vendedor: desconta feriado e não conta hoje.
          const metaDiaria = calcMetaDiaria(num(r.FALTANTE));
          const percentual = percentualDaMeta(vendidoHoje, metaDiaria);
          const base = ontem.get(cod);
          return {
            cod,
            nome: r.NOME_VENDEDOR,
            vendidoHoje,
            metaDiaria,
            percentual,
            variacao: base === undefined ? null : percentual - base,
            avatar: resolverRef.current?.(cod),
          } as Linha;
        })
        .filter((l) => l.vendidoHoje > 0 || l.metaDiaria > 0)
        .sort((a, b) => b.percentual - a.percentual);

      const day = diaIso(new Date());
      if (dayRef.current !== day) {
        dayRef.current = day;
        clear();
        rankingExibidoRef.current = [];
      }
      const events = trackerRef.current(lista, day, Date.now() + RANKING_COUNT_DURATION_MS + 500);
      ultrapassagemTocouRef.current = events.some((event) => event.kind === "leader");
      setLinhas(lista.slice(0, 10));
      enqueue(events);
    } catch {
      /* mantém a lista anterior em caso de falha de rede */
    } finally {
      loadingRef.current = false;
    }
  }, [clear, enqueue]);

  // Ontem é base fixa da variação: buscar a cada ciclo era desperdício, o dia já
  // fechou. Uma vez na montagem basta.
  useEffect(() => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    apiDashboardGeral(undefined, diaIso(ontem))
      .then((r) => {
        ontemRef.current = percentuaisDoDia(r);
      })
      .catch(() => {
        /* sem ontem, a coluna de variação fica em "—" */
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => {
      clearInterval(id);
      mountedRef.current = false;
    };
  }, [carregar]);

  const podio = linhas.slice(0, 3);
  const resto = linhas.slice(3);
  // Ordem visual: 2º à esquerda, 1º ao centro (maior), 3º à direita.
  const ordemPodio = [podio[1], podio[0], podio[2]].filter(Boolean);

  return (
    <div className="ranking-screen h-screen w-full overflow-hidden bg-[#060b1a] text-white relative">
      <BeamsBackground className="absolute inset-0" intensity="strong" />
      <div className="group absolute right-2 top-2 z-20">
        <button
          type="button"
          aria-label="Opções de teste de som"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <Volume2 aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="invisible absolute right-0 top-full w-56 pt-2 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div role="group" aria-label="Testar sons do ranking" className="rounded-xl border border-white/15 bg-slate-950/95 p-2 shadow-xl">
            <button type="button" onClick={() => play("goal")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300">
              <Crown aria-hidden="true" className="h-4 w-4 text-amber-400" />
              Testar meta batida
            </button>
            <button type="button" onClick={() => play("overtake")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300">
              <TrendingUp aria-hidden="true" className="h-4 w-4 text-blue-400" />
              Testar ultrapassagem
            </button>
            {([['leader', '👑 Testar novo líder'], ['double', '🔥 Testar 200% da meta'], ['team', '🏆 Testar meta coletiva']] as const).map(([kind, label]) => (
              <button key={kind} type="button" onClick={() => play(kind)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10 focus-visible:bg-white/10">{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Sem cabeçalho: num telão o título ocupa altura e não informa nada que
          o pódio já não diga. A atualização segue automática a cada 15s. */}
      <div className="relative h-full flex flex-col p-6 gap-5">
        <div className="flex-1 min-h-0 flex flex-col gap-5">
            {/* Pódio */}
            <div className="grid grid-cols-3 gap-4 shrink-0 items-end">
              {ordemPodio.map((l) => {
                const pos = linhas.findIndex((x) => x.cod === l.cod) + 1;
                const primeiro = pos === 1;
                return (
                  <motion.div
                    key={l.cod}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: (pos - 1) * 0.1, layout: { duration: 0.45, delay: 0 } }}
                    className={cn(
                      "relative rounded-2xl border p-4 text-center overflow-hidden",
                      primeiro && "ranking-sphere-card",
                      primeiro
                        ? "ranking-leader bg-gradient-to-b from-amber-500/20 to-transparent border-amber-400/50 pb-6"
                        : pos === 2
                          ? "bg-gradient-to-b from-blue-500/15 to-transparent border-blue-400/40"
                          : "bg-gradient-to-b from-orange-600/15 to-transparent border-orange-500/40",
                    )}
                  >
                    {primeiro && (
                      <Crown className="ranking-crown w-7 h-7 text-amber-400 mx-auto mb-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                    )}
                    <span
                      className={cn(
                        "absolute top-3 left-4 flex items-center gap-1.5 text-2xl font-black",
                        primeiro ? "text-amber-400" : pos === 2 ? "text-blue-300" : "text-orange-400",
                      )}
                    >
                      {pos}
                      <MovementBadge change={movements[l.cod]} />
                    </span>

                    {l.avatar ? (
                      <img
                        src={l.avatar}
                        alt=""
                        className={cn(
                          "rounded-full object-cover mx-auto border-2",
                          primeiro ? "w-24 h-24 border-amber-400/60" : "w-16 h-16 border-white/20",
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          "rounded-full bg-white/10 mx-auto flex items-center justify-center font-black",
                          primeiro ? "w-24 h-24 text-2xl" : "w-16 h-16 text-lg",
                        )}
                      >
                        {l.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <p
                      className={cn(
                        "font-black uppercase leading-tight mt-3",
                        primeiro ? "text-base" : "text-[11px]",
                      )}
                    >
                      {l.nome}
                    </p>
                    <p
                      className={cn(
                        "font-black tabular-nums leading-none mt-2",
                        primeiro
                          ? "text-4xl text-amber-400"
                          : pos === 2
                            ? "text-2xl text-blue-300"
                            : "text-2xl text-orange-400",
                      )}
                    >
                      {l.percentual.toFixed(0)}%
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mt-0.5">
                      da meta
                    </p>

                    {primeiro && (
                      <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-amber-400 text-black text-[9px] font-black uppercase tracking-widest">
                        <Crown className="w-3 h-3" /> Líder do dia
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Lista do 4º ao 10º */}
            <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
              {/* A barra leva 2,5x a fatia do nome: com 200px fixos ela ficava
                  curta e sobrava um vazio enorme no meio da linha. */}
              <div className="grid grid-cols-[70px_minmax(180px,1fr)_minmax(0,2.5fr)_90px_80px] gap-3 px-4 py-2 border-b border-white/10 text-[8px] font-black uppercase tracking-widest text-white/35 shrink-0">
                <span>Posição</span>
                <span>Colaborador</span>
                <span>Progresso da meta</span>
                <span className="text-right">% da meta</span>
                <span className="text-right">Variação</span>
              </div>
              {/* flex-col + linhas flex-1: as 7 linhas dividem a altura que
                  sobra, em vez de ficarem no topo com um vazio embaixo. Num
                  telão isso é o que faz o texto ser legível de longe. */}
              <div className="flex-1 min-h-0 flex flex-col">
                {resto.map((l) => {
                  const pos = linhas.findIndex((x) => x.cod === l.cod) + 1;
                  const bateu = l.percentual >= 100;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: (pos - 1) * 0.07, layout: { duration: 0.45, delay: 0 } }}
                      key={l.cod}
                      className={cn(
                        "relative isolate overflow-hidden grid grid-cols-[70px_minmax(180px,1fr)_minmax(0,2.5fr)_90px_80px] gap-3 items-center px-4 border-b border-white/5 transition-colors flex-1 min-h-0",
                        bateu && "bg-emerald-400/[0.06]",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-lg font-black text-white/70">{pos}<MovementBadge change={movements[l.cod]} /></span>
                      <div className="flex items-center gap-2 min-w-0">
                        {l.avatar ? (
                          <img
                            src={l.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                            {l.nome.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] font-black uppercase truncate">{l.nome}</span>
                        {bateu && <Flame aria-label={l.percentual >= 200 ? "200% da meta" : "Meta batida"} className={cn("w-3 h-3 text-amber-400 shrink-0", l.percentual >= 200 && "ranking-crown")} />}
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            bateu ? "bg-emerald-400" : "bg-blue-500",
                          )}
                          style={{ width: `${Math.min(l.percentual, 100)}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-right text-sm font-black tabular-nums",
                          bateu ? "text-emerald-400" : "text-white/80",
                        )}
                      >
                        {l.percentual.toFixed(0)}%
                      </span>
                      <span className="text-right">
                        <Variacao v={l.variacao} />
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
        </div>
      </div>


      <AnimatePresence>
        {active && <RankingCelebration key={active.id} event={active} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}


