// ── Motor de cálculo da Análise FRV ──────────────────────────────────────────
// Funções puras que transformam o dataset cru (VW_FATURAMENTO agregado) em
// indicadores de BI: scores RFV, segmentação, comparação de períodos, curva
// ABC, risco de abandono, previsão de recompra e alertas.

import type { FrvCliente, FrvSeriePonto } from "@/lib/api";

export type ComparacaoModo = "mes" | "3m" | "12m";

export interface SegmentoInfo {
  label: string;
  cor: string; // hex
  tom: "positivo" | "neutro" | "atencao" | "critico";
  oportunidade: boolean;
}

export interface ClienteFRVCalc extends FrvCliente {
  r_score: number;
  f_score: number;
  v_score: number;
  m_score: number;
  fv_score: number;
  segmento: SegmentoInfo;
  faturamento_atual: number;
  faturamento_anterior: number;
  variacao_pct: number; // atual vs anterior
  variacao_abs: number;
  tendencia: number; // inclinação normalizada dos últimos 6 meses (-1..1)
  risco_abandono: number; // 0..100
  status: "ativo" | "atencao" | "inativo";
  proxima_compra: string | null; // ISO date
  dias_para_proxima: number | null; // negativo = atrasado
  abc?: "A" | "B" | "C";
  abc_acumulado_pct?: number;
}

// ── Formatação ───────────────────────────────────────────────────────────────
export const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtBRLCompact = (v: number) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return fmtBRL(n);
};

export const fmtPct = (v: number, casas = 1) =>
  `${v > 0 ? "+" : ""}${(Number(v) || 0).toFixed(casas).replace(".", ",")}%`;

export const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

// ── Janelas de meses ─────────────────────────────────────────────────────────
function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Retorna as chaves 'YYYY-MM' de uma janela de n meses, deslocada endOffset meses para trás. */
function janelaMeses(n: number, endOffset: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    keys.push(ymKey(new Date(now.getFullYear(), now.getMonth() - endOffset - i, 1)));
  }
  return keys;
}

const MESES_POR_MODO: Record<ComparacaoModo, number> = { mes: 1, "3m": 3, "12m": 12 };

export const LABEL_MODO: Record<ComparacaoModo, string> = {
  mes: "Mês atual × anterior",
  "3m": "Trimestre atual × anterior",
  "12m": "Ano atual × anterior",
};

function somaSerie(serie: FrvSeriePonto[], chaves: Set<string>) {
  let total = 0;
  for (const p of serie) if (chaves.has(p.mes)) total += p.valor;
  return total;
}

// ── Scores RFV (percentil dentro da base fornecida) ──────────────────────────
function construtorScore(valores: number[]) {
  const ordenado = [...valores].sort((a, b) => a - b);
  const n = ordenado.length;
  return (valor: number, reverso = false) => {
    if (n === 0) return 3;
    // posição do último valor <= valor
    let idx = 0;
    while (idx < n && ordenado[idx] <= valor) idx++;
    const percentil = idx / n;
    let score = Math.ceil(percentil * 5);
    if (reverso) score = 6 - score;
    return Math.min(Math.max(score, 1), 5);
  };
}

// ── Segmentação (derivada dos scores R e FV) ─────────────────────────────────
export function classificarSegmento(r: number, fv: number): SegmentoInfo {
  if (r >= 4 && fv >= 4)
    return { label: "Campeões", cor: "#3b82f6", tom: "positivo", oportunidade: true };
  if (r >= 3 && fv >= 3)
    return { label: "Leais", cor: "#10b981", tom: "positivo", oportunidade: true };
  if (r >= 4 && fv <= 2)
    return { label: "Promissores", cor: "#8b5cf6", tom: "neutro", oportunidade: true };
  if (r <= 2 && fv >= 4)
    return { label: "Não Perder", cor: "#ef4444", tom: "critico", oportunidade: false };
  if (r <= 2 && fv === 3)
    return { label: "Em Risco", cor: "#f59e0b", tom: "atencao", oportunidade: false };
  if (r === 3)
    return { label: "Precisam Atenção", cor: "#64748b", tom: "atencao", oportunidade: false };
  if (r <= 2 && fv === 2)
    return { label: "Hibernando", cor: "#94a3b8", tom: "atencao", oportunidade: false };
  return { label: "Perdidos", cor: "#334155", tom: "critico", oportunidade: false };
}

