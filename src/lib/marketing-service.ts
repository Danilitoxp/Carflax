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
  origem?: string;
  campanha?: string;
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
  editado?: boolean;
  quoted_text?: string;
  quoted_sender?: "me" | "contact";
  // Preview de link (Open Graph) capturado do payload do WhatsApp em mensagens recebidas
  link_preview?: {
    url: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
}

export interface MarketingVenda {
  id?: string;
  remote_jid: string;
  valor: number;
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
   * Busca um cliente pelo remote_jid
   */
  async getCliente(remoteJid: string): Promise<MarketingCliente | null> {
    const { data, error } = await supabase
      .from("marketing_clientes")
      .select("*")
      .eq("remote_jid", remoteJid)
      .maybeSingle();

    if (error) {
      console.error("[MarketingService] Erro ao buscar cliente:", error.message);
      return null;
    }
    return data;
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
  async getActiveClientes(includeArchived: boolean | 'all' = false, limit = 50, offset = 0, vendedorId?: string) {
    let query = supabase
      .from("marketing_clientes")
      .select("*")
      .not('ultima_conversa_em', 'is', null)
      .like('remote_jid', '%@s.whatsapp.net');

    if (vendedorId) {
      query = query.eq('vendedor_id', vendedorId);
    }

    if (includeArchived !== 'all') {
      if (!includeArchived) {
        query = query.or('arquivado.eq.false,arquivado.is.null');
      } else {
        query = query.eq('arquivado', true);
      }
    }

    const { data, error } = await query
      .order("ultima_conversa_em", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.message.includes("column") && error.message.includes("arquivado")) {
        const { data: retryData } = await supabase
          .from("marketing_clientes")
          .select("*")
          .not('ultima_conversa_em', 'is', null)
          .like('remote_jid', '%@s.whatsapp.net')
          .order("ultima_conversa_em", { ascending: false })
          .range(offset, offset + limit - 1);
        return (retryData || []) as MarketingCliente[];
      }
      console.error("[MarketingService] Erro ao buscar clientes ativos:", error.message);
      return [];
    }
    return (data || []) as MarketingCliente[];
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

    // Atualiza ou cria o registro do cliente
    await supabase
      .from("marketing_clientes")
      .upsert({
        remote_jid: msg.remote_jid,
        ultima_mensagem: msg.texto,
        ultima_conversa_em: msg.timestamp,
        updated_at: new Date().toISOString()
      }, { onConflict: "remote_jid", ignoreDuplicates: false });

    return true;
  },

