// Meta mensal de leads, orçamentos e vendas, derivada da Gestão de Tráfego.
//
// Como é calculada (uma vez por mês, depois fica fixa):
//   1. Investimento planejado do mês = projeção de mídia da Gestão de Tráfego
//      (gasto até agora + orçamentos ativos nos dias em que as campanhas rodam).
//   2. Nos 3 meses fechados anteriores, com os MESMOS números da tela de
//      Desempenho: custo por lead (gasto ÷ leads), taxa lead → orçamento,
//      taxa orçamento → venda e ticket médio.
//   3. Meta de leads = investimento ÷ custo por lead; orçamentos = leads × taxa;
//      vendas = orçamentos × taxa; valor = vendas × ticket.
// A meta é gravada em crm_config (meta_marketing_AAAA-MM), igual para todos.
import { supabase } from "@/lib/supabase";
import { marketingService } from "@/lib/marketing-service";
import { apiTrafegoCampanhas, apiTrafegoDiario } from "@/lib/api";

export interface MetaMarketing {
  mes: string; // AAAA-MM
  geradaEm: string;
  investimentoPlanejado: number;
  base: { meses: string[]; gasto: number; leads: number; orcamentos: number; vendas: number; valorVendas: number };
  custoPorLead: number;
  taxaOrcamento: number; // orçamentos ÷ leads
  taxaVenda: number; // vendas ÷ orçamentos
  ticketMedio: number;
  metas: { leads: number; orcamentos: number; vendas: number; valorVendas: number };
}

const chave = (mes: string) => `meta_marketing_${mes}`;
const ultimoDia = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m, 0).getDate();
};
const mesDeslocado = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const dataLocal = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};

async function gastoDoMes(mes: string) {
  const r = await apiTrafegoDiario(`${mes}-01`, `${mes}-${String(ultimoDia(mes)).padStart(2, "0")}`);
  return r.dias.reduce((s, d) => s + d.google + d.meta, 0);
}

async function lerGuardada(mes: string): Promise<MetaMarketing | null> {
  const { data } = await supabase.from("crm_config").select("value").eq("key", chave(mes)).maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(String(data.value)) as MetaMarketing;
  } catch {
    return null;
  }
}

/** Calcula a meta do mês a partir dos 3 meses fechados anteriores. */
export async function calcularMeta(mes: string): Promise<MetaMarketing> {
  const meses = [mesDeslocado(mes, -3), mesDeslocado(mes, -2), mesDeslocado(mes, -1)];
  const porMes = await Promise.all(meses.map(async (m) => {
    const [gasto, a] = await Promise.all([
      gastoDoMes(m),
      marketingService.getReportsAnalytics(dataLocal(`${m}-01`), dataLocal(`${m}-${String(ultimoDia(m)).padStart(2, "0")}`), { semComparativo: true }),
    ]);
    return { gasto, leads: a.totals.leads, orcamentos: a.totals.quotesCount, vendas: a.totals.salesCount, valorVendas: a.totals.salesValue };
  }));
  const base = porMes.reduce((s, x) => ({
    gasto: s.gasto + x.gasto, leads: s.leads + x.leads, orcamentos: s.orcamentos + x.orcamentos,
    vendas: s.vendas + x.vendas, valorVendas: s.valorVendas + x.valorVendas,
  }), { gasto: 0, leads: 0, orcamentos: 0, vendas: 0, valorVendas: 0 });
  if (!base.leads || !base.gasto) throw new Error("Sem histórico de gasto e leads nos 3 meses anteriores para calcular a meta.");

  // Investimento do mês: a projeção da Gestão de Tráfego (mês corrente) ou o gasto real (mês passado).
  const atual = mes === hojeSP().slice(0, 7);
  const investimentoPlanejado = atual
    ? (await apiTrafegoCampanhas(`${mes}-01`, hojeSP())).teto.projecaoMes
    : await gastoDoMes(mes);

  const custoPorLead = base.gasto / base.leads;
  const taxaOrcamento = base.orcamentos / base.leads;
  const taxaVenda = base.orcamentos ? base.vendas / base.orcamentos : 0;
  const ticketMedio = base.vendas ? base.valorVendas / base.vendas : 0;
  const leads = Math.round(investimentoPlanejado / custoPorLead);
  const orcamentos = Math.round(leads * taxaOrcamento);
  const vendas = Math.round(orcamentos * taxaVenda);
  return {
    mes, geradaEm: new Date().toISOString(), investimentoPlanejado,
    base: { meses, ...base }, custoPorLead, taxaOrcamento, taxaVenda, ticketMedio,
    metas: { leads, orcamentos, vendas, valorVendas: Math.round(vendas * ticketMedio) },
  };
}

/**
 * A meta do mês: a que já foi gravada ou, na primeira abertura do mês, calcula
 * e grava. `recalcular` refaz e sobrescreve (ex.: mudança grande de verba).
 */
export async function metaDoMes(mes: string, recalcular = false): Promise<MetaMarketing> {
  if (!recalcular) {
    const guardada = await lerGuardada(mes);
    if (guardada) return guardada;
  }
  const meta = await calcularMeta(mes);
  await supabase.from("crm_config").upsert({ key: chave(mes), value: JSON.stringify(meta) }, { onConflict: "key" });
  return meta;
}
