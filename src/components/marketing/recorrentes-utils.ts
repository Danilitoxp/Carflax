import { supabase } from "@/lib/supabase";

export type RecorrenciaTipo = "diario" | "dias_semana" | "semanal" | "mensal";

export interface DemandaRecorrente {
  id: string;
  title: string;
  description?: string;
  tipo: RecorrenciaTipo;
  dias_semana?: number[]; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  dia_semana_especifico?: number; // 1 = Segunda
  dia_mes_especifico?: number; // 1..31
  tag_name?: string;
  subtasks?: string[];
  owner_id?: string | null;
  active: boolean;
  last_generated_date?: string; // YYYY-MM-DD
  created_at?: string;
}

export const DIAS_SEMANA_LABELS = [
  { val: 1, short: "Seg", full: "Segunda-feira" },
  { val: 2, short: "Ter", full: "Terça-feira" },
  { val: 3, short: "Qua", full: "Quarta-feira" },
  { val: 4, short: "Qui", full: "Quinta-feira" },
  { val: 5, short: "Sex", full: "Sexta-feira" },
  { val: 6, short: "Sáb", full: "Sábado" },
  { val: 0, short: "Dom", full: "Domingo" },
];

export function getDefaultRotinas(): DemandaRecorrente[] {
  return [
    {
      id: "rotina-stories-diarios",
      title: "📱 3 Stories Diários (Postar Roteiros do Social Media)",
      description: "Postar e executar a sequência de 3 Stories diários com base nos roteiros criados pelo Social Media.",
      tipo: "dias_semana",
      dias_semana: [1, 2, 3, 4, 5],
      tag_name: "Alta",
      subtasks: [
        "Story 1 (Manhã): Postar Story do Roteiro 1",
        "Story 2 (Tarde): Postar Story do Roteiro 2 (Produto/Dica)",
        "Story 3 (Fim da Tarde): Postar Story do Roteiro 3 (Engajamento/CTA)",
      ],
      active: true,
    },
    {
      id: "rotina-reels-ter-qui",
      title: "🎬 2 Reels da Semana (Postar Roteiros do Social Media)",
      description: "Gravar/Editar/Postar os 2 Reels semanais (Terça e Quinta) com os roteiros aprovados pelo Social Media.",
      tipo: "dias_semana",
      dias_semana: [2, 4],
      tag_name: "Urgente",
      subtasks: [
        "Postar/Executar Reel de Terça (Roteiro do Social Media)",
        "Postar/Executar Reel de Quinta (Roteiro do Social Media)",
      ],
      active: true,
    },
    {
      id: "rotina-atendimento-directs",
      title: "💬 Atendimento & Redirecionamento de Leads das Redes",
      description: "Responder directs, comentários e encaminhar orçamentos para o comercial.",
      tipo: "dias_semana",
      dias_semana: [1, 2, 3, 4, 5],
      tag_name: "Urgente",
      subtasks: [
        "Responder todos os Directs e comentários (máx. 30 min)",
        "Verificar links do WhatsApp da Bio e anúncios",
        "Encaminhar interessados em orçamento para a equipe de vendas",
      ],
      active: true,
    },
    {
      id: "rotina-avaliacoes-google",
      title: "⭐ Avaliações no Google Meu Negócio",
      description: "Responder avaliações recebidas e disparar convites de 5 estrelas para clientes.",
      tipo: "dias_semana",
      dias_semana: [1, 2, 3, 4, 5],
      tag_name: "Média",
      subtasks: [
        "Responder 100% das avaliações do Google no dia",
        "Pedir lista de vendas do dia com o comercial",
        "Disparar mensagem no WhatsApp para 5 a 10 clientes pedindo avaliação no Google",
      ],
      active: true,
    },
    {
      id: "rotina-encarte-quarta",
      title: "🎨 Encarte de Promoções da Semana",
      description: "Divulgação dos produtos em destaque na semana para os clientes.",
      tipo: "semanal",
      dia_semana_especifico: 3,
      tag_name: "Alta",
      subtasks: [
        "Selecionar 3 a 5 produtos em oferta com o comercial",
        "Criar imagem do encarte semanal",
        "Publicar no feed/stories e enviar nos grupos de clientes do WhatsApp",
      ],
      active: true,
    },
    {
      id: "rotina-relatorio-sexta",
      title: "📊 Relatório Semanal & Alinhamento com Vendas",
      description: "Análise de alcance, leads gerados e planejamento da semana seguinte.",
      tipo: "semanal",
      dia_semana_especifico: 5,
      tag_name: "Média",
      subtasks: [
        "Extrair alcance, novos seguidores e leads do WhatsApp",
        "Reunião rápida de 10 min com gerente comercial sobre demandas da próxima semana",
      ],
      active: true,
    },
    {
      id: "rotina-mensal-google-waze",
      title: "🗓️ Atualização Mensal do Google Meu Negócio & Waze",
      description: "Renovar fotos da loja, equipe, fachada e horários.",
      tipo: "mensal",
      dia_mes_especifico: 1,
      tag_name: "Baixa",
      subtasks: [
        "Subir fotos novas da fachada, balcão e equipe",
        "Conferir horários de funcionamento e dados de contato",
      ],
      active: true,
    },
    {
      id: "rotina-mensal-parceiros",
      title: "🤝 Relacionamento com Eletricistas e Encanadores Parceiros",
      description: "Contato especial de relacionamento e ofertas exclusivas para parceiros.",
      tipo: "mensal",
      dia_mes_especifico: 15,
      tag_name: "Média",
      subtasks: [
        "Mapear lista de parceiros recorrentes",
        "Enviar mensagem com agradecimento ou condição especial do mês",
      ],
      active: true,
    },
  ];
}

/**
 * Busca todas as demandas recorrentes cadastradas diretamente no Supabase.
 * Se a tabela estiver vazia, efetua o seed inicial dos registros no Supabase.
 */
export async function fetchDemandasRecorrentesSupabase(): Promise<DemandaRecorrente[]> {
  try {
    const { data, error } = await supabase
      .from("marketing_demandas_recorrentes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      return data;
    }

    // Se estiver vazia no Supabase, insere os registros padrão diretamente no banco
    const defaults = getDefaultRotinas();
    await supabase.from("marketing_demandas_recorrentes").upsert(defaults);
    return defaults;
  } catch (err) {
    console.warn("[recorrentes-utils] Falha ao consultar Supabase, usando padrão:", err);
    return getDefaultRotinas();
  }
}

export async function saveDemandaRecorrenteSupabase(rotina: DemandaRecorrente): Promise<void> {
  const { error } = await supabase
    .from("marketing_demandas_recorrentes")
    .upsert([rotina]);

  if (error) {
    console.error("[recorrentes-utils] Erro ao salvar demanda no Supabase:", error);
    throw error;
  }
}

export async function updateDemandaRecorrenteSupabase(
  id: string,
  updates: Partial<DemandaRecorrente>
): Promise<void> {
  const { error } = await supabase
    .from("marketing_demandas_recorrentes")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[recorrentes-utils] Erro ao atualizar demanda no Supabase:", error);
    throw error;
  }
}

export async function deleteDemandaRecorrenteSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from("marketing_demandas_recorrentes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[recorrentes-utils] Erro ao deletar demanda no Supabase:", error);
    throw error;
  }
}