export const SEGMENTOS_ORDEM = [
  "Campeões",
  "Leais",
  "Promissores",
  "Precisam Atenção",
  "Em Risco",
  "Não Perder",
  "Hibernando",
  "Perdidos",
];

// ── Tendência (regressão linear simples nos últimos 6 meses) ─────────────────
function tendencia6m(serie: FrvSeriePonto[]): number {
  const ult = serie.slice(-6);
  if (ult.length < 2) return 0;
  const n = ult.length;
  const xs = ult.map((_, i) => i);
  const ys = ult.map((p) => p.valor);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  // normaliza pela média para virar algo comparável (-1..1 aprox.)
  if (my === 0) return 0;
  return Math.max(-1, Math.min(1, slope / my));
}

// ── Risco de abandono (0..100) ───────────────────────────────────────────────
function calcularRisco(
  c: FrvCliente,
  variacaoPct: number,
  tendencia: number
): number {
  let risco = 0;
  const rec = c.recencia_dias;

  // Banda de recência
  if (rec <= 30) risco += 0;
  else if (rec <= 60) risco += 12;
  else if (rec <= 90) risco += 28;
  else if (rec <= 120) risco += 45;
  else if (rec <= 180) risco += 62;
  else risco += 80;

  // Atraso relativo à cadência do próprio cliente
  if (c.intervalo_medio_dias && rec > c.intervalo_medio_dias * 2) risco += 15;

  // Queda de faturamento
  if (variacaoPct <= -40) risco += 25;
  else if (variacaoPct <= -20) risco += 15;

  // Tendência de queda
  if (tendencia < -0.15) risco += 10;

  return Math.max(0, Math.min(100, Math.round(risco)));
}

// ── Cálculo principal ────────────────────────────────────────────────────────
export function calcularClientes(
  clientes: FrvCliente[],
  modo: ComparacaoModo
): ClienteFRVCalc[] {
  if (!Array.isArray(clientes) || clientes.length === 0) return [];

  const scoreR = construtorScore(clientes.map((c) => c.recencia_dias));
  const scoreF = construtorScore(clientes.map((c) => c.frequencia));
  const scoreV = construtorScore(clientes.map((c) => c.valor_total));
  const scoreM = construtorScore(clientes.map((c) => c.margem_total));

  const nMeses = MESES_POR_MODO[modo];
  const atualKeys = new Set(janelaMeses(nMeses, 0));
  const anteriorKeys = new Set(janelaMeses(nMeses, nMeses));
  const hoje = Date.now();

  return clientes.map((c) => {
    const r = scoreR(c.recencia_dias, true);
    const f = scoreF(c.frequencia);
    const v = scoreV(c.valor_total);
    const m = scoreM(c.margem_total);
    const fv = Math.round((f + v) / 2);

    const faturamentoAtual = somaSerie(c.serie, atualKeys);
    const faturamentoAnterior = somaSerie(c.serie, anteriorKeys);
    const variacaoAbs = faturamentoAtual - faturamentoAnterior;
    const variacaoPct =
      faturamentoAnterior > 0
        ? (variacaoAbs / faturamentoAnterior) * 100
        : faturamentoAtual > 0
        ? 100
        : 0;

    const tend = tendencia6m(c.serie);
    const risco = c.frequencia >= 2 ? calcularRisco(c, variacaoPct, tend) : Math.min(60, calcularRisco(c, variacaoPct, tend));

    // Status de atividade (relativo à cadência quando disponível)
    let status: ClienteFRVCalc["status"];
    const cadencia = c.intervalo_medio_dias;
    if (cadencia) {
      if (c.recencia_dias <= cadencia * 1.3) status = "ativo";
      else if (c.recencia_dias <= cadencia * 2.5) status = "atencao";
      else status = "inativo";
    } else {
      status = c.recencia_dias <= 60 ? "ativo" : c.recencia_dias <= 120 ? "atencao" : "inativo";
    }

    // Previsão de próxima compra
    let proximaCompra: string | null = null;
    let diasParaProxima: number | null = null;
    if (c.ultima_compra && cadencia) {
      const prox = new Date(c.ultima_compra);
      prox.setDate(prox.getDate() + cadencia);
      proximaCompra = prox.toISOString();
      diasParaProxima = Math.round((prox.getTime() - hoje) / 86400000);
    }

    return {
      ...c,
      r_score: r,
      f_score: f,
      v_score: v,
      m_score: m,
      fv_score: fv,
      segmento: classificarSegmento(r, fv),
      faturamento_atual: faturamentoAtual,
      faturamento_anterior: faturamentoAnterior,
      variacao_pct: variacaoPct,
      variacao_abs: variacaoAbs,
      tendencia: tend,
      risco_abandono: risco,
      status,
      proxima_compra: proximaCompra,
      dias_para_proxima: diasParaProxima,
    };
  });
}

