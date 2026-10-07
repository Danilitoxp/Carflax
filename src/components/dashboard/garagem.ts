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
 * Cada 100% da meta diária vale 1 ponto no dia — 200% = 2 (gravado pelo RankingView).
 */
export const CATEGORIAS = ["Todas", "Rodas", "Carroceria", "Aerodinâmica", "Iluminação", "Piloto", "Especiais"] as const;
export type CategoriaPeca = (typeof CATEGORIAS)[number];
export const RODAS = [
  { id: "roda-vertex", nome: "Vertex Forged", cor: "#e2e8f0", raios: 5, aro: "#94a3b8", preco: 3 },
  { id: "roda-turbina", nome: "Turbina Titanium", cor: "#94a3b8", raios: 12, aro: "#38bdf8", preco: 5 },
  { id: "roda-mesh", nome: "Mesh Bronze", cor: "#d99759", raios: 16, aro: "#fbbf24", preco: 6 },
  { id: "roda-estrela", nome: "Estrela Rosé", cor: "#fda4af", raios: 6, aro: "#fb7185", preco: 7 },
  { id: "roda-carbon", nome: "Carbon Blade", cor: "#334155", raios: 3, aro: "#f8fafc", preco: 8 },
  { id: "roda-voltage", nome: "Voltage Neon", cor: "#22d3ee", raios: 8, aro: "#22d3ee", preco: 9 },
  { id: "roda-rally", nome: "Rally Arctic", cor: "#f8fafc", raios: 10, aro: "#ef4444", preco: 10 },
  { id: "roda-inferno", nome: "Inferno Split", cor: "#ef4444", raios: 7, aro: "#fb923c", preco: 11 },
  { id: "roda-orbital", nome: "Orbital Aero", cor: "#a78bfa", raios: 0, aro: "#c4b5fd", preco: 13 },
  { id: "roda-royal", nome: "Royal Diamond", cor: "#fcd34d", raios: 9, aro: "#fef3c7", preco: 16 },
] as const;
export const CARROCERIAS = [
  { id: "corpo-apex", nome: "Apex GT", largura: 1.15, bico: 1, cor: "#f8fafc", metal: 0.55, preco: 4 },
  { id: "corpo-stealth", nome: "Stealth Carbon", largura: 0.95, bico: 0.85, cor: "#334155", metal: 0.15, preco: 6 },
  { id: "corpo-endurance", nome: "Endurance LM", largura: 1.3, bico: 1.15, cor: "#fb923c", metal: 0.5, preco: 7 },
  { id: "corpo-retro", nome: "Retro Heritage", largura: 0.85, bico: 0.8, cor: "#fde68a", metal: 0.4, preco: 8 },
  { id: "corpo-wide", nome: "Widebody RS", largura: 1.45, bico: 1, cor: "#ef4444", metal: 0.55, preco: 9 },
  { id: "corpo-futura", nome: "Futura Concept", largura: 1.05, bico: 1.35, cor: "#22d3ee", metal: 0.85, preco: 10 },
  { id: "corpo-sakura", nome: "Sakura Drift", largura: 1.25, bico: 0.95, cor: "#f9a8d4", metal: 0.45, preco: 11 },
  { id: "corpo-ice", nome: "Ice Silver", largura: 1.1, bico: 1.2, cor: "#e2e8f0", metal: 1, preco: 12 },
  { id: "corpo-viper", nome: "Viper Track", largura: 1.2, bico: 0.7, cor: "#a3e635", metal: 0.5, preco: 14 },
  { id: "corpo-phantom", nome: "Phantom Hyper", largura: 1.35, bico: 1.3, cor: "#a78bfa", metal: 0.9, preco: 18 },
] as const;
export const AEROFOLIOS = [
  { id: "asa-swan", nome: "Swan Neck GT", largura: 2, altura: 1.15, planos: 1, cor: "#e2e8f0", preco: 4 },
  { id: "asa-duck", nome: "Ducktail Classic", largura: 1.5, altura: 0.78, planos: 1, cor: "#fde68a", preco: 5 },
  { id: "asa-time", nome: "Time Attack", largura: 2.4, altura: 1.4, planos: 2, cor: "#ef4444", preco: 7 },
  { id: "asa-delta", nome: "Delta Carbon", largura: 1.8, altura: 1.1, planos: 1, cor: "#64748b", preco: 8 },
  { id: "asa-endurance", nome: "Endurance Pro", largura: 2.15, altura: 1.2, planos: 2, cor: "#fb923c", preco: 9 },
  { id: "asa-neon", nome: "Neon Blade", largura: 2.2, altura: 1.05, planos: 1, cor: "#22d3ee", preco: 10 },
  { id: "asa-triplano", nome: "Triplano Evo", largura: 2.1, altura: 1.3, planos: 3, cor: "#a78bfa", preco: 12 },
  { id: "asa-rally", nome: "Rally WRC", largura: 1.75, altura: 1, planos: 2, cor: "#a3e635", preco: 13 },
  { id: "asa-drs", nome: "DRS Tech", largura: 2.25, altura: 1.25, planos: 2, cor: "#38bdf8", preco: 15 },
  { id: "asa-royal", nome: "Royal Aero", largura: 2.3, altura: 1.35, planos: 3, cor: "#fcd34d", preco: 18 },
] as const;

