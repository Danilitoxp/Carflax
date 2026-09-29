// Projeto "Você de Casa Nova 2026" — Bônus Trimestral e Prêmio Semestral,
// mostrados DENTRO da janela do Prêmio Especial (abaixo do sorteio do mês).
//
// Regras (regulamento + combinado com a gestão):
//   - Mensal (a parte de cima da janela): ≥ 97% da meta do mês → sorteio.
//   - Trimestral: ≥ 100% da meta em CADA um dos 3 meses (não é a soma).
//     Sem sorteio: o vendedor ESCOLHE 1 dos 3 prêmios mensais do trimestre,
//     e todos veem o que cada um escolheu.
//   - Semestral (junho e dezembro): ≥ 100% da meta em CADA um dos 6 meses.
//
// Mês sem meta cadastrada conta como não batido. Contas de CAIXA ficam fora,
// como no sorteio mensal.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Gift, Check, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { EVENTO_ESCOLHA_TRIMESTRAL } from "@/hooks/usePremioTrimestralPendente";
import { resultadosPorMes, bateuTodos, garantiuTrimestre, CORTE_CASA_NOVA as CORTE, type ResultadoCasaNova } from "./casa-nova";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
// Prêmios semestrais do regulamento 2026.
const PREMIO_SEMESTRAL: Record<number, Record<1 | 2, string>> = {
  2026: { 1: "Micro-ondas", 2: 'Smart TV 32"' },
};

interface PremioMes {
  id: string;
  mes: number;
  ano: number;
  nome: string;
  imagem: string | null;
}

interface Escolha {
  id: string;
  vendedor_codigo: string;
  vendedor_nome: string | null;
  premio_id: string | null;
  premio_nome: string;
  escolhido_por_nome: string | null;
  escolhido_em: string;
}

type Resultado = ResultadoCasaNova;

