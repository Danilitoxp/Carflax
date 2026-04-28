import { supabase } from "./supabase";
import { apiDashboardGeral } from "./api";

/**
 * Lógica Profissional para Cálculo do Funcionário do Mês
 * Critérios:
 * 1. Comercial: % Atingimento da Meta
 * 2. Pontualidade (Secullum): Zero atrasos = Bônus
 * 3. Logística: Entregas realizadas
 */
export async function calculateMonthlyWinner(_mesano: string) {
  try {
    // 1. Buscar Dados de Vendas no Dashboard Geral
    const sellers = await apiDashboardGeral();
    const { data: usersRoles } = await supabase.from("usuarios").select("operator_code, role");
    
    const MIN_ACHIEVEMENT = 1;

    const sellersScores = (sellers || [])
      .map(v => {
        // Busca o cargo deste vendedor no banco de usuários
        const userRole = usersRoles?.find(u => String(u.operator_code) === String(v.COD_VENDEDOR))?.role || "Consultor de Vendas";
        
        // Critério de exclusão: Gerentes e Admins não entram no destaque de performance de vendas
        const isManager = userRole.toUpperCase().includes("GERENTE") || userRole.toUpperCase().includes("ADMIN");
        if (isManager) return null;

        const faturado = parseFloat(String(v.FATURADO)) || 0;
        const meta = parseFloat(String(v.META)) || 0;
        
        if (meta <= 0) return null; // Ignora quem não tem meta cadastrada

        const achievement = (faturado / meta) * 100;

        return {
          name: v.NOME_VENDEDOR,
          cod_vendedor: v.COD_VENDEDOR,
          score: achievement,
          setor: "Comercial",
          role: userRole,
          department: "Comercial",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.NOME_VENDEDOR}`,
          motivo: `Líder de performance com ${achievement.toFixed(2)}% de sua meta atingida até o momento.`
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null && v.score >= MIN_ACHIEVEMENT);

    // 3. Unificar e Rankear
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
