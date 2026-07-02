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
  connected?: boolean;
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



async function fetchBackend<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = "/api-marketing/api/whatsapp";
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Backend Official WhatsApp API Error (${response.status}): ${error}`);
  }

  return response.json();
}

export const evolutionGoApi = {
  // ─── INSTANCE ────────────────────────────────────────────────────────────────

  async getAllInstances(): Promise<GoInstance[]> {
    return [{ status: "open", name: "API Oficial", phone: "API Oficial", connected: true }];
  },

  async getInstance(_instanceId: string): Promise<GoInstance> {
    return { status: "open", name: "API Oficial", phone: "API Oficial", connected: true };
  },

  async createInstance(_name: string): Promise<GoInstance> {
    return { status: "open", name: "API Oficial", phone: "API Oficial", connected: true };
  },

  async connectInstance(_options?: any): Promise<unknown> {
    return Promise.resolve({ status: "open" });
  },

  async getQr(): Promise<Record<string, unknown>> {
    return {};
  },

  async getStatus(): Promise<Record<string, unknown>> {
    return { LoggedIn: true, loggedIn: true, name: "API Oficial", Name: "API Oficial" };
  },

  async getContacts(): Promise<Record<string, unknown>[]> {
    return [];
  },

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

  async requestPairCode(_phone: string, _name?: string, _vendedorId?: string): Promise<{ code: string }> {
    return { code: "" };
  },

  async disconnectInstance(): Promise<void> {
    return Promise.resolve();
  },

  async logoutInstance(): Promise<void> {
    return Promise.resolve();
  },

  async deleteInstance(_instanceId: string): Promise<void> {
    return Promise.resolve();
  },

  async deleteInstanceByName(_name: string): Promise<void> {
    return Promise.resolve();
  },

  async forceReconnect(_instanceId: string): Promise<void> {
    return Promise.resolve();
  },

  async setProxy(_instanceId: string, _proxy: any): Promise<void> {
    return Promise.resolve();
  },

  async deleteProxy(_instanceId: string): Promise<void> {
    return Promise.resolve();
  },

  // ─── MESSAGES ────────────────────────────────────────────────────────────────

  async sendText(to: string, text: string): Promise<GoSendResponse> {
    const res = await fetchBackend<any>('/send', {
      method: 'POST',
      body: JSON.stringify({
        to: to,
        text: text,
        type: 'text'
      }),
    });
    return { id: res.key?.id || `msg_${Date.now()}`, status: "sent" };
  },

  async sendImage(to: string, url: string, caption?: string): Promise<GoSendResponse> {
    const res = await fetchBackend<any>('/send', {
      method: 'POST',
      body: JSON.stringify({
        to: to,
        text: caption || '',
        type: 'image',
        mediaUrl: url
      }),
    });
    return { id: res.key?.id || `msg_${Date.now()}`, status: "sent" };
  },

  async sendDocument(to: string, url: string, filename: string, caption?: string): Promise<GoSendResponse> {
    const res = await fetchBackend<any>('/send', {
      method: 'POST',
      body: JSON.stringify({
        to: to,
        text: caption || filename,
        type: 'document',
        mediaUrl: url,
        filename: filename
      }),
    });
    return { id: res.key?.id || `msg_${Date.now()}`, status: "sent" };
  },

  async sendAudio(to: string, url: string): Promise<GoSendResponse> {
    const res = await fetchBackend<any>('/send', {
      method: 'POST',
      body: JSON.stringify({
        to: to,
        type: 'audio',
        mediaUrl: url
      }),
    });
    return { id: res.key?.id || `msg_${Date.now()}`, status: "sent" };
  },

  // ─── CHAT ────────────────────────────────────────────────────────────────────

  async archiveChat(_jid: string): Promise<void> {
    return Promise.resolve();
  },

  async unarchiveChat(_jid: string): Promise<void> {
    return Promise.resolve();
  },

  async muteChat(_jid: string, _duration?: number): Promise<void> {
    return Promise.resolve();
  },

  async unmuteChat(_jid: string): Promise<void> {
    return Promise.resolve();
  },

  async pinChat(_jid: string): Promise<void> {
    return Promise.resolve();
  },

  async unpinChat(_jid: string): Promise<void> {
    return Promise.resolve();
  },

  async requestHistorySync(_jid: string): Promise<void> {
    return Promise.resolve();
  },

  // ─── GROUP ───────────────────────────────────────────────────────────────────

  async getGroups(): Promise<GoGroup[]> {
    return [];
  },

  async getMyGroups(): Promise<GoGroup[]> {
    return [];
  },

  async createGroup(_name: string, _participants: string[]): Promise<GoGroup> {
    return { id: "", name: "", participants: [] };
  },

  async getGroupInfo(_groupId: string): Promise<GoGroup> {
    return { id: "", name: "", participants: [] };
  },

  async getGroupInviteLink(_groupId: string): Promise<{ link: string }> {
    return { link: "" };
  },

  async joinGroup(_inviteLink: string): Promise<void> {
    return Promise.resolve();
  },

  async leaveGroup(_groupId: string): Promise<void> {
    return Promise.resolve();
  },

  async setGroupName(_groupId: string, _name: string): Promise<void> {
    return Promise.resolve();
  },

  async setGroupDescription(_groupId: string, _description: string): Promise<void> {
    return Promise.resolve();
  },

  // ─── COMMUNITY ─────────────────────────────────────────────────────────────

  async createCommunity(_name: string, _groups: string[]): Promise<GoCommunity> {
    return { id: "", name: "" };
  },

  async addGroupToCommunity(_communityId: string, _groupId: string): Promise<void> {
    return Promise.resolve();
  },

  async removeGroupFromCommunity(_communityId: string, _groupId: string): Promise<void> {
    return Promise.resolve();
  },

  // ─── LABEL ─────────────────────────────────────────────────────────────────

  async getLabels(): Promise<GoLabel[]> {
    return [];
  },

  async addLabel(_jid: string, _labelId: string): Promise<void> {
    return Promise.resolve();
  },

  async removeLabel(_jid: string, _labelId: string): Promise<void> {
    return Promise.resolve();
  },

  // ─── NEWSLETTER ────────────────────────────────────────────────────────────

  async getNewsletters(): Promise<GoNewsletter[]> {
    return [];
  },

  async createNewsletter(_name: string, _description?: string): Promise<GoNewsletter> {
    return { id: "", name: "" };
  },

  // ─── CALL ────────────────────────────────────────────────────────────────────

  async rejectCall(_callId: string, _from: string): Promise<void> {
    return Promise.resolve();
  },
};