// ── Curva ABC (mutação in place dos campos abc) ──────────────────────────────
export function aplicarABC(clientes: ClienteFRVCalc[]): ClienteFRVCalc[] {
  const ordenado = [...clientes].sort((a, b) => b.valor_total - a.valor_total);
  const total = ordenado.reduce((acc, c) => acc + c.valor_total, 0) || 1;
  let acumulado = 0;
  for (const c of ordenado) {
    acumulado += c.valor_total;
    const pct = (acumulado / total) * 100;
    c.abc_acumulado_pct = pct;
    c.abc = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
  }
  return clientes;
}

// ── Agregação da série para gráfico de evolução ──────────────────────────────
export function agregarEvolucao(
  clientes: ClienteFRVCalc[],
  ultimosMeses = 12
): { mes: string; label: string; valor: number; margem: number; pedidos: number }[] {
  const mapa = new Map<string, { valor: number; margem: number; pedidos: number }>();
  for (const c of clientes) {
    for (const p of c.serie) {
      const cur = mapa.get(p.mes) || { valor: 0, margem: 0, pedidos: 0 };
      cur.valor += p.valor;
      cur.margem += p.valor - p.custo;
      cur.pedidos += p.pedidos;
      mapa.set(p.mes, cur);
    }
  }
  const chaves = janelaMeses(ultimosMeses, 0).reverse(); // cronológico
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return chaves.map((mes) => {
    const [ano, m] = mes.split("-");
    const d = mapa.get(mes) || { valor: 0, margem: 0, pedidos: 0 };
    return { mes, label: `${nomes[Number(m) - 1]}/${ano.slice(2)}`, ...d };
  });
}

// ── Alertas automáticos (oportunidades e riscos) ─────────────────────────────
export interface Alerta {
  id: string;
  tipo: "risco" | "oportunidade";
  prioridade: number; // maior = mais urgente
  titulo: string;
  descricao: string;
  cliente_id: string;
  nome_cliente: string;
  valor: number;
}

