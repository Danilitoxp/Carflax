import { useEffect, useState } from "react";
import { apiRankingDia, type RankingDiaRow } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { buildAvatarResolver } from "@/lib/avatar-by-code";
import { calcMetaDiaria } from "@/lib/dias-uteis";

/**
 * Quem lidera o Ranking do dia agora — para a fotinha com coroa na sidebar.
 *
 * A conta é a MESMA do RankingView (percentual da meta diária, com a meta
 * diária = faltante do mês ÷ dias úteis restantes): se fosse outra, a sidebar
 * poderia coroar alguém diferente do telão.
 *
 * Atualiza a cada minuto. O endpoint tem cache de 15s no servidor, então isto
 * não gera consulta nova no ERP.
 */

export interface LiderDoDia {
  nome: string;
  avatar?: string;
  percentual: number;
}

const INTERVALO_MS = 60 * 1000;
const num = (v: unknown) => (typeof v === "string" ? parseFloat(v) : Number(v)) || 0;
const percentualDaMeta = (vendido: number, meta: number) =>
  meta > 0 ? (vendido / meta) * 100 : vendido > 0 ? 100 : 0;

export function useLiderDoDia(ativo: boolean): LiderDoDia | null {
  const [lider, setLider] = useState<LiderDoDia | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    let resolver: ReturnType<typeof buildAvatarResolver> | null = null;

    const carregar = async () => {
      try {
        if (!resolver) {
          const { data } = await supabase.from("usuarios").select("operator_code, avatar");
          resolver = buildAvatarResolver(data || []);
        }
        const linhas = (await apiRankingDia()) as RankingDiaRow[];
        let melhor: LiderDoDia | null = null;
        for (const r of linhas || []) {
          const vendido = num(r.VENDIDO_HOJE);
          // Sem venda hoje ninguém é "líder", nem que tenha meta zerada.
          if (vendido <= 0) continue;
          const percentual = percentualDaMeta(vendido, calcMetaDiaria(num(r.FALTANTE)));
          if (!melhor || percentual > melhor.percentual) {
            melhor = { nome: r.NOME_VENDEDOR, avatar: resolver?.(String(r.COD_VENDEDOR)), percentual };
          }
        }
        if (vivo) setLider(melhor);
      } catch {
        // Falhou a consulta: mantém o último líder conhecido em vez de piscar.
      }
    };

    carregar();
    const t = setInterval(carregar, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [ativo]);

  return ativo ? lider : null;
}
