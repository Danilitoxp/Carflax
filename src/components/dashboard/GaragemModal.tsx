import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Coins, Search, Sparkles, X as Fechar } from "lucide-react";
import { MiniaturaPeca } from "./MiniaturaPeca";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { RankingSeller } from "./ranking-events";
import { CORES, PECAS, CATEGORIAS, type CategoriaPeca, avisarGaragemAlterada, coresDoCarro, type Garagem, type PecaId, pecasDoCarro, equiparPeca, encaixePeca } from "./garagem";

const FILTROS = ["Todas", "Rodas", "Carroceria", "Desenhos", "Aerofólios", "Neons", "Piloto", "Turbos", "Especiais"] as const;
type FiltroPeca = CategoriaPeca | "Aerofólios" | "Neons";

const F1em3D = lazy(() => import("./F1em3D").then((m) => ({ default: m.F1em3D })));

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
  const [categoria, setCategoria] = useState<FiltroPeca>("Todas");
  const [busca, setBusca] = useState("");
  const [equipadasLocal, setEquipadasLocal] = useState<Set<PecaId> | null>(null);
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
      else {
        for (const outra of n) if (encaixePeca(outra) === encaixePeca(id)) n.delete(outra);
        n.add(id);
      }
      return n;
    });
  const equipadas = equipadasLocal ?? pecasDoCarro({ ...garagem, pecas });
  let noCarro = new Set(equipadas);
  for (const id of provando) noCarro = equiparPeca(noCarro, id);
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtradas = PECAS.filter((p) => p.categoria !== "Iluminação" && p.id !== "halo" && (categoria === "Todas" || (categoria === "Aerofólios" ? p.id === "aerofolio" || p.id.startsWith("asa-") : p.categoria === categoria)) && normalizar(`${p.nome} ${p.descricao}`).includes(normalizar(busca)));
  const grupos = CATEGORIAS.filter((c) => c !== "Todas").map((nome) => ({ nome, itens: filtradas.filter((p) => p.categoria === nome) })).filter((grupo) => grupo.itens.length > 0);
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

  const salvarEquipadas = async (novas: Set<PecaId>) => {
    const { error } = await supabase.from("garagem_visual").upsert({ vendedor_cod: cod, cor: corAtual, pecas_equipadas: [...novas], atualizado_em: new Date().toISOString() });
    if (error) {
      setErro("Não foi possível salvar as peças equipadas. Verifique a atualização da garagem e tente novamente.");
      return false;
    }
    setEquipadasLocal(novas);
    avisarGaragemAlterada();
    return true;
  };
  const alternarEquipada = async (id: PecaId) => {
    if (!podeComprar || ocupado) return;
    setOcupado(true);
    setErro("");
    const novas = equipadas.has(id) ? new Set([...equipadas].filter((p) => p !== id)) : equiparPeca(equipadas, id);
    const anteriores = equipadas;
    setEquipadasLocal(novas);
    setProvando(new Set());
    if (!await salvarEquipadas(novas)) setEquipadasLocal(anteriores);
    setOcupado(false);
  };

  const comprar = async (id: PecaId, preco: number) => {
    if (pecas.has(id) || !podeComprar || saldo === null || saldo < preco || ocupado) return;
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
    } else {
      await salvarEquipadas(equiparPeca(equipadas, id));
      avisarGaragemAlterada();
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label={`Garagem de ${vendedor.nome}`}
        aria-modal="true"
        className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b1020] text-white shadow-2xl md:flex-row"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20">
          <Fechar className="h-4 w-4" />
        </button>

        <div className="relative h-60 shrink-0 bg-[radial-gradient(ellipse_at_center,_#1c2944_0%,_#0b1020_70%)] sm:h-72 md:h-[min(780px,90vh)] md:flex-1">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-400">Preparando sua garagem…</div>}>
          <F1em3D
            visual={{ cor: corVis, escura: escuraVis, numero: faixa + 1, avatar: vendedor.avatar, iniciais: vendedor.nome.slice(0, 2).toUpperCase(), pecas: noCarro }}
          />
          </Suspense>
          {provando.size > 0 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-sky-950/90 px-4 py-1.5 text-xs font-bold text-sky-200">
              👀 Provando — ainda não comprado
              <button type="button" onClick={() => setProvando(new Set())} className="underline hover:text-white">
                tirar
              </button>
            </div>
          )}
          <div className="absolute left-5 top-4">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300"><Sparkles className="h-3 w-3" /> Carflax Customs · Garagem de</p>
            <p className="text-xl font-black uppercase">{vendedor.nome}</p>
            <p className="mt-2 text-xs text-slate-400">Carro #{faixa + 1} <span className="mx-2 text-white/20">/</span> {equipadas.size} peças equipadas</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-5 overflow-y-auto border-t border-white/10 p-4 pt-12 min-h-0 sm:p-5 sm:pt-12 md:w-[480px] md:max-h-[min(780px,90vh)] md:border-l md:border-t-0">
          <div className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-amber-100/80">Créditos disponíveis</p>
              {vendedor.percentual >= 100 && <p className="mt-1 text-[11px] text-emerald-300">+{Math.floor(vendedor.percentual / 100)} hoje</p>}
            </div>
            <span className="flex items-center gap-2 text-2xl font-black tabular-nums text-amber-300"><Coins className="h-5 w-5" />{saldo ?? "…"}</span>
          </div>

          {erro && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{erro}</p>}

          <div>
            <p className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
              Cor do carro <span className="text-emerald-300">grátis</span>
            </p>
            <div className={cn("grid grid-cols-6 gap-2", equipadas.has("ouro") && "opacity-40")}>
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
            {equipadas.has("ouro") && <p className="mt-1.5 text-[11px] text-white/40">O kit ouro cobre a pintura.</p>}
          </div>

          <div className="rounded-xl bg-white/5 p-3 text-xs text-white/60">
            <div className="flex justify-between"><span>Peças adquiridas</span><b className="text-emerald-300">{pecas.size} / {PECAS.length}</b></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400" style={{ width: `${pecas.size / PECAS.length * 100}%` }} /></div>

          </div>
          <div className="grid grid-cols-3 gap-2" aria-label="Categorias de peças">
            {FILTROS.map((c) => <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-bold transition", categoria === c ? "bg-amber-400 text-black" : "bg-white/5 text-white/60 hover:bg-white/10")}>{c === "Piloto" ? "Pilotos" : c}</button>)}
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-400">
            <Search className="h-4 w-4" />
            <input aria-label="Buscar peças" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar peça..." className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" />
          </label>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400"><span>{categoria === "Todas" ? "Catálogo de peças" : categoria}</span><span>{filtradas.length} opções</span></div>
          <div className="space-y-6">
          {grupos.map((grupo) => (
            <section key={grupo.nome} aria-label={grupo.nome}>
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-bold text-white">{categoria === "Aerofólios" || categoria === "Neons" ? categoria : grupo.nome === "Iluminação" ? "Neons" : grupo.nome === "Piloto" ? "Pilotos e cockpit" : grupo.nome}</h3>
                <span className="text-xs text-slate-500">{grupo.itens.length} peças</span>
              </div>
              <ul className="grid grid-cols-2 gap-3">
            {grupo.itens.map((p) => {
              const ok = pecas.has(p.id);
              const daPraComprar = podeComprar && saldo !== null && !ok && saldo >= p.preco;
              const instalada = equipadas.has(p.id);
              const provandoEsta = !ok && provando.has(p.id);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "group flex flex-col gap-3 rounded-xl border p-3 transition hover:border-white/30",
                    instalada ? "border-emerald-400/40 bg-emerald-400/[0.07]" : provandoEsta ? "border-sky-400/60 bg-sky-400/10" : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <button
                    type="button"
                    disabled={ok && !podeComprar || ocupado}
                    onClick={() => ok ? alternarEquipada(p.id) : alternarProva(p.id)}
                    aria-pressed={provandoEsta}
                    title={ok ? instalada ? "Remover do carro" : "Equipar no carro" : "Clique para ver no carro"}
                    className="flex min-w-0 flex-1 flex-col gap-3 text-left disabled:cursor-default"
                  >
                    <MiniaturaPeca id={p.id} cor={corVis} emoji={p.emoji} />
                    <span className="w-full flex-1 text-xs font-bold">
                      {p.nome}
                      <span className="mt-0.5 block text-[10px] font-normal text-white/50">{p.descricao}</span>
                      {provandoEsta && <span className="ml-1.5 text-[10px] font-black uppercase text-sky-300">provando</span>}
                    </span>
                  </button>
                  {ok ? (
                    <button type="button" disabled={!podeComprar || ocupado} onClick={() => alternarEquipada(p.id)} className={cn("flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold", instalada ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-slate-300")}><Check className="h-3 w-3" />{instalada ? "Equipada · remover" : "Adquirida · equipar"}</button>
                  ) : podeComprar ? (
                    <button
                      type="button"
                      disabled={!daPraComprar || ocupado}
                      onClick={() => comprar(p.id, p.preco)}
                      aria-label={`Comprar ${p.nome} por ${p.preco} créditos`}
                      title={saldo === null ? "Carregando saldo" : saldo < p.preco ? `Faltam ${p.preco - saldo} créditos` : "Comprar peça"}
                      className="flex items-center justify-center gap-1 rounded-lg bg-amber-400 px-2 py-2 text-[11px] font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                    >
                      <Coins className="h-3 w-3" />
                      {p.preco} créditos
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
            </section>
          ))}
          </div>
          {filtradas.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Nenhuma peça encontrada. Tente outro nome.</p>}
          {!podeComprar && <p className="text-center text-[11px] text-white/40">Só o dono do carro pode mexer na garagem.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