export function gerarAlertas(clientes: ClienteFRVCalc[]): Alerta[] {
  const alertas: Alerta[] = [];
  const valores = clientes.map((c) => c.valor_total).sort((a, b) => a - b);
  const q75 = valores[Math.floor(valores.length * 0.75)] || 0;

  for (const c of clientes) {
    const altoValor = c.valor_total >= q75;

    // RISCO: cliente valioso inativo / prestes a perder
    if (altoValor && c.segmento.tom === "critico" && c.recencia_dias > 90) {
      alertas.push({
        id: `perda-${c.cliente_id}`,
        tipo: "risco",
        prioridade: 100 + Math.min(50, c.recencia_dias / 4),
        titulo: "Cliente valioso em risco de perda",
        descricao: `${c.recencia_dias} dias sem comprar. Faturava ${fmtBRLCompact(c.valor_total)}. Contato urgente.`,
        cliente_id: c.cliente_id,
        nome_cliente: c.nome_cliente,
        valor: c.valor_total,
      });
      continue;
    }

    // RISCO: queda forte de faturamento
    if (c.faturamento_anterior > 0 && c.variacao_pct <= -35 && c.valor_total > 0) {
      alertas.push({
        id: `queda-${c.cliente_id}`,
        tipo: "risco",
        prioridade: 70 + Math.min(25, Math.abs(c.variacao_pct) / 4),
        titulo: "Queda acentuada de compras",
        descricao: `Reduziu ${fmtPct(c.variacao_pct)} no período. Verifique satisfação e concorrência.`,
        cliente_id: c.cliente_id,
        nome_cliente: c.nome_cliente,
        valor: c.valor_total,
      });
      continue;
    }

    // OPORTUNIDADE: recompra prevista chegando
    if (c.dias_para_proxima !== null && c.dias_para_proxima <= 7 && c.dias_para_proxima >= -3 && c.status !== "inativo") {
      alertas.push({
        id: `recompra-${c.cliente_id}`,
        tipo: "oportunidade",
        prioridade: 60 + (altoValor ? 20 : 0),
        titulo: "Janela de recompra aberta",
        descricao:
          c.dias_para_proxima >= 0
            ? `Próxima compra prevista em ${c.dias_para_proxima} dia(s). Antecipe o contato.`
            : `Recompra prevista há ${Math.abs(c.dias_para_proxima)} dia(s). Faça o follow-up.`,
        cliente_id: c.cliente_id,
        nome_cliente: c.nome_cliente,
        valor: c.valor_total,
      });
      continue;
    }

    // OPORTUNIDADE: cliente em crescimento acelerado
    if (c.variacao_pct >= 35 && c.faturamento_atual > 0) {
      alertas.push({
        id: `cresc-${c.cliente_id}`,
        tipo: "oportunidade",
        prioridade: 50 + Math.min(20, c.variacao_pct / 5),
        titulo: "Cliente em crescimento",
        descricao: `Cresceu ${fmtPct(c.variacao_pct)}. Momento ideal para ampliar mix e fidelizar.`,
        cliente_id: c.cliente_id,
        nome_cliente: c.nome_cliente,
        valor: c.valor_total,
      });
    }
  }

  return alertas.sort((a, b) => b.prioridade - a.prioridade);
}

// ── Score de Oportunidade de Recuperação (0..100) ────────────────────────────
// Diferente do risco de abandono: mede o quanto vale a pena (e é possível)
// recuperar/expandir este cliente. Combina importância (valor + margem),
// histórico de recorrência, urgência (queda de faturamento ou atraso relativo
// à cadência) e um decaimento para clientes praticamente perdidos há muito tempo.
export function scoreOportunidade(c: ClienteFRVCalc): number {
  const clamp = (x: number) => Math.min(1, Math.max(0, x));

  const importancia = (c.v_score + c.m_score) / 10; // 0..1 (valor + margem)
  const recorrencia = c.f_score / 5; // 0..1

  // Queda de faturamento no período (0..1): -50% ou pior → 1
  const queda = c.variacao_pct < 0 ? clamp(Math.abs(c.variacao_pct) / 50) : 0;

  // Atraso relativo à cadência (0..1): 4x a cadência → 1
  let atraso = 0;
  if (c.intervalo_medio_dias) atraso = clamp((c.recencia_dias / c.intervalo_medio_dias - 1) / 3);
  else atraso = clamp((c.recencia_dias - 30) / 150);

  const urgencia = Math.max(queda, atraso);

  // Recuperabilidade: cliente abandonado há muito tempo vale menos como oportunidade
  let recuperavel = 1;
  if (c.recencia_dias > 540) recuperavel = 0.45;
  else if (c.recencia_dias > 365) recuperavel = 0.7;

  const raw = (0.4 * importancia + 0.2 * recorrencia + 0.4 * urgencia) * recuperavel;
  return Math.round(clamp(raw) * 100);
}

