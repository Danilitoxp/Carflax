// Regras do "Você de Casa Nova" compartilhadas entre a janela do Prêmio
// Especial (CasaNovaSecao) e o aviso de prêmio pendente na sidebar.
//
// Trimestral e semestral: ≥ 100% da meta em CADA mês (não é a soma). Mês sem
// meta cadastrada conta como não batido. Contas de CAIXA ficam fora.

import { supabase } from "@/lib/supabase";
import { apiCampanhaMetas, type MetaVendedor } from "@/lib/api";

export const CORTE_CASA_NOVA = 100;

export interface ResultadoCasaNova {
  cod: string;
  nome: string;
  /** % da meta em cada mês; null = sem meta naquele mês. */
  pctMes: Map<number, number | null>;
}

const num = (v: unknown) => (typeof v === "string" ? parseFloat(v) : Number(v)) || 0;
const ehCaixa = (nome: string) => /^CAIXA\b/.test((nome || "").toUpperCase().trim());
const mesano = (mes: number, ano: number) => `${String(mes).padStart(2, "0")}${ano}`;

export const mesesDoTrimestre = (t: number) => [1, 2, 3].map((i) => (t - 1) * 3 + i);

/** % da meta de cada vendedor em cada mês pedido (mês futuro não é consultado). */
export async function resultadosPorMes(meses: number[], ano: number): Promise<ResultadoCasaNova[]> {
  const agora = new Date();
  const dados = await Promise.all(
    meses.map(async (m) => {
      if (new Date(ano, m - 1, 1) > agora) return { mes: m, resumo: [] as MetaVendedor[] };
      try {
        const r = await apiCampanhaMetas(mesano(m, ano));
        return { mes: m, resumo: r.resumo || [] };
      } catch {
        return { mes: m, resumo: [] as MetaVendedor[] };
      }
    }),
  );
  const mapa = new Map<string, ResultadoCasaNova>();
  for (const { mes, resumo } of dados) {
    for (const v of resumo) {
      if (ehCaixa(v.NOME_VENDEDOR)) continue;
      const cod = String(v.COD_VENDEDOR);
      const r = mapa.get(cod) ?? { cod, nome: v.NOME_VENDEDOR, pctMes: new Map() };
      r.pctMes.set(mes, num(v.META_VENDEDOR) > 0 ? num(v.PERC_META_BATIDA) : null);
      mapa.set(cod, r);
    }
  }
  return [...mapa.values()];
}

/** Bateu ≥ 100% em todos os meses que já fecharam (mês corrente ainda pode chegar). */
export function bateuTodos(r: ResultadoCasaNova, meses: number[], ano: number, hoje = new Date()) {
  const fechados = meses.filter((m) => new Date(ano, m, 1) <= hoje);
  if (!fechados.length) return false;
  return fechados.every((m) => (r.pctMes.get(m) ?? -1) >= CORTE_CASA_NOVA);
}

/**
 * Já garantiu o trimestre: ≥ 100% nos 3 meses, contando o mês que ainda está
 * correndo. Não precisa esperar o trimestre fechar para escolher o prêmio.
 */
export function garantiuTrimestre(r: ResultadoCasaNova, trimestre: number) {
  return mesesDoTrimestre(trimestre).every((m) => (r.pctMes.get(m) ?? -1) >= CORTE_CASA_NOVA);
}

/**
 * Trimestres JÁ FECHADOS do ano em que o vendedor se qualificou e ainda não
 * escolheu o prêmio. Base da bolinha vermelha em Comercial › Campanhas.
 */
export async function trimestresPendentes(codVendedor: string, ano = new Date().getFullYear()): Promise<number[]> {
  const hoje = new Date();
  // Fechados, mais o trimestre corrente quando o último mês dele já começou
  // (aí os 3 meses têm resultado e quem passou de 100% em todos já garantiu).
  const fechados = [1, 2, 3, 4].filter((t) => new Date(ano, t * 3 - 1, 1) <= hoje);
  if (!fechados.length) return [];

  const { data } = await supabase
    .from("premio_trimestre_escolha")
    .select("trimestre")
    .eq("ano", ano)
    .eq("vendedor_codigo", codVendedor);
  const jaEscolheu = new Set((data || []).map((r) => Number(r.trimestre)));
  const aVerificar = fechados.filter((t) => !jaEscolheu.has(t));
  if (!aVerificar.length) return [];

  const meses = aVerificar.flatMap(mesesDoTrimestre);
  const resultados = await resultadosPorMes(meses, ano);
  const meu = resultados.find((r) => r.cod === codVendedor);
  if (!meu) return [];
  return aVerificar.filter((t) =>
    new Date(ano, t * 3, 1) <= hoje ? bateuTodos(meu, mesesDoTrimestre(t), ano, hoje) : garantiuTrimestre(meu, t),
  );
}
