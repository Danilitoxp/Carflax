/**
 * Evolution GO — whatsmeow-based WhatsApp API client
 * Endpoints seguem o Swagger oficial do EvolutionAPI/evolution-go
 */

import { marketingService } from "./marketing-service";

export interface GoSendResponse {
  id: string;
  status: string;
  timestamp?: number;
}

export interface GoInstance {
  id?: string;
  instanceId?: string;
  instanceName?: string;
  name?: string;
  status: string;
  phone?: string;
  owner?: string;
  profilePicUrl?: string;
}

export interface GoMessage {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  text?: string;
  type: string;
  timestamp: number;
  status?: string;
  mediaUrl?: string;
  mimetype?: string;
  filename?: string;
}

export interface GoChat {
  jid: string;
  name?: string;
  pushName?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  profilePicUrl?: string;
  isGroup?: boolean;
}

export interface GoGroup {
  id: string;
  name: string;
  description?: string;
  participants: { jid: string; isAdmin: boolean }[];
  inviteLink?: string;
  profilePicUrl?: string;
}

export interface GoCommunity {
  id: string;
  name: string;
  description?: string;
  linkedGroups?: string[];
}

export interface GoLabel {
  id: string;
  name: string;
  color?: number;
}

export interface GoNewsletter {
  id: string;
  name: string;
  description?: string;
  subscribers?: number;
}

const GO_CONFIG = {
  url: (import.meta.env.VITE_EVO_GO_URL || "").replace(/\/+$/, ""),
  apiKey: import.meta.env.VITE_EVO_GO_API_KEY || "",
};

async function fetchGo<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${GO_CONFIG.url}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": GO_CONFIG.apiKey,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[EvoGO] ${options.method || "GET"} ${path} → ${response.status}`, body);
    throw new Error(`Evolution GO (${response.status}): ${body}`);
  }

  return response.json();
}