// ── Ação sugerida (pura) ─────────────────────────────────────────────────────
// Motor de regras compartilhado pela Agenda do Vendedor e pelo Raio-X.
export type AcaoTom = "critico" | "atencao" | "oportunidade" | "neutro";

export interface AcaoSugerida {
  titulo: string;
  detalhe: string;
  tom: AcaoTom;
}

export function acaoSugerida(c: ClienteFRVCalc): AcaoSugerida {
  if (c.status === "inativo" && c.valor_total > 0) {
    return {
      titulo: "Agendar visita",
      detalhe: `Cliente parado há ${c.recencia_dias} dias. Faturava ${fmtBRLCompact(c.valor_total)} — recuperação prioritária.`,
      tom: "critico",
    };
  }
  if (c.risco_abandono >= 60) {
    return {
      titulo: "Ligar hoje",
      detalhe: `Risco alto de perda (${c.risco_abandono}/100). Faça contato de retenção imediato.`,
      tom: "critico",
    };
  }
  if (c.faturamento_anterior > 0 && c.variacao_pct <= -35) {
    return {
      titulo: "Contato de retenção",
      detalhe: `Compras caíram ${fmtPct(c.variacao_pct)}. Investigue satisfação e concorrência.`,
      tom: "atencao",
    };
  }
  if (c.dias_para_proxima !== null && c.dias_para_proxima <= 7 && c.dias_para_proxima >= -3) {
    return {
      titulo: "Janela de recompra aberta",
      detalhe:
        c.dias_para_proxima >= 0
          ? `Próxima compra prevista em ${c.dias_para_proxima} dia(s). Antecipe o contato.`
          : `Recompra prevista há ${Math.abs(c.dias_para_proxima)} dia(s). Faça o follow-up.`,
      tom: "oportunidade",
    };
  }
  if (c.variacao_pct >= 35 && c.faturamento_atual > 0) {
    return {
      titulo: "Ampliar mix",
      detalhe: `Cliente cresceu ${fmtPct(c.variacao_pct)}. Momento ideal para oferecer produtos complementares.`,
      tom: "oportunidade",
    };
  }
  return {
    titulo: "Manter relacionamento",
    detalhe: "Cliente dentro do padrão de compra. Mantenha a cadência e acompanhe o mix.",
    tom: "neutro",
  };
}

// ── KPIs agregados ───────────────────────────────────────────────────────────
export interface KpisFRV {
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoFat: number;
  margemAtual: number;
  margemPct: number;
  ticketMedio: number;
  clientesAtivos: number;
  clientesInativos: number;
  clientesEmRisco: number;
  frequenciaMedia: number;
  baseTotal: number;
}

export function calcularKpis(clientes: ClienteFRVCalc[]): KpisFRV {
  const base = clientes.length || 1;
  const faturamentoAtual = clientes.reduce((a, c) => a + c.faturamento_atual, 0);
  const faturamentoAnterior = clientes.reduce((a, c) => a + c.faturamento_anterior, 0);
  const valorTotal = clientes.reduce((a, c) => a + c.valor_total, 0);
  const margemTotal = clientes.reduce((a, c) => a + c.margem_total, 0);
  const freqTotal = clientes.reduce((a, c) => a + c.frequencia, 0);

  return {
    faturamentoAtual,
    faturamentoAnterior,
    variacaoFat:
      faturamentoAnterior > 0
        ? ((faturamentoAtual - faturamentoAnterior) / faturamentoAnterior) * 100
        : faturamentoAtual > 0
        ? 100
        : 0,
    margemAtual: margemTotal,
    margemPct: valorTotal > 0 ? (margemTotal / valorTotal) * 100 : 0,
    ticketMedio: freqTotal > 0 ? valorTotal / freqTotal : 0,
    clientesAtivos: clientes.filter((c) => c.status === "ativo").length,
    clientesInativos: clientes.filter((c) => c.status === "inativo").length,
    clientesEmRisco: clientes.filter((c) => c.risco_abandono >= 55).length,
    frequenciaMedia: freqTotal / base,
    baseTotal: clientes.length,
  };
}
