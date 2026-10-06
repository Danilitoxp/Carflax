import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RankingSeller } from "./ranking-events";

/**
 * Garagem do ranking — o que é compartilhado entre a pista (modo corrida) e o
 * modal 3D: paleta, peças, número/cor de cada carro e o estado de cada garagem.
 * Um único lugar decide o visual, então o carro da pista e o da garagem são o
 * mesmo carro.
 */

export const CORES: [string, string][] = [
  ["#ef4444", "#7f1d1d"], ["#3b82f6", "#1e3a8a"], ["#f59e0b", "#78350f"], ["#10b981", "#064e3b"],
  ["#a855f7", "#4c1d95"], ["#ec4899", "#831843"], ["#06b6d4", "#164e63"], ["#f97316", "#7c2d12"],
  ["#84cc16", "#365314"], ["#eab308", "#713f12"], ["#6366f1", "#312e81"], ["#14b8a6", "#134e4a"],
];
export const OURO: [string, string] = ["#fcd34d", "#a16207"];

/**
 * Peças compradas com créditos. Cor não está aqui: trocar de cor é grátis.
 *
 * Cada dia com a meta diária batida vale 1 ponto (gravado pelo RankingView).
 */
export const PECAS = [
  { id: "rodas", nome: "Rodas douradas", preco: 1, emoji: "🛞" },
  { id: "aerofolio", nome: "Aerofólio de corrida", preco: 3, emoji: "🪽" },
  { id: "neon", nome: "Neon por baixo", preco: 6, emoji: "💡" },
  { id: "turbo", nome: "Turbo com chamas", preco: 12, emoji: "🔥" },
  { id: "ouro", nome: "Kit ouro", preco: 24, emoji: "🏆" },
] as const;
export type PecaId = (typeof PECAS)[number]["id"];

export interface Garagem {
  pecas: Set<PecaId>;
  /** Índice em CORES escolhido pelo vendedor; sem escolha, usa a cor da faixa. */
  cor?: number;
}

/** Faixas da pista em ordem fixa (por nome) — define o número e a cor padrão. */
export const ordenarFaixas = (linhas: RankingSeller[]) => [...linhas].sort((a, b) => a.nome.localeCompare(b.nome));

/** Cores do carro: kit ouro > cor escolhida > cor da faixa. */
export function coresDoCarro(faixa: number, g?: Garagem): [string, string] {
  if (g?.pecas.has("ouro")) return OURO;
  return CORES[(g?.cor ?? faixa) % CORES.length];
}

/**
 * Garagens de todos os vendedores, ao vivo: compra de peça ou troca de cor em
 * qualquer tela chega na pista pelo realtime do Supabase, sem esperar o ciclo
 * de 15 s do ranking.
 */
export function useGaragens(): Map<string, Garagem> {
  const [mapa, setMapa] = useState<Map<string, Garagem>>(new Map());

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const [cp, vs] = await Promise.all([
        supabase.from("garagem_compras").select("vendedor_cod, peca_id"),
        supabase.from("garagem_visual").select("vendedor_cod, cor"),
      ]);
      if (!vivo) return;
      const m = new Map<string, Garagem>();
      const pegar = (cod: string) => {
        const c = cod.trim();
        if (!m.has(c)) m.set(c, { pecas: new Set() });
        return m.get(c)!;
      };
      for (const r of cp.data || []) pegar(r.vendedor_cod).pecas.add(r.peca_id as PecaId);
      for (const r of vs.data || []) pegar(r.vendedor_cod).cor = r.cor;
      setMapa(m);
    };
    carregar();
    const canal = supabase
      .channel(`garagem-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "garagem_compras" }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "garagem_visual" }, carregar)
      .subscribe((status) => {
        // Canal cai em silêncio: ao reconectar, relê tudo.
        if (status === "SUBSCRIBED") carregar();
      });
    // Rede de segurança caso o realtime caia sem avisar.
    const id = setInterval(carregar, 60 * 1000);
    return () => {
      vivo = false;
      clearInterval(id);
      supabase.removeChannel(canal);
    };
  }, []);

  return mapa;
}