export const evolutionGoApi = {
  // ─── INSTANCE ────────────────────────────────────────────────────────────────

  async getAllInstances(): Promise<GoInstance[]> {
    const raw = await fetchGo<unknown>("/instance/all");
    if (Array.isArray(raw)) return raw as GoInstance[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      // {"data":[...],"message":"..."} — formato confirmado
      if (Array.isArray(obj.data)) return obj.data as GoInstance[];
      const arr = Object.values(obj).find(v => Array.isArray(v));
      if (arr) return arr as GoInstance[];
    }
    return [];
  },

  async getInstance(instanceId: string): Promise<GoInstance> {
    return fetchGo<GoInstance>(`/instance/get/${instanceId}`);
  },

  async createInstance(name: string): Promise<GoInstance> {
    return fetchGo<GoInstance>("/instance/create", {
      method: "POST",
      body: JSON.stringify({ name, token: GO_CONFIG.apiKey }),
    });
  },

  /** POST /instance/connect — ConnectStruct (sem name/token) */
  async connectInstance(options?: {
    immediate?: boolean;
    webhookUrl?: string;
    websocketEnable?: string;
    subscribe?: string[];
  }): Promise<unknown> {
    return fetchGo("/instance/connect", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  /** GET /instance/qr — retorna o QR code da instância ativa */
  async getQr(): Promise<Record<string, unknown>> {
    return fetchGo<Record<string, unknown>>("/instance/qr");
  },

  /** GET /instance/status — retorna o status da instância ativa */
  async getStatus(): Promise<Record<string, unknown>> {
    return fetchGo<Record<string, unknown>>("/instance/status");
  },

  /** GET /user/contacts — retorna a lista de contatos do usuário */
  async getContacts(): Promise<Record<string, unknown>[]> {
    const raw = await fetchGo<unknown>("/user/contacts");
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
      const arr = Object.values(obj).find(v => Array.isArray(v));
      if (arr) return arr as Record<string, unknown>[];
    }
    return [];
  },

  /** GET /message/list/{jid} — retorna as mensagens de um chat via banco local (Supabase) */
  async getMessages(jid: string, limit = 40, vendedorId?: string): Promise<GoMessage[]> {
    try {
      const dbMsgs = await marketingService.getMessagesByJid(jid, limit, undefined, undefined, vendedorId);
      return dbMsgs.map(m => ({
        id: m.message_id,
        remoteJid: m.remote_jid,
        fromMe: m.sender === "me",
        text: m.texto,
        type: m.tipo || "text",
        timestamp: Math.floor(new Date(m.timestamp).getTime() / 1000),
        status: m.status,
        mediaUrl: m.media_url,
      }));
    } catch (e) {
      console.error("[EvoGO] Error fetching messages from Supabase:", e);
      return [];
    }
  },

  async requestPairCode(phone: string, name?: string, vendedorId?: string): Promise<{ code: string }> {
    return fetchGo("/instance/pair", {
      method: "POST",
      body: JSON.stringify({
        phone,
        webhookUrl: `${import.meta.env.VITE_BACKEND_URL || "https://marketing-carflax.velbav.easypanel.host"}/webhook${vendedorId ? `?vendedor_id=${vendedorId}` : ""}`,
        subscribe: ["ALL", "MESSAGE", "CONNECTION", "QRCODE", "PRESENCE", "CHAT_PRESENCE", "READ_RECEIPT", "CALL"],
        ...(name ? { name } : {})
      }),
    });
  },

  async disconnectInstance(): Promise<void> {
    return fetchGo("/instance/disconnect", { method: "POST" });
  },

  async logoutInstance(): Promise<void> {
    return fetchGo("/instance/logout", { method: "DELETE" });
  },

  async deleteInstance(instanceId: string): Promise<void> {
    return fetchGo(`/instance/delete/${instanceId}`, { method: "DELETE" });
  },

  async deleteInstanceByName(name: string): Promise<void> {
    return fetchGo("/instance/delete", {
      method: "DELETE",
      body: JSON.stringify({ name }),
    });
  },

  async forceReconnect(instanceId: string): Promise<void> {
    return fetchGo(`/instance/forcereconnect/${instanceId}`, { method: "POST" });
  },

  async setProxy(
    instanceId: string,
    proxy: { host: string; port: number; username?: string; password?: string }
  ): Promise<void> {
    return fetchGo(`/instance/proxy/${instanceId}`, {
      method: "POST",
      body: JSON.stringify(proxy),
    });
  },

  async deleteProxy(instanceId: string): Promise<void> {
    return fetchGo(`/instance/proxy/${instanceId}`, { method: "DELETE" });
  },

  // ─── MESSAGES ────────────────────────────────────────────────────────────────

  async sendText(to: string, text: string): Promise<GoSendResponse> {
    return fetchGo<GoSendResponse>("/send/text", {
      method: "POST",
      body: JSON.stringify({ number: to, text }),
    });
  },

  async sendImage(to: string, url: string, caption?: string): Promise<GoSendResponse> {
    return fetchGo<GoSendResponse>("/send/media", {
      method: "POST",
      body: JSON.stringify({ number: to, type: "image", url, caption }),
    });
  },

  async sendDocument(
    to: string,
    url: string,
    filename: string,
    caption?: string
  ): Promise<GoSendResponse> {
    return fetchGo<GoSendResponse>("/send/media", {
      method: "POST",
      body: JSON.stringify({ number: to, type: "document", url, filename, caption }),
    });
  },

  async sendAudio(to: string, url: string): Promise<GoSendResponse> {
    return fetchGo<GoSendResponse>("/send/media", {
      method: "POST",
      body: JSON.stringify({ number: to, type: "audio", url }),
    });
  },

  // ─── CHAT ────────────────────────────────────────────────────────────────────

  async archiveChat(jid: string): Promise<void> {
    return fetchGo("/chat/archive", { method: "POST", body: JSON.stringify({ jid }) });
  },

  async unarchiveChat(jid: string): Promise<void> {
    return fetchGo("/chat/unarchive", { method: "POST", body: JSON.stringify({ jid }) });
  },

  async muteChat(jid: string, duration?: number): Promise<void> {
    return fetchGo("/chat/mute", { method: "POST", body: JSON.stringify({ jid, duration }) });
  },

  async unmuteChat(jid: string): Promise<void> {
    return fetchGo("/chat/unmute", { method: "POST", body: JSON.stringify({ jid }) });
  },

  async pinChat(jid: string): Promise<void> {
    return fetchGo("/chat/pin", { method: "POST", body: JSON.stringify({ jid }) });
  },

  async unpinChat(jid: string): Promise<void> {
    return fetchGo("/chat/unpin", { method: "POST", body: JSON.stringify({ jid }) });
  },

  async requestHistorySync(jid: string): Promise<void> {
    return fetchGo("/chat/history-sync-request", {
      method: "POST",
      body: JSON.stringify({ jid }),
    });
  },

  // ─── GROUP ───────────────────────────────────────────────────────────────────

  async getGroups(): Promise<GoGroup[]> {
    return fetchGo<GoGroup[]>("/group/list");
  },

  async getMyGroups(): Promise<GoGroup[]> {
    return fetchGo<GoGroup[]>("/group/myall");
  },

  async createGroup(name: string, participants: string[]): Promise<GoGroup> {
    return fetchGo<GoGroup>("/group/create", {
      method: "POST",
      body: JSON.stringify({ name, participants }),
    });
  },

  async getGroupInfo(groupId: string): Promise<GoGroup> {
    return fetchGo<GoGroup>("/group/info", {
      method: "POST",
      body: JSON.stringify({ groupId }),
    });
  },

  async getGroupInviteLink(groupId: string): Promise<{ link: string }> {
    return fetchGo("/group/invitelink", {
      method: "POST",
      body: JSON.stringify({ groupId }),
    });
  },

  async joinGroup(inviteLink: string): Promise<void> {
    return fetchGo("/group/join", {
      method: "POST",
      body: JSON.stringify({ inviteLink }),
    });
  },

  async leaveGroup(groupId: string): Promise<void> {
    return fetchGo("/group/leave", {
      method: "POST",
      body: JSON.stringify({ groupId }),
    });
  },

  async setGroupName(groupId: string, name: string): Promise<void> {
    return fetchGo("/group/name", {
      method: "POST",
      body: JSON.stringify({ groupId, name }),
    });
  },

  async setGroupDescription(groupId: string, description: string): Promise<void> {
    return fetchGo("/group/description", {
      method: "POST",
      body: JSON.stringify({ groupId, description }),
    });
  },

  // ─── COMMUNITY (exclusivo Evolution GO) ─────────────────────────────────────

  async createCommunity(name: string, groups: string[]): Promise<GoCommunity> {
    return fetchGo<GoCommunity>("/community/create", {
      method: "POST",
      body: JSON.stringify({ name, groups }),
    });
  },

  async addGroupToCommunity(communityId: string, groupId: string): Promise<void> {
    return fetchGo("/community/add", {
      method: "POST",
      body: JSON.stringify({ communityId, groupId }),
    });
  },

  async removeGroupFromCommunity(communityId: string, groupId: string): Promise<void> {
    return fetchGo("/community/remove", {
      method: "POST",
      body: JSON.stringify({ communityId, groupId }),
    });
  },

  // ─── LABEL (exclusivo Evolution GO) ─────────────────────────────────────────

  async getLabels(): Promise<GoLabel[]> {
    return fetchGo<GoLabel[]>("/label/list");
  },

  async addLabel(jid: string, labelId: string): Promise<void> {
    return fetchGo("/label/add", {
      method: "POST",
      body: JSON.stringify({ jid, labelId }),
    });
  },

  async removeLabel(jid: string, labelId: string): Promise<void> {
    return fetchGo("/label/remove", {
      method: "POST",
      body: JSON.stringify({ jid, labelId }),
    });
  },

  // ─── NEWSLETTER (exclusivo Evolution GO) ────────────────────────────────────

  async getNewsletters(): Promise<GoNewsletter[]> {
    return fetchGo<GoNewsletter[]>("/newsletter/list");
  },

  async createNewsletter(name: string, description?: string): Promise<GoNewsletter> {
    return fetchGo<GoNewsletter>("/newsletter/create", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  },

  // ─── CALL ────────────────────────────────────────────────────────────────────

  async rejectCall(callId: string, from: string): Promise<void> {
    return fetchGo("/call/reject", {
      method: "POST",
      body: JSON.stringify({ callId, from }),
    });
  },
};
