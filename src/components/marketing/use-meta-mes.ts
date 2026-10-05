import { useEffect, useState } from "react";
import { marketingService } from "@/lib/marketing-service";
import { metaDoMes, type MetaMarketing } from "@/lib/meta-marketing";
import { calcMetaDiaria } from "@/lib/dias-uteis";

const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export interface MetaMesEstado {
  meta: MetaMarketing;
  /** Realizado do mês, do dia 1 até hoje (ou o mês inteiro, se já fechou). */
  real: { leads: number; orcamentos: number; vendas: number; valor: number };
  /** Fração do mês já passada (0–1): onde o resultado deveria estar hoje. */
  decorrido: number;
  /**
   * Quanto ainda precisa vender por dia útil para fechar a meta de valor.
   * Recalculado a cada carregamento: cai quando se vende e sobe quando o dia
   * passa sem venda. Mês fechado = 0.
   */
  diariaValor: number;
}

/**
 * Meta do mês (gerada a partir da Gestão de Tráfego) + realizado do mês até
 * hoje, para os cartões da Visão geral. `null` enquanto carrega ou se falhar.
 */
export function useMetaMes(mes: string): MetaMesEstado | null {
  const [estado, setEstado] = useState<{ mes: string; valor: MetaMesEstado } | null>(null);

  useEffect(() => {
    let vivo = true;
    const [a, m] = mes.split("-").map(Number);
    const ultimo = new Date(a, m, 0).getDate();
    const hoje = hojeSP();
    const corrente = mes === hoje.slice(0, 7);
    const ate = corrente ? Number(hoje.slice(8, 10)) : ultimo;
    const decorrido = mes < hoje.slice(0, 7) ? 1 : corrente ? ate / ultimo : 0;
    Promise.all([
      metaDoMes(mes),
      marketingService.getReportsAnalytics(new Date(a, m - 1, 1), new Date(a, m - 1, ate), { semComparativo: true }),
    ])
      .then(([meta, an]) => {
        if (!vivo) return;
        setEstado({
          mes,
          valor: {
            meta,
            decorrido,
            real: { leads: an.totals.leads, orcamentos: an.totals.quotesCount, vendas: an.totals.salesCount, valor: an.totals.salesValue },
            // Mesma conta do "Diário" do card do vendedor: o que falta dividido
            // pelos dias úteis que ainda restam no mês.
            diariaValor: corrente
              ? calcMetaDiaria(meta.metas.valorVendas - an.totals.salesValue, new Date())
              : 0,
          },
        });
      })
      .catch(() => { /* sem meta: os cartões aparecem sem a barra */ });
    return () => { vivo = false; };
  }, [mes]);

  return estado?.mes === mes ? estado.valor : null;
}
