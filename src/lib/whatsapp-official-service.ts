import { supabase } from "./supabase";

export interface OfficialWhatsappConfig {
  id?: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  verify_token: string;
  webhook_url: string;
  business_name: string;
  phone_number: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OfficialTemplate {
  id?: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  components: Record<string, unknown>[];
  meta_template_id?: string;
  created_at?: string;
}

export interface OfficialMessage {
  id?: string;
  message_id: string;
  remote_jid: string;
  texto?: string;
  tipo: "text" | "image" | "video" | "document" | "audio" | "template" | "interactive" | "button" | "list";
  sender: "me" | "contact";
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  media_url?: string;
  template_name?: string;
  interactive_data?: Record<string, unknown>;
  created_at?: string;
}

export interface ConversationMetrics {
  totalConversations: number;
  serviceConversations: number;
  marketingConversations: number;
  utilityConversations: number;
  freeConversations: number;
  estimatedCost: number;
}

export const whatsappOfficialService = {
  async getConfig(): Promise<OfficialWhatsappConfig | null> {
    const { data } = await supabase
      .from("whatsapp_official_config")
      .select("*")
      .single();
    return data;
  },

  async saveConfig(config: Partial<OfficialWhatsappConfig>) {
    const { data, error } = await supabase
      .from("whatsapp_official_config")
      .upsert({ ...config, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTemplates(): Promise<OfficialTemplate[]> {
    const { data } = await supabase
      .from("whatsapp_official_templates")
      .select("*")
      .order("created_at", { ascending: false });
    return (data || []) as OfficialTemplate[];
  },

  async sendTextMessage(to: string, text: string, phoneNumberId: string, accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      }
    );
    return response.json();
  },

  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string,
    components: Record<string, unknown>[],
    phoneNumberId: string,
    accessToken: string
  ) {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: templateName, language: { code: language }, components },
        }),
      }
    );
    return response.json();
  },

  async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[],
    phoneNumberId: string,
    accessToken: string
  ) {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: body },
            action: {
              buttons: buttons.map((b) => ({
                type: "reply",
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        }),
      }
    );
    return response.json();
  },

  async sendListMessage(
    to: string,
    body: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
    phoneNumberId: string,
    accessToken: string
  ) {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "interactive",
          interactive: {
            type: "list",
            body: { text: body },
            action: { button: buttonText, sections },
          },
        }),
      }
    );
    return response.json();
  },

  async getMessages(remoteJid: string, limit = 50): Promise<OfficialMessage[]> {
    const { data } = await supabase
      .from("whatsapp_official_messages")
      .select("*")
      .eq("remote_jid", remoteJid)
      .order("timestamp", { ascending: false })
      .limit(limit);
    return ((data || []) as OfficialMessage[]).reverse();
  },

  async getConversationMetrics(startDate: Date, endDate: Date): Promise<ConversationMetrics> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("whatsapp_official_messages")
      .select("remote_jid, sender, template_name, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    const conversations = new Map<string, { hasTemplate: boolean; initiatedBy: string }>();
    (data || []).forEach((msg) => {
      if (!conversations.has(msg.remote_jid)) {
        conversations.set(msg.remote_jid, {
          hasTemplate: !!msg.template_name,
          initiatedBy: msg.sender,
        });
      }
    });

    let service = 0, marketing = 0, utility = 0;
    conversations.forEach((conv) => {
      if (conv.initiatedBy === "contact") service++;
      else if (conv.hasTemplate) marketing++;
      else utility++;
    });

    const free = Math.min(service, 1000);
    const paidService = Math.max(service - 1000, 0);
    const estimatedCost = paidService * 0.25 + marketing * 0.50 + utility * 0.25;

    return {
      totalConversations: conversations.size,
      serviceConversations: service,
      marketingConversations: marketing,
      utilityConversations: utility,
      freeConversations: free,
      estimatedCost,
    };
  },
};
