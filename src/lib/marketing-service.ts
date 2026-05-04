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
  fixado?: boolean;
  motivo_arquivamento?: string;
  mensagens_nao_lidas?: number;
  valor_venda?: number;
  data_venda?: string;
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
  reacao?: string;
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
  },

  async togglePin(remoteJid: string, pin: boolean) {
    const { error } = await supabase
      .from("marketing_clientes")
      .update({ fixado: pin, updated_at: new Date().toISOString() })
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao fixar/desafixar:", error);
      throw error;
    }
  },

  async markAsRead(remoteJid: string) {
    const { error } = await supabase
      .from("marketing_clientes")
      .update({ mensagens_nao_lidas: 0, updated_at: new Date().toISOString() })
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao marcar como lido:", error.message);
    }
  },

  async incrementUnread(remoteJid: string) {
    // Atualização manual para evitar erros 404 de RPC ausente
    const { data } = await supabase
      .from("marketing_clientes")
      .select("mensagens_nao_lidas")
      .eq("remote_jid", remoteJid)
      .single();
      
    if (data) {
      await supabase
        .from("marketing_clientes")
        .update({ 
          mensagens_nao_lidas: (data.mensagens_nao_lidas || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("remote_jid", remoteJid);
    }
  },

  async toggleArchived(remoteJid: string, archived: boolean, motivo?: string) {
    const updatePayload: Record<string, unknown> = {
      arquivado: archived,
      updated_at: new Date().toISOString()
    };

    // Salva o motivo no campo 'status' que já existe na tabela
    if (motivo) {
      updatePayload.status = motivo;
    }

    const { error } = await supabase
      .from("marketing_clientes")
      .update(updatePayload)
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao arquivar/desarquivar:", error);
      throw error;
    }
  },

  /**
   * Registra uma venda manual para o lead
   */
  async registerSale(remoteJid: string, value: number) {
    const { error } = await supabase
      .from("marketing_clientes")
      .update({ 
        valor_venda: value,
        data_venda: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao registrar venda:", error);
      throw error;
    }
  },

  /**
   * Faz o upload de uma mídia em base64 para o Supabase Storage e retorna a URL pública
   */
  async uploadMedia(base64: string, mimetype: string, filename: string): Promise<string | null> {
    try {
      // Converte base64 para Blob
      const res = await fetch(`data:${mimetype};base64,${base64}`);
      const blob = await res.blob();

      // Upload para o bucket "whatsapp-media"
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .upload(filename, blob, {
          contentType: mimetype,
          upsert: true
        });

      if (error) {
        console.error('[MarketingService] Erro no upload da mídia:', error);
        return null;
      }

      // Retorna a URL pública
      const { data: publicUrlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('[MarketingService] Erro ao processar mídia:', error);
      return null;
    }
  },

  /**
   * Busca estatísticas de leads (hoje e mês)
   */
  async getMarketingStats(date?: Date) {
    const selectedDate = date || new Date();
    const startOfSelectedDay = new Date(selectedDate);
    startOfSelectedDay.setHours(0, 0, 0, 0);
    const endOfSelectedDay = new Date(selectedDate);
    endOfSelectedDay.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();

    const { count: leadsToday } = await supabase
      .from('marketing_clientes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfSelectedDay.toISOString())
      .lte('created_at', endOfSelectedDay.toISOString());

    const { count: leadsMonth } = await supabase
      .from('marketing_clientes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', endOfSelectedDay.toISOString());

    const { data: salesToday } = await supabase
      .from('marketing_clientes')
      .select('valor_venda')
      .gte('data_venda', startOfSelectedDay.toISOString())
      .lte('data_venda', endOfSelectedDay.toISOString());

    const { data: salesMonth } = await supabase
      .from('marketing_clientes')
      .select('valor_venda')
      .gte('data_venda', firstDayOfMonth)
      .lte('data_venda', endOfSelectedDay.toISOString());

    const billingToday = (salesToday || []).reduce((acc, s) => acc + (s.valor_venda || 0), 0);
    const billingMonth = (salesMonth || []).reduce((acc, s) => acc + (s.valor_venda || 0), 0);

    return {
      leadsToday: leadsToday || 0,
      leadsMonth: leadsMonth || 0,
      billingToday,
      billingMonth,
      salesCountToday: (salesToday || []).length,
      salesCountMonth: (salesMonth || []).length
    };
  },

  /**
   * Busca leads agrupados por hora para um gráfico de picos
   */
  async getHourlyLeads(date: Date) {
    const startOfSelectedDay = new Date(date);
    startOfSelectedDay.setHours(0, 0, 0, 0);
    const endOfSelectedDay = new Date(date);
    endOfSelectedDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('marketing_clientes')
      .select('created_at')
      .gte('created_at', startOfSelectedDay.toISOString())
      .lte('created_at', endOfSelectedDay.toISOString());

    const hourlyCounts = new Array(24).fill(0);
    data?.forEach(lead => {
      const hour = new Date(lead.created_at).getHours();
      hourlyCounts[hour]++;
    });

    return hourlyCounts;
  }
};