export const PECAS = [
  { id: "rodas", nome: "Rodas douradas", preco: 1, emoji: "🛞", categoria: "Rodas", descricao: "Aros dourados e detalhes nos pneus." },
  { id: "slick", nome: "Pneus de competição", preco: 4, emoji: "🏁", categoria: "Rodas", descricao: "Faixas vermelhas nos quatro pneus." },
  { id: "aerofolio", nome: "Aerofólio de corrida", preco: 3, emoji: "🪽", categoria: "Aerodinâmica", descricao: "Asa traseira dupla com DRS." },
  { id: "splitter", nome: "Splitter esportivo", preco: 8, emoji: "🏎️", categoria: "Aerodinâmica", descricao: "Asa dianteira extra em carbono." },
  { id: "difusor", nome: "Difusor traseiro", preco: 15, emoji: "🌪️", categoria: "Aerodinâmica", descricao: "Aletas de carbono na traseira." },
  { id: "listras", nome: "Listras de corrida", preco: 2, emoji: "🎨", categoria: "Carroceria", descricao: "Duas faixas brancas na carroceria." },
  { id: "cromo", nome: "Acabamento cromado", preco: 18, emoji: "💎", categoria: "Carroceria", descricao: "Pintura metálica com brilho espelhado." },
  { id: "neon", nome: "Neon por baixo", preco: 6, emoji: "💡", categoria: "Iluminação", descricao: "Iluminação colorida sob o carro." },
  { id: "led", nome: "LEDs laterais", preco: 10, emoji: "✨", categoria: "Iluminação", descricao: "Linhas de luz ciano nas laterais." },
  { id: "capacete", nome: "Capacete dourado", preco: 5, emoji: "🪖", categoria: "Piloto", descricao: "Capacete exclusivo com pintura dourada." },
  { id: "halo", nome: "Halo dourado", preco: 20, emoji: "🌟", categoria: "Piloto", descricao: "Proteção do cockpit com acabamento ouro." },
  { id: "turbo", nome: "Turbo com chamas", preco: 12, emoji: "🔥", categoria: "Especiais", descricao: "Escapamentos com chamas e faíscas." },
  { id: "ouro", nome: "Kit ouro", preco: 24, emoji: "🏆", categoria: "Especiais", descricao: "Carroceria dourada e brilhos animados." },
  { id: "antena", nome: "Bandeira do campeão", preco: 40, emoji: "🚩", categoria: "Especiais", descricao: "Bandeira dourada na traseira." },
  { id: "coroa", nome: "Coroa lendária", preco: 60, emoji: "👑", categoria: "Especiais", descricao: "Coroa dourada sobre o piloto." },
  ...RODAS.map((r) => ({ ...r, emoji: "🛞", categoria: "Rodas" as const, descricao: r.raios ? `${r.raios} raios com aro ${r.nome.split(" ").at(-1)} e freios ventilados.` : "Disco aerodinâmico fechado com aro violeta." })),
  ...CARROCERIAS.map((c) => ({ ...c, emoji: "🏎️", categoria: "Carroceria" as const, descricao: "Novo perfil de carroceria, sidepods e acabamento exclusivo." })),
  ...AEROFOLIOS.map((a) => ({ ...a, emoji: "🪽", categoria: "Aerodinâmica" as const, descricao: `${a.planos} plano${a.planos > 1 ? "s" : ""}, ponteiras exclusivas e asa de ${a.largura.toFixed(1)} m.` })),
  { id: "farol-ice", nome: "Faróis Ice Blue", preco: 5, emoji: "🔦", categoria: "Iluminação", descricao: "Quatro faróis azuis no bico do carro." },
  { id: "luz-freio", nome: "Rain Light", preco: 6, emoji: "🚨", categoria: "Iluminação", descricao: "Luz de chuva vermelha pulsante na traseira." },
  { id: "capacete-sakura", nome: "Capacete Sakura", preco: 7, emoji: "🌸", categoria: "Piloto", descricao: "Casco rosa com viseira violeta espelhada." },
  { id: "escape-titanio", nome: "Escape Titanium", preco: 9, emoji: "⚙️", categoria: "Especiais", descricao: "Dois escapes de titânio com ponteiras azuladas." },
  { id: "canards", nome: "Canards Attack", preco: 8, emoji: "⚡", categoria: "Aerodinâmica", descricao: "Quatro aletas nas laterais do bico." },
  { id: "entrada-ar", nome: "Airbox Performance", preco: 10, emoji: "💨", categoria: "Especiais", descricao: "Entrada de ar elevada atrás do piloto." },
] as const;
export type PecaId = (typeof PECAS)[number]["id"];

