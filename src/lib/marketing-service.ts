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
   * Remove um cliente permanentemente
   */
  async deleteCliente(remoteJid: string) {
    const { error } = await supabase
      .from("marketing_clientes")
      .delete()
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao deletar cliente:", error.message);
      throw error;
    }
    return true;
  },

  /**
   * Busca apenas clientes que possuem mensagens no banco (CRM Ativo)
   */
  async getActiveClientes(includeArchived: boolean | 'all' = false) {
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

    if (includeArchived !== 'all') {
      if (!includeArchived) {
        query = query.or('arquivado.eq.false,arquivado.is.null');
      } else {
        query = query.eq('arquivado', true);
      }
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
    return data || [];
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
  async getMessagesByJid(remoteJid: string, limit = 200, sinceDate?: string) {
    let query = supabase
      .from("marketing_whatsapp")
      .select("*")
      .eq("remote_jid", remoteJid);

    if (sinceDate) {
      query = query.gte("timestamp", sinceDate);
    }

    // Busca as mais recentes (DESC) e reverte no retorno para exibir do mais antigo ao mais novo
    const { data, error } = await query
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[MarketingService] Erro ao buscar mensagens:", error.message);
      return [];
    }
    return ((data as MarketingMessage[]) || []).reverse();
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

  async updateMessageStatus(messageId: string, status: string) {
    // Usa upsert via message_id para evitar CORS com PATCH em alguns ambientes
    const { data: existing } = await supabase
      .from("marketing_whatsapp")
      .select("message_id, remote_jid, sender, timestamp")
      .eq("message_id", messageId)
      .single();

    if (!existing) return;

    const { error } = await supabase
      .from("marketing_whatsapp")
      .upsert({ ...existing, status }, { onConflict: "message_id" });

    if (error) {
      console.error("[MarketingService] Erro ao atualizar status da mensagem:", error.message);
    }
  },

  async incrementUnread(remoteJid: string) {
    // Incremento atômico via stored procedure — crie esta função no Supabase SQL Editor:
    // CREATE OR REPLACE FUNCTION increment_unread(jid TEXT) RETURNS void LANGUAGE sql AS
    // $$ UPDATE marketing_clientes SET mensagens_nao_lidas = COALESCE(mensagens_nao_lidas,0)+1,
    //    updated_at = now() WHERE remote_jid = jid; $$;
    const { error } = await supabase.rpc('increment_unread', { jid: remoteJid });
    if (error) {
      // Fallback (não atômico) enquanto a função não existir no banco
      const { data } = await supabase
        .from("marketing_clientes")
        .select("mensagens_nao_lidas")
        .eq("remote_jid", remoteJid)
        .single();
      if (data) {
        await supabase
          .from("marketing_clientes")
          .update({ mensagens_nao_lidas: (data.mensagens_nao_lidas || 0) + 1, updated_at: new Date().toISOString() })
          .eq("remote_jid", remoteJid);
      }
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

  async deleteSale(remoteJid: string) {
    const { error } = await supabase
      .from("marketing_clientes")
      .update({ valor_venda: null, data_venda: null, updated_at: new Date().toISOString() })
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao remover venda:", error);
      throw error;
    }
  },

  async updateMessageMediaUrl(messageId: string, mediaUrl: string) {
    await supabase
      .from("marketing_whatsapp")
      .update({ media_url: mediaUrl })
      .eq("message_id", messageId);
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
   * Busca estatísticas de leads (hoje e período) com suporte a filtros
   */
  async getMarketingStats(startDate: Date, endDate?: Date, filters?: { searchTerm?: string; status?: string; seller?: string; temperature?: string }) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    // Para o comparativo mensal, pegamos sempre o mês inteiro da data inicial selecionada
    const firstDayOfMonth = new Date(start.getFullYear(), start.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (query: any) => {
      if (filters?.searchTerm) {
        query = query.or(`nome.ilike.%${filters.searchTerm}%,remote_jid.ilike.%${filters.searchTerm}%`);
      }
      if (filters?.status && filters.status !== "Todos os Status") {
        query = query.eq('status', filters.status);
      }
      if (filters?.seller && filters.seller !== "Todos os Vendedores") {
        query = query.eq('vendedor_id', filters.seller);
      }
      if (filters?.temperature && filters.temperature !== "Todas as Temperaturas") {
        query = query.eq('temperatura', filters.temperature);
      }
      return query;
    };

    // Contagem de leads no período selecionado
    let leadsQuery = supabase
      .from('marketing_clientes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    
    leadsQuery = applyFilters(leadsQuery);
    const { count: leadsInPeriod } = await leadsQuery;

    // Contagem de leads no mês inteiro (para o card de leads no mês)
    let leadsMonthQuery = supabase
      .from('marketing_clientes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);
    
    leadsMonthQuery = applyFilters(leadsMonthQuery);
    const { count: leadsMonth } = await leadsMonthQuery;

    // Contagens por temperatura no período
    const getTempCount = async (temp: string) => {
      let q = supabase
        .from('marketing_clientes')
        .select('*', { count: 'exact', head: true })
        .eq('temperatura', temp)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      q = applyFilters(q);
      const { count } = await q;
      return count || 0;
    };

    const [frio, morno, quente] = await Promise.all([
      getTempCount('Frio'),
      getTempCount('Morno'),
      getTempCount('Quente')
    ]);

    // Faturamento no período selecionado (Vendas Hoje/Período)
    let salesQuery = supabase
      .from('marketing_clientes')
      .select('valor_venda')
      .gte('data_venda', start.toISOString())
      .lte('data_venda', end.toISOString());
    
    salesQuery = applyFilters(salesQuery);
    const { data: salesInPeriod } = await salesQuery;

    // Faturamento no mês inteiro
    let salesMonthQuery = supabase
      .from('marketing_clientes')
      .select('valor_venda')
      .gte('data_venda', firstDayOfMonth)
      .lte('data_venda', lastDayOfMonth);
    
    salesMonthQuery = applyFilters(salesMonthQuery);
    const { data: salesMonth } = await salesMonthQuery;

    const billingInPeriod = (salesInPeriod || []).reduce((acc, s) => acc + (Number(s.valor_venda) || 0), 0);
    const billingMonth = (salesMonth || []).reduce((acc, s) => acc + (Number(s.valor_venda) || 0), 0);

    return {
      leadsToday: leadsInPeriod || 0,
      leadsMonth: leadsMonth || 0,
      frioToday: frio,
      mornoToday: morno,
      quenteToday: quente,
      billingToday: billingInPeriod,
      billingMonth,
      salesCountToday: (salesInPeriod || []).length,
      salesCountMonth: (salesMonth || []).length
    };
  },

  /**
   * Calcula o tempo médio de primeira resposta (em minutos) para o período.
   * Lógica: para cada conversa, encontra a 1ª mensagem do cliente e a 1ª
   * resposta nossa após ela. Retorna a média em minutos (ou null se sem dados).
   */
  async getAvgFirstResponseTime(startDate: Date, endDate?: Date): Promise<number | null> {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);

      const isBusinessHour = (date: Date): boolean => {
        const dow = date.getDay();
        if (dow === 0 || dow === 6) return false;
        const minutes = date.getHours() * 60 + date.getMinutes();
        return minutes >= 7 * 60 + 30 && minutes <= 17 * 60 + 30;
      };

      const { data, error } = await supabase
        .from("marketing_whatsapp")
        .select("remote_jid, sender, timestamp")
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .order("timestamp", { ascending: true });

      if (error || !data || data.length === 0) return null;

      const byJid: Record<string, { sender: string; timestamp: string }[]> = {};
      for (const msg of data) {
        if (!msg.remote_jid || !msg.sender || !msg.timestamp) continue;
        if (!byJid[msg.remote_jid]) byJid[msg.remote_jid] = [];
        byJid[msg.remote_jid].push({ sender: msg.sender, timestamp: msg.timestamp });
      }

      const deltas: number[] = [];
      for (const msgs of Object.values(byJid)) {
        const firstContactIdx = msgs.findIndex(m => {
          if (m.sender !== "contact") return false;
          return isBusinessHour(new Date(m.timestamp));
        });
        if (firstContactIdx === -1) continue;

        const firstContactTime = new Date(msgs[firstContactIdx].timestamp).getTime();
        const firstResponse = msgs.slice(firstContactIdx + 1).find(m => m.sender === "me");
        if (!firstResponse) continue;

        const diffMinutes = (new Date(firstResponse.timestamp).getTime() - firstContactTime) / 60000;
        if (diffMinutes >= 0 && diffMinutes <= 1440) deltas.push(diffMinutes);
      }

      if (deltas.length === 0) return null;
      return deltas.reduce((a, b) => a + b, 0) / deltas.length;
    } catch {
      return null;
    }
  },

  /**
   * Busca leads agrupados por hora para um gráfico de picos
   */
  async getHourlyLeads(startDate: Date, endDate?: Date, filters?: { searchTerm?: string; status?: string; seller?: string; temperature?: string }) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    let query = supabase
      .from('marketing_clientes')
      .select('created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (filters?.searchTerm) {
      query = query.or(`nome.ilike.%${filters.searchTerm}%,remote_jid.ilike.%${filters.searchTerm}%`);
    }
    if (filters?.status && filters.status !== "Todos os Status") {
      query = query.eq('status', filters.status);
    }
    if (filters?.seller && filters.seller !== "Todos os Vendedores") {
      query = query.eq('vendedor_id', filters.seller);
    }
    if (filters?.temperature && filters.temperature !== "Todas as Temperaturas") {
      query = query.eq('temperatura', filters.temperature);
    }

    const { data } = await query;

    const hourlyCounts = new Array(24).fill(0);
    data?.forEach(lead => {
      const hour = new Date(lead.created_at).getHours();
      hourlyCounts[hour]++;
    });

    return hourlyCounts;
  }
};
