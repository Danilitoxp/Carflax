import { io, Socket } from "socket.io-client";

/**
 * Evolution API v2 - Service Client
 */

const EVO_CONFIG = {
  url: import.meta.env.VITE_EVO_URL,
  apiKey: import.meta.env.VITE_EVO_API_KEY,
  instance: import.meta.env.VITE_EVO_INSTANCE,
};

const getWsUrl = () => {
  return EVO_CONFIG.url;
};

async function fetchEvo<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${EVO_CONFIG.url}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': EVO_CONFIG.apiKey,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API Error (${response.status}): ${error}`);
  }

  return response.json();
}

export const evolutionApi = {
  /**
   * Conecta ao WebSocket da instância
   */
  connectWebSocket(): Socket {
    const wsUrl = getWsUrl();


    return io(wsUrl, {
      transports: ['polling', 'websocket'],
      query: {
        apikey: EVO_CONFIG.apiKey,
        token: EVO_CONFIG.apiKey,
        instance: EVO_CONFIG.instance,
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 3000
    });
  },

  /**
   * Lista todos os chats (conversas) da instância
   */
  async getChats(): Promise<unknown[]> {
    return fetchEvo<unknown[]>(`/chat/findChats/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({}), // Evolution v2 findChats uses POST
    });
  },

  /**
   * Busca mensagens de uma conversa específica
   */
  async getMessages(remoteJid: string, count: number = 15): Promise<Record<string, unknown>> {
    return fetchEvo<Record<string, unknown>>(`/chat/findMessages/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        where: {
          remoteJid: remoteJid
        },
        take: count
      })
    });
  },

  /**
   * Envia uma mensagem de texto
   */
  async sendText(remoteJid: string, text: string): Promise<unknown> {
    return fetchEvo<unknown>(`/message/sendText/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        text: text,
        delay: 1200,
        linkPreview: true
      }),
    });
  },

  /**
   * Simula o status "digitando..." ou "gravando áudio..."
   */
  async setPresence(remoteJid: string, presence: 'composing' | 'recording' | 'paused'): Promise<unknown> {
    return fetchEvo<unknown>(`/chat/sendPresence/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        presence: presence
      }),
    });
  },

  /**
   * Arquiva ou desarquiva uma conversa
   */
  async archiveChat(remoteJid: string, archive: boolean = true): Promise<unknown> {
    return fetchEvo<unknown>(`/chat/archiveChat/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        archive: archive
      }),
    });
  },

  /**
   * Busca informações de um contato (nome e foto)
   */
  async getContact(remoteJid: string): Promise<{ pushName?: string; profilePicUrl?: string } | null> {
    try {
      const data = await fetchEvo<unknown[]>(`/contact/findContacts/${EVO_CONFIG.instance}`, {
        method: 'POST',
        body: JSON.stringify({ where: { remoteJid } }),
      });
      if (Array.isArray(data) && data.length > 0) {
        const c = data[0] as { pushName?: string; profilePicUrl?: string };
        return c;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Inscreve para receber presença de um contato (abre "canal" de presença no protocolo WhatsApp)
   */
  async subscribePresence(remoteJid: string): Promise<void> {
    try {
      await fetchEvo<unknown>(`/chat/sendPresence/${EVO_CONFIG.instance}`, {
        method: 'POST',
        body: JSON.stringify({ number: remoteJid, presence: 'available', delay: 0 }),
      });
    } catch {
      // silencia — não crítico
    }
  },

  /**
   * Busca a URL da foto de perfil de um contato
   */
  async getProfilePic(remoteJid: string): Promise<string | null> {
    try {
      const data = await fetchEvo<{ profilePicUrl: string }>(`/chat/fetchProfilePicUrl/${EVO_CONFIG.instance}?number=${remoteJid}`);
      return data.profilePicUrl;
    } catch {
      return null;
    }
  },

  /**
   * Baixa a mídia de uma mensagem em base64
   * Usado para salvar fotos, áudios e vídeos no Supabase Storage
   */
  async getMediaBase64(messagePayload: { key?: unknown; message?: unknown } | unknown): Promise<{ base64: string; mimetype: string } | null> {
    try {
      const payload = messagePayload as { key?: unknown; message?: unknown };
      const data = await fetchEvo<{ base64: string; mimetype: string }>(`/chat/getBase64FromMediaMessage/${EVO_CONFIG.instance}`, {
        method: 'POST',
        body: JSON.stringify({
          message: {
            key: payload?.key,
            message: payload?.message
          }
        }),
      });
      return data;
    } catch (error) {
      console.error("[evolutionApi.getMediaBase64] Erro:", error);
      throw error;
    }
  },

  /**
   * Envia uma imagem
   */
  async sendImage(remoteJid: string, imageUrl: string, caption?: string): Promise<unknown> {
    return fetchEvo<unknown>(`/message/sendMedia/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        mediatype: 'image',
        media: imageUrl,
        caption: caption || '',
      }),
    });
  },

  /**
   * Envia um documento (PDF, DOCX, etc.) em base64
   */
  async sendDocument(remoteJid: string, base64: string, mimetype: string, filename: string, caption?: string): Promise<unknown> {
    return fetchEvo<unknown>(`/message/sendMedia/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        mediatype: 'document',
        media: base64,
        mimetype: mimetype,
        fileName: filename,
        caption: caption || '',
      }),
    });
  },

  /**
   * Envia um áudio (PTT = push-to-talk, aparece como nota de voz)
   */
  async sendAudio(remoteJid: string, audioBase64: string): Promise<unknown> {
    return fetchEvo<unknown>(`/message/sendWhatsAppAudio/${EVO_CONFIG.instance}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        audio: audioBase64,
        encoding: true,
      }),
    });
  },

  /**
   * Busca informações da instância (incluindo o número conectado)
   */
  async getInstanceInfo(): Promise<{ instance: { owner: string; profilePictureUrl?: string } } | null> {
    try {
      return await fetchEvo<{ instance: { owner: string; profilePictureUrl?: string } }>(`/instance/connectionState/${EVO_CONFIG.instance}`);
    } catch {
      return null;
    }
  },
};