export interface Garagem {
  pecas: Set<PecaId>;
  /** Índice em CORES escolhido pelo vendedor; sem escolha, usa a cor da faixa. */
  cor?: number;
  equipadas?: Set<PecaId>;
}


/** Uma variante por encaixe; acessórios continuam combináveis. */
export function encaixePeca(id: PecaId): string {
  if (id === "rodas" || id === "slick" || id.startsWith("roda-")) return "rodas";
  if (id.startsWith("corpo-")) return "carroceria";
  if (id === "aerofolio" || id.startsWith("asa-")) return "asa";
  if (id === "capacete" || id === "capacete-sakura") return "capacete";
  return id;
}
export function equiparPeca(pecas: Iterable<PecaId>, id: PecaId): Set<PecaId> {
  const novas = new Set([...pecas].filter((p) => encaixePeca(p) !== encaixePeca(id)));
  novas.add(id);
  return novas;
}
export function pecasDoCarro(g?: Garagem): Set<PecaId> {
  let ativas = new Set<PecaId>();
  for (const id of g?.equipadas ?? g?.pecas ?? []) ativas = equiparPeca(ativas, id);
  return ativas;
}

/** Faixas da pista em ordem fixa (por nome) — define o número e a cor padrão. */
export const ordenarFaixas = (linhas: RankingSeller[]) => [...linhas].sort((a, b) => a.nome.localeCompare(b.nome));

/** Cores do carro: kit ouro > cor escolhida > cor da faixa. */
export function coresDoCarro(faixa: number, g?: Garagem): [string, string] {
  if (pecasDoCarro(g).has("ouro")) return OURO;
  return CORES[(g?.cor ?? faixa) % CORES.length];
}

const EVENTO_GARAGEM = "garagem-alterada";

/** Avisa as telas abertas nesta aba que a garagem mudou — não depende do realtime. */
export const avisarGaragemAlterada = () => window.dispatchEvent(new Event(EVENTO_GARAGEM));

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
        supabase.from("garagem_compras").select("vendedor_cod, peca_id").order("comprado_em"),
        supabase.from("garagem_visual").select("*"),
      ]);
      if (!vivo) return;
      const m = new Map<string, Garagem>();
      const pegar = (cod: string) => {
        const c = cod.trim();
        if (!m.has(c)) m.set(c, { pecas: new Set() });
        return m.get(c)!;
      };
      for (const r of cp.data || []) pegar(r.vendedor_cod).pecas.add(r.peca_id as PecaId);
      for (const r of vs.data || []) {
        const g = pegar(r.vendedor_cod);
        g.cor = r.cor;
        if (Array.isArray(r.pecas_equipadas)) g.equipadas = new Set(r.pecas_equipadas as PecaId[]);
      }
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
    window.addEventListener(EVENTO_GARAGEM, carregar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_GARAGEM, carregar);
      clearInterval(id);
      supabase.removeChannel(canal);
    };
  }, []);

  return mapa;
}
