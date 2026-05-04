import { supabase } from "./supabase";

export interface MarketingCliente {
  id?: string;
  remote_jid: string;
  nome?: string;
  push_name?: string;
  foto_url?: string;
  status?: string;
  temperatura?: string;
  vendedor_id?: string;
  ultima_mensagem?: string;
  ultima_conversa_em?: string;
  arquivado?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingMessage {
  id?: string;
  message_id: string;
  remote_jid: string;
  texto?: string;
  tipo?: string;
  sender: "me" | "contact";
  status?: string;
  timestamp: string;
  media_url?: string;
  vendedor_id?: string;
  created_at?: string;
}

export const marketingService = {
  /**
   * Atualiza ou insere múltiplos clientes de uma vez (Batch Upsert)
   */
  async upsertClientes(clientes: MarketingCliente[]) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("marketing_clientes")
      .upsert(
        clientes.map(c => ({ ...c, updated_at: now })),
        { onConflict: "remote_jid" }
      )
      .select();

    if (error) {
      console.error("[MarketingService] Erro ao upsert clientes:", error.message);
      return [];
    }
    return data;
  },

  /**
   * Atalho para atualizar um único cliente
   */
  async upsertCliente(cliente: MarketingCliente) {
    const results = await this.upsertClientes([cliente]);
    return results.length > 0 ? results[0] : null;
  },

  /**
   * Busca apenas clientes que possuem mensagens no banco (CRM Ativo)
   */
  async getActiveClientes(includeArchived = false) {
    const { data: activeJids } = await supabase
      .from('marketing_whatsapp')
      .select('remote_jid')
      .like('remote_jid', '%@s.whatsapp.net');
    
    const uniqueJids = [...new Set((activeJids || []).map(m => m.remote_jid))];

    if (uniqueJids.length === 0) return [];

    let query = supabase
      .from("marketing_clientes")
      .select("*")
      .in('remote_jid', uniqueJids);
    
    // Tenta filtrar por arquivado, mas ignora se a coluna não existir (evita quebrar o app)
    if (!includeArchived) {
      query = query.or('arquivado.eq.false,arquivado.is.null');
    } else {
      query = query.eq('arquivado', true);
    }

    const { data, error } = await query.order("ultima_conversa_em", { ascending: false });

    if (error) {
      // Se o erro for de coluna inexistente, faz a busca sem o filtro
      if (error.message.includes("column") && error.message.includes("arquivado")) {
        console.warn("[MarketingService] Coluna 'arquivado' não encontrada. Buscando sem filtro.");
        const { data: retryData } = await supabase
          .from("marketing_clientes")
          .select("*")
          .in('remote_jid', uniqueJids)
          .order("ultima_conversa_em", { ascending: false });
        return retryData || [];
      }
      console.error("[MarketingService] Erro ao buscar clientes ativos:", error.message);
      return [];
    }
    return data;
  },

  /**
   * Busca todos os clientes/contatos
   */
  async getClientes(includeArchived = false) {
    let query = supabase
      .from("marketing_clientes")
      .select("*");
    
    if (!includeArchived) {
      query = query.or('arquivado.eq.false,arquivado.is.null');
    }

    const { data, error } = await query.order("ultima_conversa_em", { ascending: false });

    if (error) {
      if (error.message.includes("column") && error.message.includes("arquivado")) {
        const { data: retryData } = await supabase
          .from("marketing_clientes")
          .select("*")
          .order("ultima_conversa_em", { ascending: false });
        return (retryData || []) as MarketingCliente[];
      }
      console.error("[MarketingService] Erro ao buscar clientes:", error.message);
      return [];
    }
    return data as MarketingCliente[];
  },

  /**
   * Salva uma nova mensagem
   */
  async saveMessage(msg: MarketingMessage) {
    const { error } = await supabase
      .from("marketing_whatsapp")
      .upsert(msg, { onConflict: "message_id" });

    if (error) {
      console.error("[MarketingService] Erro ao salvar mensagem:", error.message);
      return false;
    }

    // Atualiza o resumo no cliente
    await supabase
      .from("marketing_clientes")
      .update({
        ultima_mensagem: msg.texto,
        ultima_conversa_em: msg.timestamp,
        updated_at: new Date().toISOString()
      })
      .eq("remote_jid", msg.remote_jid);

    return true;
  },

  /**
   * Busca histórico de mensagens de um JID específico
   */
  async getMessagesByJid(remoteJid: string, limit = 50, sinceDate?: string) {
    let query = supabase
      .from("marketing_whatsapp")
      .select("*")
      .eq("remote_jid", remoteJid);

    if (sinceDate) {
      query = query.gte("timestamp", sinceDate);
    }

    const { data, error } = await query
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[MarketingService] Erro ao buscar mensagens:", error.message);
      return [];
    }
    return data as MarketingMessage[];
  }
};