export function CasaNovaSecao({
  mes,
  ano,
  userProfile,
  canManage,
}: {
  /** Mês selecionado na janela do Prêmio Especial: define trimestre e semestre. */
  mes: number;
  ano: number;
  userProfile?: { id?: string; name?: string; operator_code?: string };
  canManage: boolean;
}) {
  const trimestre = Math.floor((mes - 1) / 3) + 1;
  const semestre: 1 | 2 = mes <= 6 ? 1 : 2;
  const mesesTri = useMemo(() => [1, 2, 3].map((i) => (trimestre - 1) * 3 + i), [trimestre]);
  const mesesSem = useMemo(() => (semestre === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]), [semestre]);

  const [premios, setPremios] = useState<PremioMes[]>([]);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [escolhas, setEscolhas] = useState<Escolha[]>([]);
  const [avatares, setAvatares] = useState<Map<string, string>>(new Map());
  const [salvando, setSalvando] = useState<string | null>(null);
  // Líder escolhendo em nome de um vendedor qualificado (código dele).
  const [escolhendoPor, setEscolhendoPor] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const meuCodigo = userProfile?.operator_code ? String(userProfile.operator_code) : null;

  const carregar = useCallback(async () => {
    setResultados(null);
    setErro(null);
    const [{ data: pm }, { data: esc, error: errEsc }, { data: us }] = await Promise.all([
      supabase.from("premio_mes").select("id, mes, ano, nome, imagem").eq("ano", ano).in("mes", mesesTri).order("mes"),
      supabase.from("premio_trimestre_escolha").select("*").eq("ano", ano).eq("trimestre", trimestre),
      supabase.from("usuarios").select("operator_code, avatar"),
    ]);
    setPremios((pm || []) as PremioMes[]);
    setEscolhas((esc || []) as Escolha[]);
    if (errEsc) setErro("A tabela de escolhas ainda não existe no banco — aplique a migração premio_trimestre_escolha.");
    setAvatares(new Map((us || []).filter((u) => u.operator_code).map((u) => [String(u.operator_code), u.avatar])));
    // Os 6 meses do semestre já contêm os 3 do trimestre: uma busca serve aos dois.
    setResultados(await resultadosPorMes(mesesSem, ano));
  }, [ano, trimestre, mesesTri, mesesSem]);

  useEffect(() => {
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, [carregar]);

  const hoje = new Date();
  const triFechado = hoje >= new Date(ano, trimestre * 3, 1);
  const semFechado = hoje >= new Date(ano, semestre * 6, 1);

  const qualificadosTri = (resultados || []).filter((r) => bateuTodos(r, mesesTri, ano, hoje));
  const qualificadosSem = (resultados || []).filter((r) => bateuTodos(r, mesesSem, ano, hoje));

  async function escolher(v: Resultado, p: PremioMes) {
    setSalvando(v.cod);
    const { error } = await supabase.from("premio_trimestre_escolha").upsert(
      {
        ano,
        trimestre,
        vendedor_codigo: v.cod,
        vendedor_nome: v.nome,
        premio_id: String(p.id),
        premio_nome: p.nome,
        escolhido_por: userProfile?.id ?? null,
        escolhido_por_nome: userProfile?.name ?? null,
        escolhido_em: new Date().toISOString(),
      },
      { onConflict: "ano,trimestre,vendedor_codigo" },
    );
    setSalvando(null);
    setEscolhendoPor(null);
    if (error) {
      setErro(error.message);
      return;
    }
    window.dispatchEvent(new Event(EVENTO_ESCOLHA_TRIMESTRAL));
    carregar();
  }

  async function refazer(e: Escolha) {
    if (!window.confirm(`Apagar a escolha de ${e.vendedor_nome}? Ele poderá escolher de novo.`)) return;
    await supabase.from("premio_trimestre_escolha").delete().eq("id", e.id);
    window.dispatchEvent(new Event(EVENTO_ESCOLHA_TRIMESTRAL));
    carregar();
  }

  const Avatar = ({ cod, nome, redondo }: { cod: string; nome: string; redondo?: boolean }) => {
    const forma = redondo ? "w-7 h-7 rounded-full" : "w-9 h-9 rounded-xl";
    return avatares.get(cod) ? (
      <img src={avatares.get(cod)} alt={nome} className={cn(forma, "object-cover border border-border shrink-0")} />
    ) : (
      <div className={cn(forma, "bg-secondary flex items-center justify-center text-[9px] font-black text-muted-foreground shrink-0")}>
        {nome.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  /** Chips dos meses: verde = bateu 100%, vermelho = não bateu, amarelo = mês em andamento. */
  const ChipsMeses = ({ r, meses }: { r: Resultado; meses: number[] }) => (
    <div className="flex gap-1 flex-wrap">
      {meses.map((m) => {
        const pct = r.pctMes.get(m);
        const fechado = new Date(ano, m, 1) <= hoje;
        return (
          <span
            key={m}
            title={`${MESES[m - 1]}: ${pct == null ? "sem meta/resultado" : `${pct.toFixed(0)}%`}${fechado ? "" : " (parcial)"}`}
            className={cn(
              "px-1.5 text-center text-[9px] font-black py-0.5 rounded-md border",
              pct == null
                ? "text-muted-foreground border-border"
                : pct >= CORTE
                  ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                  : fechado
                    ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                    : "text-amber-600 bg-amber-500/10 border-amber-500/20",
            )}
          >
            {MESES[m - 1].slice(0, 3)} {pct == null ? "—" : `${pct.toFixed(0)}%`}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="px-6 pb-6 space-y-6">
      {erro && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-[11px] font-bold text-rose-500">{erro}</div>
      )}

      {/* ── TRIMESTRAL ── */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 text-amber-500" /> Bônus {trimestre}º Trimestre · {MESES[mesesTri[0] - 1].slice(0, 3)}–{MESES[mesesTri[2] - 1].slice(0, 3)}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Bateu 100% da meta em cada um dos 3 meses? Sem sorteio: escolha 1 dos 3 prêmios.
            </p>
          </div>
          {!triFechado && (
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              Parcial · meses fechados
            </span>
          )}
        </div>

        {(() => {
          const pendentes = qualificadosTri.filter((v) => !escolhas.some((e) => e.vendedor_codigo === v.cod));
          // Garantido = trimestre fechado, ou ≥ 100% nos 3 meses mesmo com o
          // último ainda correndo: pode escolher já. O resto segue na disputa.
          const garantido = (v: Resultado) => triFechado || garantiuTrimestre(v, trimestre);
          const aguardando = pendentes.filter(garantido);
          const naDisputa = pendentes.filter((v) => !garantido(v));
          const eu = aguardando.find((v) => v.cod === meuCodigo);
          // Quem vai escolher ao tocar num prêmio: o próprio vendedor, ou o
          // vendedor que o líder selecionou na fila de "aguardando".
          const escolhendo = eu ?? (canManage ? aguardando.find((v) => v.cod === escolhendoPor) : undefined);

          return (
            <>
              {escolhendo && (
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  {escolhendo.cod === meuCodigo ? "Toque no prêmio que você quer" : `Escolhendo por ${escolhendo.nome.split(" ")[0]}: toque no prêmio`}
                </p>
              )}

              {/* Os 3 prêmios: tocar escolhe; as fotos mostram quem já escolheu */}
              <div className="grid grid-cols-3 gap-2">
                {mesesTri.map((m) => {
                  const p = premios.find((x) => x.mes === m);
                  const quem = escolhas.filter((e) => p && e.premio_id === String(p.id));
                  const clicavel = !!(p && escolhendo);
                  return (
                    <div
                      key={m}
                      role={clicavel ? "button" : undefined}
                      onClick={() => {
                        if (p && escolhendo && salvando === null) escolher(escolhendo, p);
                      }}
                      className={cn(
                        "relative rounded-xl border bg-secondary/20 p-3 flex flex-col items-center text-center gap-1.5 transition-all",
                        clicavel && "cursor-pointer",
                        clicavel
                          ? "border-amber-500/60 hover:border-amber-500 hover:bg-amber-500/10 ring-1 ring-amber-500/30"
                          : "border-border",
                      )}
                    >
                      {p?.imagem ? (
                        <img src={p.imagem} alt={p.nome} className="w-12 h-12 object-contain" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2">{p?.nome ?? "Não cadastrado"}</p>

                      {quem.length > 0 && (
                        <div className="flex items-center -space-x-2 mt-0.5">
                          {quem.map((e) => (
                            <span
                              key={e.id}
                              role={canManage ? "button" : undefined}
                              onClick={(ev) => {
                                if (!canManage) return;
                                ev.stopPropagation();
                                refazer(e);
                              }}
                              title={`${e.vendedor_nome ?? e.vendedor_codigo} escolheu este prêmio${canManage ? " · clique para apagar" : ""}`}
                              className={cn("relative rounded-full ring-2 ring-card", canManage && "cursor-pointer hover:ring-rose-500")}
                            >
                              <Avatar cod={e.vendedor_codigo} nome={e.vendedor_nome ?? e.vendedor_codigo} redondo />
                              <Check className="absolute -bottom-0.5 -right-0.5 w-3 h-3 p-[1px] rounded-full bg-emerald-500 text-white" />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Qualificados que ainda não escolheram */}
              {resultados === null ? (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculando os meses do trimestre…
                </div>
              ) : qualificadosTri.length === 0 ? (
                <p className="text-[11px] font-bold text-muted-foreground">
                  Ninguém bateu 100% em todos os meses {triFechado ? "do trimestre." : "fechados do trimestre até agora."}
                </p>
              ) : pendentes.length > 0 ? (
                <div className="space-y-2">
                {[
                  { titulo: "Garantiu · aguardando escolha:", lista: aguardando, pode: true },
                  { titulo: "Na disputa (precisa fechar o mês com 100%):", lista: naDisputa, pode: false },
                ].filter((g) => g.lista.length > 0).map((g) => (
                <div key={g.titulo} className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {g.titulo}
                  </span>
                  {g.lista.map((v) => {
                    const selecionavel = g.pode && canManage && v.cod !== meuCodigo;
                    return (
                      <button
                        key={v.cod}
                        type="button"
                        disabled={!selecionavel}
                        onClick={() => setEscolhendoPor((atual) => (atual === v.cod ? null : v.cod))}
                        title={`${v.nome} · ${mesesTri.map((m) => `${MESES[m - 1].slice(0, 3)} ${v.pctMes.get(m)?.toFixed(0) ?? "—"}%`).join(" · ")}${selecionavel ? " · clique para escolher por ele" : ""}`}
                        className={cn(
                          "rounded-full ring-2 transition-all disabled:cursor-default",
                          escolhendoPor === v.cod ? "ring-amber-500" : "ring-transparent",
                          selecionavel && "hover:ring-amber-500/60",
                        )}
                      >
                        <Avatar cod={v.cod} nome={v.nome} redondo />
                      </button>
                    );
                  })}
                </div>
                ))}
                </div>
              ) : null}
            </>
          );
        })()}
      </section>

      {/* ── SEMESTRAL ── */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-500" /> Prêmio {semestre}º Semestre · {PREMIO_SEMESTRAL[ano]?.[semestre] ?? "a definir"}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Para quem bater 100% da meta em cada um dos 6 meses ({semestre === 1 ? "janeiro a junho" : "julho a dezembro"}).
            </p>
          </div>
          {!semFechado && (
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              Em andamento · meses fechados
            </span>
          )}
        </div>

        {resultados === null ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando os 6 meses…
          </div>
        ) : qualificadosSem.length === 0 ? (
          <p className="text-[11px] font-bold text-muted-foreground">
            Ninguém bateu 100% em todos os meses {semFechado ? "do semestre." : "fechados do semestre até agora."}
          </p>
        ) : (
          <div className="rounded-xl border border-border divide-y divide-border">
            {qualificadosSem.map((v) => (
              <div key={v.cod} className="px-3 py-2.5 flex items-center gap-3 flex-wrap">
                <Avatar cod={v.cod} nome={v.nome} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-tight truncate">{v.nome}</p>
                  <ChipsMeses r={v} meses={mesesSem} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
