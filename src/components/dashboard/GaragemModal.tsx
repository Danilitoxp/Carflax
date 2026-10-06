import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { F1em3D } from "./F1em3D";
import { Check, Coins, X as Fechar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { RankingSeller } from "./ranking-events";
import { CORES, PECAS, avisarGaragemAlterada, coresDoCarro, type Garagem, type PecaId } from "./garagem";

/**
 * Garagem do vendedor — o MESMO carro de F1 da pista do modo corrida (cor,
 * número e foto no cockpit), em 3D girando. As peças são compradas com
 * PONTOS: cada dia com a meta diária batida vale 1 (o RankingView grava em
 * garagem_creditos). O saldo acumula. Trocar de cor é grátis (garagem_visual).
 *
 * Compra e cor gravam no Supabase; a pista recebe pelo realtime (useGaragens)
 * e troca o visual do carro na hora.
 */

export function GaragemModal({
  vendedor,
  faixa,
  garagem,
  podeComprar,
  onClose,
}: {
  vendedor: RankingSeller;
  /** Índice da faixa na pista: número do carro (faixa + 1) e cor padrão. */
  faixa: number;
  garagem?: Garagem;
  podeComprar: boolean;
  onClose: () => void;
}) {
  const cod = vendedor.cod.trim();
  const [ganhos, setGanhos] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // Otimista: a peça/cor aparece na hora; o realtime confirma logo depois.
  const [pendentes, setPendentes] = useState<{ pecas: PecaId[]; cor?: number }>({ pecas: [] });

  const pecas = new Set<PecaId>([...(garagem?.pecas || []), ...pendentes.pecas]);
  // Provador: peças clicadas aparecem só no 3D, sem gastar crédito nem ir pra pista.
  const [provando, setProvando] = useState<Set<PecaId>>(new Set());
  const alternarProva = (id: PecaId) =>
    setProvando((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const noCarro = new Set<PecaId>([...pecas, ...provando]);
  const [corVis, escuraVis] = coresDoCarro(faixa, { pecas: noCarro, cor: pendentes.cor ?? garagem?.cor });
  const g: Garagem = { pecas, cor: pendentes.cor ?? garagem?.cor };
  const corAtual = g.cor ?? faixa % CORES.length;

  const carregarCreditos = useCallback(async () => {
    // Só conta os dias (mes_ref 'YYYY-MM-DD'). As linhas de mês ('YYYY-MM'),
    // da regra antiga, ficam no banco mas não valem mais.
    const { data, error } = await supabase.from("garagem_creditos").select("mes_ref, creditos").eq("vendedor_cod", cod);
    if (error) return null;
    const dias = (data || []).filter((r) => String(r.mes_ref).length === 10);
    return { total: dias.reduce((s, r) => s + (r.creditos || 0), 0), dias: dias.length };
  }, [cod]);

  useEffect(() => {
    let vivo = true;
    const ler = () =>
      carregarCreditos().then((r) => {
        if (!vivo) return;
        if (r === null) setErro("Garagem indisponível: as tabelas de créditos ainda não foram criadas.");
        else setGanhos(r.total);
      });
    ler();
    // Bateu a meta com o modal aberto: o ponto aparece sem fechar.
    const id = setInterval(ler, 30 * 1000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [carregarCreditos]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const gastos = PECAS.filter((p) => pecas.has(p.id)).reduce((s, p) => s + p.preco, 0);
  const saldo = ganhos === null ? null : Math.max(0, ganhos - gastos);

  const comprar = async (id: PecaId, preco: number) => {
    if (!podeComprar || saldo === null || saldo < preco || ocupado) return;
    setOcupado(true);
    setErro("");
    setPendentes((p) => ({ ...p, pecas: [...p.pecas, id] }));
    setProvando((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    const { error } = await supabase.from("garagem_compras").insert({ vendedor_cod: cod, peca_id: id, preco });
    if (error) {
      setErro("Não foi possível comprar a peça. Tente de novo.");
      setPendentes((p) => ({ ...p, pecas: p.pecas.filter((x) => x !== id) }));
    } else avisarGaragemAlterada();
    setOcupado(false);
  };

  const trocarCor = async (indice: number) => {
    if (!podeComprar || indice === corAtual) return;
    setErro("");
    setPendentes((p) => ({ ...p, cor: indice }));
    const { error } = await supabase
      .from("garagem_visual")
      .upsert({ vendedor_cod: cod, cor: indice, atualizado_em: new Date().toISOString() });
    if (error) {
      setErro("Não foi possível trocar a cor.");
      setPendentes((p) => ({ ...p, cor: undefined }));
    } else avisarGaragemAlterada();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label={`Garagem de ${vendedor.nome}`}
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b1226] text-white shadow-2xl md:flex-row"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20">
          <Fechar className="h-4 w-4" />
        </button>

        <div className="relative h-72 md:h-[480px] md:flex-1">
          <F1em3D
            visual={{ cor: corVis, escura: escuraVis, numero: faixa + 1, avatar: vendedor.avatar, iniciais: vendedor.nome.slice(0, 2).toUpperCase(), pecas: noCarro }}
          />
          {provando.size > 0 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-sky-950/90 px-4 py-1.5 text-xs font-bold text-sky-200">
              👀 Provando — ainda não comprado
              <button type="button" onClick={() => setProvando(new Set())} className="underline hover:text-white">
                tirar
              </button>
            </div>
          )}
          <div className="absolute left-5 top-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Garagem de</p>
            <p className="text-xl font-black uppercase">{vendedor.nome}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 overflow-y-auto border-t border-white/10 p-5 md:w-80 md:border-l md:border-t-0">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-200/80">Saldo de créditos</span>
              <span className="flex items-center gap-1.5 text-2xl font-black tabular-nums text-amber-300">
                <Coins className="h-5 w-5" />
                {saldo ?? "…"}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              🎯 Bateu a meta diária, ganhou <b className="text-amber-300">1 ponto</b>. Os pontos acumulam para turbinar o carro.
              {vendedor.percentual >= 100 && <span className="mt-1 block font-bold text-emerald-300">✅ Meta de hoje batida: +1 ponto!</span>}
            </p>
          </div>

          {erro && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{erro}</p>}

          <div>
            <p className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
              Cor do carro <span className="text-emerald-300">grátis</span>
            </p>
            <div className={cn("grid grid-cols-6 gap-2", pecas.has("ouro") && "opacity-40")}>
              {CORES.map(([c, e], i) => (
                <button
                  key={c}
                  type="button"
                  disabled={!podeComprar}
                  onClick={() => trocarCor(i)}
                  aria-label={`Cor ${i + 1}`}
                  aria-pressed={i === corAtual}
                  className={cn(
                    "h-8 rounded-lg border-2 transition disabled:cursor-default",
                    i === corAtual ? "border-white scale-110" : "border-transparent hover:scale-105",
                  )}
                  style={{ background: `linear-gradient(180deg, ${c} 55%, ${e})` }}
                />
              ))}
            </div>
            {pecas.has("ouro") && <p className="mt-1.5 text-[11px] text-white/40">O kit ouro cobre a pintura.</p>}
          </div>

          <ul className="flex flex-col gap-2">
            {PECAS.map((p) => {
              const ok = pecas.has(p.id);
              const daPraComprar = podeComprar && saldo !== null && !ok && saldo >= p.preco;
              const provandoEsta = !ok && provando.has(p.id);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2",
                    ok ? "border-emerald-400/40 bg-emerald-400/10" : provandoEsta ? "border-sky-400/60 bg-sky-400/10" : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <button
                    type="button"
                    disabled={ok}
                    onClick={() => alternarProva(p.id)}
                    aria-pressed={provandoEsta}
                    title={ok ? "Instalada" : "Clique para ver no carro"}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                  >
                    <span className="text-lg">{p.emoji}</span>
                    <span className="flex-1 text-sm font-bold">
                      {p.nome}
                      {provandoEsta && <span className="ml-1.5 text-[10px] font-black uppercase text-sky-300">provando</span>}
                    </span>
                  </button>
                  {ok ? (
                    <Check className="h-4 w-4 text-emerald-400" aria-label="Instalada" />
                  ) : podeComprar ? (
                    <button
                      type="button"
                      disabled={!daPraComprar || ocupado}
                      onClick={() => comprar(p.id, p.preco)}
                      className="flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 text-[11px] font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                    >
                      <Coins className="h-3 w-3" />
                      {p.preco}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-black tabular-nums text-white/50">
                      <Coins className="h-3 w-3" />
                      {p.preco}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {!podeComprar && <p className="text-center text-[11px] text-white/40">Só o dono do carro pode mexer na garagem.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
