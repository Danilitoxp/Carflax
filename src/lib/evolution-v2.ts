import { io, Socket } from "socket.io-client";

/**
 * Evolution API v2 - Service Client
 */

const EVO_CONFIG = {
  url: import.meta.env.VITE_EVO_URL,
  apiKey: import.meta.env.VITE_EVO_API_KEY,
  instance: import.meta.env.VITE_EVO_INSTANCE,
};

// Converte URL de HTTP para WS/WSS
const getWsUrl = () => {
  // Tentando o padrão /websocket/instancia (comum em v2/Easypanel)
  const baseUrl = EVO_CONFIG.url.replace(/^http/, 'ws');
  return `${baseUrl}/websocket/${EVO_CONFIG.instance}`;
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
    console.log("Tentando conexão WebSocket (/websocket/instancia) em:", wsUrl);
    
    return io(wsUrl, {
      transports: ['websocket'],
      query: {
        apikey: EVO_CONFIG.apiKey
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
   * Busca a URL da foto de perfil de um contato
   */
  async getProfilePic(remoteJid: string): Promise<string | null> {
    try {
      const data = await fetchEvo<{ profilePicUrl: string }>(`/chat/fetchProfilePicUrl/${EVO_CONFIG.instance}?number=${remoteJid}`);
      return data.profilePicUrl;
    } catch {
      return null;
    }
  }
};
