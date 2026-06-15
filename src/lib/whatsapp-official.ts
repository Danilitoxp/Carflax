import { supabase } from "./supabase";

/**
 * Cliente de serviço para o WhatsApp Oficial (Meta Cloud API)
 * Emula a interface da antiga Evolution API v2 para compatibilidade de tipos.
 */

export interface EvoSendResponse {
  key: { id: string; remoteJid: string; fromMe: boolean };
  status: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

export const whatsappOfficialApi = {
  /**
   * Conecta ao WebSocket (Mockado - o frontend usará Supabase Realtime diretamente)
   */
  connectWebSocket() {
    console.log("[whatsappOfficialApi] Usando Supabase Realtime em vez do WebSocket da Evolution API.");
    return {
      on: (event: string, callback: (...args: any[]) => void) => {
        // No-op - eventos em tempo real agora vêm do Supabase
        console.log(`[WebSocket Mock] Evento registrado na UI: ${event}`);
      },
      off: (event: string) => {
        console.log(`[WebSocket Mock] Evento removido: ${event}`);
      },
      connected: true,
      active: true,
    } as any;
  },

  /**
   * Lista todos os chats (não necessário, a UI carrega do Supabase)
   */
  async getChats(): Promise<any[]> {
    return [];
  },

  /**
   * Busca mensagens de uma conversa específica (não necessário, a UI carrega do Supabase)
   */
  async getMessages(remoteJid: string, count: number = 15): Promise<any> {
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
  async setPresence(remoteJid: string, presence: 'composing' | 'recording' | 'paused'): Promise<any> {
    // Retorna mock de sucesso silencioso
    return { ok: true };
  },

  /**
   * Arquiva ou desarquiva uma conversa (Tratado localmente via Supabase no marketingService)
   */
  async archiveChat(remoteJid: string, archive: boolean = true): Promise<any> {
    return { ok: true };
  },

  /**
   * Busca informações de um contato (não necessário, a UI carrega do Supabase)
   */
  async getContact(remoteJid: string): Promise<any> {
    return null;
  },

  /**
   * Inscreve para receber presença de um contato (Não suportado pela Meta Cloud API)
   */
  async subscribePresence(remoteJid: string): Promise<void> {
    // No-op
  },

  /**
   * Busca a URL da foto de perfil de um contato (Não suportado publicamente de forma simples)
   */
  async getProfilePic(remoteJid: string): Promise<string | null> {
    return null;
  },

  /**
   * Baixa a mídia de uma mensagem em base64 (Tratado pelo webhook do backend)
   */
  async getMediaBase64(messagePayload: any): Promise<any> {
    return null;
  },

  /**
   * Envia uma imagem
   */
  async sendImage(remoteJid: string, imageUrl: string, caption?: string): Promise<any> {
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
    // Se recebermos uma URL válida do Supabase Storage, enviamos ela diretamente para a Meta.
    // Caso contrário (se for base64), precisaríamos subir no Supabase primeiro.
    let mediaUrl = fileUrlOrBase64;

    if (fileUrlOrBase64.startsWith("data:") || !fileUrlOrBase64.startsWith("http")) {
      // É uma string base64: faz o upload para o Supabase Storage antes de chamar o envio
      const base64Data = fileUrlOrBase64.includes("base64,") ? fileUrlOrBase64.split("base64,")[1] : fileUrlOrBase64;
      const cleanMimetype = mimetype || "application/octet-stream";
      const ext = filename.split(".").pop() || "bin";
      const storageFilename = `doc_${Date.now()}.${ext}`;

      // Import dinâmico do marketingService para evitar dependências circulares
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
  async getInstanceInfo(): Promise<any> {
    return {
      instance: {
        owner: "Oficial",
        profilePictureUrl: ""
      }
    };
  },
};
