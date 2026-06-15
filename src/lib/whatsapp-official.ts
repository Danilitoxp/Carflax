import { Socket } from "socket.io-client";

/**
 * Cliente de serviço para o WhatsApp Oficial (Meta Cloud API)
 * Emula a interface da antiga Evolution API v2 para compatibilidade de tipos.
 */

export interface EvoSendResponse {
  key: { id: string; remoteJid: string; fromMe: boolean };
  status: string;
}

export interface InstanceInfoResponse {
  instance: {
    owner: string;
    profilePictureUrl?: string;
  };
}

export interface MediaBase64Response {
  base64: string;
  mimetype: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

export const whatsappOfficialApi = {
  /**
   * Conecta ao WebSocket (Mockado - o frontend usará Supabase Realtime diretamente)
   */
  connectWebSocket(): Socket {
    console.log("[whatsappOfficialApi] Usando Supabase Realtime em vez do WebSocket da Evolution API.");
    return {
      on() {
        // No-op
      },
      off() {},
      connected: true,
      active: true,
    } as unknown as Socket;
  },

  /**
   * Lista todos os chats (não necessário, a UI carrega do Supabase)
   */
  async getChats(): Promise<unknown[]> {
    return [];
  },

  /**
   * Busca mensagens de uma conversa específica (não necessário, a UI carrega do Supabase)
   */
  async getMessages(remoteJid?: string, count?: number): Promise<unknown> {
    void remoteJid;
    void count;
    return { data: [] };
  },

  /**
   * Envia uma mensagem de texto chamando o nosso backend
   */
  async sendText(remoteJid: string, text: string): Promise<EvoSendResponse> {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: remoteJid,
        text: text,
        type: "text"
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro no envio da mensagem: ${error}`);
    }

    return response.json();
  },

  /**
   * Simula o status "digitando..." ou "gravando áudio..." (Não suportado pela Meta Cloud API)
   */
  async setPresence(remoteJid?: string, presence?: 'composing' | 'recording' | 'paused'): Promise<unknown> {
    void remoteJid;
    void presence;
    return { ok: true };
  },

  /**
   * Arquiva ou desarquiva uma conversa (Tratado localmente via Supabase no marketingService)
   */
  async archiveChat(remoteJid?: string, archive?: boolean): Promise<unknown> {
    void remoteJid;
    void archive;
    return { ok: true };
  },

  /**
   * Busca informações de um contato (não necessário, a UI carrega do Supabase)
   */
  async getContact(remoteJid?: string): Promise<unknown> {
    void remoteJid;
    return null;
  },

  /**
   * Inscreve para receber presença de um contato (Não suportado pela Meta Cloud API)
   */
  async subscribePresence(remoteJid?: string): Promise<void> {
    void remoteJid;
  },

  /**
   * Busca a URL da foto de perfil de um contato (Não suportado publicamente de forma simples)
   */
  async getProfilePic(remoteJid?: string): Promise<string | null> {
    void remoteJid;
    return null;
  },

  /**
   * Baixa a mídia de uma mensagem em base64 (Tratado pelo webhook do backend)
   */
  async getMediaBase64(messagePayload?: unknown): Promise<MediaBase64Response | null> {
    void messagePayload;
    return null;
  },

  /**
   * Envia uma imagem
   */
  async sendImage(remoteJid: string, imageUrl: string, caption?: string): Promise<unknown> {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: remoteJid,
        text: caption,
        type: "image",
        mediaUrl: imageUrl
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro no envio da imagem: ${error}`);
    }

    return response.json();
  },

  /**
   * Envia um documento (Aceita uma URL do Supabase Storage ou base64)
   */
  async sendDocument(remoteJid: string, fileUrlOrBase64: string, mimetype: string, filename: string, caption?: string): Promise<EvoSendResponse> {
    let mediaUrl = fileUrlOrBase64;

    if (fileUrlOrBase64.startsWith("data:") || !fileUrlOrBase64.startsWith("http")) {
      const base64Data = fileUrlOrBase64.includes("base64,") ? fileUrlOrBase64.split("base64,")[1] : fileUrlOrBase64;
      const cleanMimetype = mimetype || "application/octet-stream";
      const ext = filename.split(".").pop() || "bin";
      const storageFilename = `doc_${Date.now()}.${ext}`;

      const { marketingService } = await import("./marketing-service");
      const publicUrl = await marketingService.uploadMedia(base64Data, cleanMimetype, storageFilename);
      if (!publicUrl) {
        throw new Error("Falha ao fazer upload do documento no Supabase Storage.");
      }
      mediaUrl = publicUrl;
    }

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: remoteJid,
        text: caption,
        type: "document",
        mediaUrl: mediaUrl,
        filename: filename
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro no envio do documento: ${error}`);
    }

    return response.json();
  },

  /**
   * Busca informações da própria instância (Mockado)
   */
  async getInstanceInfo(): Promise<InstanceInfoResponse | null> {
    return {
      instance: {
        owner: "Oficial",
        profilePictureUrl: ""
      }
    };
  },
};
