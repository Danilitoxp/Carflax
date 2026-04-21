import { supabase } from "./supabase";
import { apiDashboardGeral } from "./api";

/**
 * Lógica Profissional para Cálculo do Funcionário do Mês
 * Critérios:
 * 1. Comercial: % Atingimento da Meta
 * 2. Pontualidade (Secullum): Zero atrasos = Bônus
 * 3. Logística: Entregas realizadas
 */
export async function calculateMonthlyWinner(mesano: string) {
  try {
    // 1. Buscar Dados de Vendas no Dashboard Geral (Unificando com o painel de vendas)
    const sellers = await apiDashboardGeral();
    const MIN_ACHIEVEMENT = 1; // Barreira mínima para qualificação (qualquer venda acima de 1%)

    const sellersScores = (sellers || [])
      .map(v => {
        const faturado = parseFloat(String(v.FATURADO)) || 0;
        const meta = parseFloat(String(v.META)) || 1; // Evita divisão por zero
        const achievement = (faturado / meta) * 100;

        return {
          name: v.NOME_VENDEDOR,
          cod_vendedor: v.COD_VENDEDOR,
          score: achievement,
          setor: "Comercial",
          role: "Consultor de Vendas",
          department: "Comercial",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.NOME_VENDEDOR}`,
          motivo: `Líder de performance com ${achievement.toFixed(2)}% de sua meta atingida até o momento.`
        };
      })
      .filter(v => v.score >= MIN_ACHIEVEMENT); // Aplica a barreira mínima

    // 3. Unificar e Rankear (Ordena pelo maior aproveitamento)
    const winner = sellersScores.sort((a, b) => b.score - a.score)[0];

    if (!winner) return null;

    // 4. Buscar Perfil Real no Supabase (Sempre pelo Código do Operador como solicitado)
    const { data: userData } = await supabase
      .from("usuarios")
      .select("id, avatar, role, department, operator_code")
      .eq("operator_code", String(winner.cod_vendedor))
      .maybeSingle();

    // 5. Atualizar o objeto do vencedor com os dados reais do banco
    const finalWinner = {
      ...winner,
      avatar: userData?.avatar || winner.avatar,
      role: userData?.role || winner.role,
      department: userData?.department || winner.department
    };

    // 6. Retorna o vencedor calculado em tempo real (Sem salvar no banco para evitar erros de RLS no cliente)
    return finalWinner;

  } catch (error) {
    console.error("Erro no cálculo automático:", error);
    return null;
  }
}