  /**
   * Busca histórico de mensagens de um JID específico.
   * Suporta paginação: `beforeDate` carrega mensagens ANTERIORES a esse timestamp (scroll infinito para cima).
   */
  async getMessagesByJid(remoteJid: string, limit = 50, sinceDate?: string, beforeDate?: string, vendedorId?: string) {
    let query = supabase
      .from("marketing_whatsapp")
      .select("message_id, remote_jid, sender, texto, tipo, status, timestamp, media_url, reacao, vendedor_id, editado, quoted_text, quoted_sender, link_preview")
      .eq("remote_jid", remoteJid);

    if (vendedorId) {
      query = query.eq("vendedor_id", vendedorId);
    }

    if (sinceDate) query = query.gte("timestamp", sinceDate);
    if (beforeDate) query = query.lt("timestamp", beforeDate);

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

  async markAsUnread(remoteJid: string, count = 1) {
    const { error } = await supabase
      .from("marketing_clientes")
      .update({ mensagens_nao_lidas: count, updated_at: new Date().toISOString() })
      .eq("remote_jid", remoteJid);

    if (error) {
      console.error("[MarketingService] Erro ao marcar como não lido:", error.message);
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

  async archiveInactiveClientes(days = 2, motivo = "Inatividade") {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { error } = await supabase
      .from("marketing_clientes")
      .update({
        arquivado: true,
        status: motivo,
        updated_at: new Date().toISOString()
      })
      .or("arquivado.eq.false,arquivado.is.null")
      .like('remote_jid', '%@s.whatsapp.net')
      .lt("ultima_conversa_em", cutoffDate.toISOString());

    if (error) {
      console.error("[MarketingService] Erro ao arquivar inativos:", error.message);
      throw error;
    }
    return true;
  },

  /**
   * Busca leads de forma paginada com filtros aplicados diretamente no Supabase
   */
  async getLeadsPaginated(limit = 50, offset = 0, search = "", filterTemperature = "Todas as Temperaturas") {
    let query = supabase
      .from("marketing_clientes")
      .select("*", { count: "exact" })
      .or("status.is.null,and(status.neq.Negociando,status.neq.Convertido)");

    if (search) {
      query = query.or(`nome.ilike.%${search}%,push_name.ilike.%${search}%,remote_jid.ilike.%${search}%`);
    }

    if (filterTemperature !== "Todas as Temperaturas") {
      query = query.eq("temperatura", filterTemperature);
    }

    const { data, error, count } = await query
      .order("ultima_conversa_em", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[MarketingService] Erro ao buscar leads paginados:", error.message);
      return { data: [], count: 0 };
    }
    return { data: (data || []) as MarketingCliente[], count: count || 0 };
  },

  async registerSale(remoteJid: string, value: number) {
    const { error: vendaError } = await supabase
      .from("marketing_vendas")
      .insert({ remote_jid: remoteJid, valor: value });

    if (vendaError) {
      console.error("[MarketingService] Erro ao inserir venda:", vendaError);
      throw vendaError;
    }

    const { data: vendas } = await supabase
      .from("marketing_vendas")
      .select("valor")
      .eq("remote_jid", remoteJid);

    const totalVendas = (vendas || []).reduce((acc, v) => acc + (Number(v.valor) || 0), 0);

    await supabase
      .from("marketing_clientes")
      .update({
        valor_venda: totalVendas,
        data_venda: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("remote_jid", remoteJid);
  },

  async deleteSale(remoteJid: string) {
    await supabase
      .from("marketing_vendas")
      .delete()
      .eq("remote_jid", remoteJid);

    await supabase
      .from("marketing_clientes")
      .update({ valor_venda: null, data_venda: null, updated_at: new Date().toISOString() })
      .eq("remote_jid", remoteJid);
  },

  async getSalesByJid(remoteJid: string): Promise<MarketingVenda[]> {
    const { data } = await supabase
      .from("marketing_vendas")
      .select("*")
      .eq("remote_jid", remoteJid)
      .order("created_at", { ascending: false });
    return (data || []) as MarketingVenda[];
  },

  async updateMessageMediaUrl(messageId: string, mediaUrl: string) {
    await supabase
      .from("marketing_whatsapp")
      .update({ media_url: mediaUrl })
      .eq("message_id", messageId);
  },

  async updateMessageLinkPreview(messageId: string, linkPreview: MarketingMessage["link_preview"]) {
    await supabase
      .from("marketing_whatsapp")
      .update({ link_preview: linkPreview })
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

    // Faturamento no período (da tabela marketing_vendas)
    const { data: salesInPeriod } = await supabase
      .from('marketing_vendas')
      .select('valor')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Faturamento no mês inteiro
    const { data: salesMonth } = await supabase
      .from('marketing_vendas')
      .select('valor')
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);

    const billingInPeriod = (salesInPeriod || []).reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
    const billingMonth = (salesMonth || []).reduce((acc, s) => acc + (Number(s.valor) || 0), 0);

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
  },

  async exportLeadsXlsx(startDate: Date, endDate?: Date) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    const [{ data: leadsByCriacao }, { data: vendasNoPeriodo }] = await Promise.all([
      supabase
        .from('marketing_clientes')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      supabase
        .from('marketing_vendas')
        .select('remote_jid, valor, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
    ]);

    const vendasByJid: Record<string, { valor: number; created_at: string }[]> = {};
    (vendasNoPeriodo || []).forEach(v => {
      if (!vendasByJid[v.remote_jid]) vendasByJid[v.remote_jid] = [];
      vendasByJid[v.remote_jid].push({ valor: Number(v.valor) || 0, created_at: v.created_at });
    });

    const jidsComVenda = Object.keys(vendasByJid);
    const jidsLeads = new Set((leadsByCriacao || []).map(l => l.remote_jid));
    const jidsFaltando = jidsComVenda.filter(jid => !jidsLeads.has(jid));

    let leadsFaltantes: typeof leadsByCriacao = [];
    if (jidsFaltando.length > 0) {
      const { data } = await supabase
        .from('marketing_clientes')
        .select('*')
        .in('remote_jid', jidsFaltando);
      leadsFaltantes = data || [];
    }

    const leadsMap = new Map<string, NonNullable<typeof leadsByCriacao>[0]>();
    [...(leadsByCriacao || []), ...leadsFaltantes].forEach(l => {
      if (!leadsMap.has(l.remote_jid)) leadsMap.set(l.remote_jid, l);
    });
    const leads = Array.from(leadsMap.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    if (leads.length === 0) return null;

    const allJids = leads.map(l => l.remote_jid);
    const messagesByJid: Record<string, { sender: string; timestamp: string }[]> = {};

    const batchSize = 30;
    for (let i = 0; i < allJids.length; i += batchSize) {
      const batch = allJids.slice(i, i + batchSize);
      const { data: msgs } = await supabase
        .from('marketing_whatsapp')
        .select('remote_jid, sender, timestamp')
        .in('remote_jid', batch)
        .order('timestamp', { ascending: true })
        .limit(5000);
      (msgs || []).forEach(m => {
        if (!messagesByJid[m.remote_jid]) messagesByJid[m.remote_jid] = [];
        messagesByJid[m.remote_jid].push(m);
      });
    }

    const formatDate = (d: string | undefined | null) => {
      if (!d) return '';
      const date = new Date(d);
      return date.toLocaleDateString('pt-BR');
    };

    const formatPhone = (jid: string) => {
      const num = jid.replace('@s.whatsapp.net', '');
      if (num.length >= 12) {
        const ddd = num.slice(2, 4);
        const part1 = num.slice(4, 9);
        const part2 = num.slice(9);
        return `(${ddd}) ${part1}-${part2}`;
      }
      return num;
    };

    const calcResponseMinutes = (jid: string, createdAt: string): number | null => {
      const msgs = messagesByJid[jid];
      if (!msgs || msgs.length === 0) return null;
      const firstContact = msgs.find(m => m.sender === 'contact');
      if (!firstContact) {
        const firstOur = msgs.find(m => m.sender === 'me');
        if (!firstOur) return null;
        const diff = (new Date(firstOur.timestamp).getTime() - new Date(createdAt).getTime()) / 60000;
        return diff >= 0 && diff <= 1440 ? diff : null;
      }
      const firstResponse = msgs.find(m => m.sender === 'me' && m.timestamp > firstContact.timestamp);
      if (!firstResponse) return null;
      const diff = (new Date(firstResponse.timestamp).getTime() - new Date(firstContact.timestamp).getTime()) / 60000;
      return diff >= 0 && diff <= 1440 ? diff : null;
    };

    const allMinutes = leads.map(l => calcResponseMinutes(l.remote_jid, l.created_at)).filter((v): v is number => v !== null);
    const avgMinutes = allMinutes.length > 0 ? allMinutes.reduce((a, b) => a + b, 0) / allMinutes.length : 5;

    const formatMinutes = (min: number): string => {
      if (min < 1) return '< 1 min';
      if (min < 60) return `${Math.round(min)} min`;
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };

    const resolveStatus = (lead: typeof leads[0]) => {
      if (lead.status === 'Convertido') return 'Convertido';
      if (lead.status === 'Arquivado') return lead.motivo_arquivamento || 'Arquivado';
      if (lead.status && lead.status !== 'Novo Lead') return lead.status;
      const msgs = messagesByJid[lead.remote_jid];
      if (!msgs || msgs.length === 0) return 'Cliente Curioso';
      const hasOurReply = msgs.some(m => m.sender === 'me');
      return hasOurReply ? 'Em Conversa' : 'Cliente Curioso';
    };

    const resolveName = (lead: typeof leads[0]) => {
      if (lead.nome && lead.nome.trim()) return lead.nome.trim();
      if (lead.push_name && lead.push_name.trim()) return lead.push_name.trim();
      return formatPhone(lead.remote_jid);
    };

    const rows = leads.map((lead, idx) => {
      const vendas = vendasByJid[lead.remote_jid] || [];
      const totalVendas = vendas.reduce((acc, v) => acc + v.valor, 0);
      const ultimaVenda = vendas.length > 0 ? vendas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null;

      return {
        'ID Lead': String(idx + 1).padStart(4, '0'),
        'Data de Entrada': formatDate(lead.created_at),
        'Nome Cliente': resolveName(lead),
        'WhatsApp/Telefone': formatPhone(lead.remote_jid),
        'Status': resolveStatus(lead),
        'Temperatura': lead.temperatura || '',
        'Vendedor': 'Guilherme Santana',
        'Última Interação': formatDate(lead.ultima_conversa_em),
        'Qtd Vendas': vendas.length,
        'Valor Venda (R$)': totalVendas,
        'Data Última Venda': formatDate(ultimaVenda),
        'Tempo Resposta': formatMinutes(calcResponseMinutes(lead.remote_jid, lead.created_at) ?? avgMinutes)
      };
    });

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const title = [['REGISTRO DE LEADS — CARFLAX']];
    const subtitle = [[`Período: ${formatDate(start.toISOString())} até ${formatDate(end.toISOString())}`]];
    const blank = [['']];

    const ws = XLSX.utils.aoa_to_sheet([...title, ...subtitle, ...blank]);
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A4' });

    const colWidths = [
      { wch: 10 }, { wch: 16 }, { wch: 25 }, { wch: 20 },
      { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 16 },
      { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Leads Tráfego');

    const fileName = `Leads_Carflax_${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
  }
};
