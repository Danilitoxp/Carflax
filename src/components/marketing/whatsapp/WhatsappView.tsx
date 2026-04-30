import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Search, 
  Paperclip, 
  Smile, 
  Send, 
  CheckCheck, 
  User,
  Check,
  Megaphone,
  Flame,
  Archive,
  ChevronDown,
  DollarSign,
  X,
  Bell,
  History
} from "lucide-react";
import { evolutionApi } from "@/lib/evolution-v2";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  time: string;
  sender: "me" | "contact";
  status: "sent" | "delivered" | "read";
}

type Temperature = "Quente" | "Morno" | "Frio";

interface LeadMetadata {
  source: string;
  campaign: string;
  status: string;
  temperature?: Temperature;
  budgetId?: string;
  saleValue?: string;
  city?: string;
  followUpDate?: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  avatar?: string;
  online?: boolean;
  leadInfo?: LeadMetadata;
}

interface EvoChatResponse {
  id?: string;
  remoteJid?: string;
  name?: string;
  pushName?: string;
  lastMessage?: string | { message?: { conversation?: string } };
  updatedAt?: string;
  unreadCount?: number;
}

interface EvoMessageResponse {
  key?: { id?: string; fromMe?: boolean; remoteJid?: string };
  id?: string;
  pushName?: string;
  message?: { 
    conversation?: string; 
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };
  messageTimestamp?: number;
  status?: string;
}

const ARCHIVE_REASONS = [
  "Cliente Curioso",
  "Não vendemos o material",
  "Preço Alto",
  "Prazo Longo",
  "Outros"
];

const getTempColor = (temp?: string) => {
  switch (temp) {
    case "Quente": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    case "Morno": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "Frio": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    default: return "text-muted-foreground bg-secondary/50 border-border";
  }
};

const avatarCache = new Map<string, string>();

export function WhatsappView() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showTempDropdown, setShowTempDropdown] = useState(false);
  const [budgetId, setBudgetId] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [typingChats, setTypingChats] = useState<Set<string>>(new Set());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAvatar = useCallback(async (remoteJid: string) => {
    if (avatarCache.has(remoteJid)) return avatarCache.get(remoteJid)!;
    const url = await evolutionApi.getProfilePic(remoteJid);
    const result = url || "";
    avatarCache.set(remoteJid, result);
    if (result) {
      setChats(prev => prev.map(c => c.id === remoteJid ? { ...c, avatar: result } : c));
    }
    return result;
  }, []);

  const loadChats = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await evolutionApi.getChats();
      
      const mappedChats: Chat[] = (data as EvoChatResponse[]).map((item) => ({
        id: (item.id || item.remoteJid) as string,
        name: (item.name || item.pushName || "Contato") as string,
        lastMessage: typeof item.lastMessage === 'string' ? item.lastMessage : (item.lastMessage?.message?.conversation || "Mídia"),
        time: item.updatedAt ? new Date(item.updatedAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        unreadCount: (item.unreadCount || 0) as number,
        avatar: "",
        leadInfo: {
          status: "Novo Lead",
          temperature: "Frio",
          source: "WhatsApp",
          campaign: "Geral"
        }
      }));
      
      setChats(mappedChats);

      // Busca avatares dos primeiros 20 chats em paralelo
      const first20 = mappedChats.slice(0, 20);
      await Promise.all(first20.map(c => fetchAvatar(c.id)));
    } catch (error) {
      console.error("Erro ao carregar chats:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchAvatar]);

  useEffect(() => {
    // Conecta ao WebSocket para receber mensagens em tempo real
    const socket = evolutionApi.connectWebSocket();

    socket.on('connect', () => {
      console.log('✅ Conectado (transport:', socket.io.engine.transport.name + ')');
      // Tenta entrar na sala da instância após conectar
      socket.emit('subscribe', { instance: import.meta.env.VITE_EVO_INSTANCE });
      socket.emit('join', import.meta.env.VITE_EVO_INSTANCE);
    });

    socket.io.engine?.on('upgrade', () => {
      console.log('✅ WebSocket upgrade para:', socket.io.engine.transport.name);
    });

    // Captura qualquer pacote bruto do engine (nível abaixo do socket.io)
    socket.io.engine?.on('message', (rawData: unknown) => {
      console.log('🔍 RAW engine message:', rawData);
    });

    socket.onAny((event, ...args) => {
      console.log('📡 Realtime Event:', event, JSON.stringify(args).slice(0, 300));
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Erro de conexão WebSocket:', err.message);
    });

    const processMessage = (message: EvoMessageResponse) => {
      const remoteJid = message.key?.remoteJid;
      if (!remoteJid) return;

      const messageContent = message.message;
      const text =
        messageContent?.conversation ||
        messageContent?.extendedTextMessage?.text ||
        messageContent?.imageMessage?.caption ||
        messageContent?.videoMessage?.caption ||
        "Mídia";

      const time = message.messageTimestamp
        ? new Date(message.messageTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(c => c.id === remoteJid);
        if (existingChatIndex !== -1) {
          const updatedChats = [...prevChats];
          const chat = { ...updatedChats[existingChatIndex] };
          chat.lastMessage = text;
          chat.time = time;
          updatedChats.splice(existingChatIndex, 1);
          if (!chat.avatar) fetchAvatar(remoteJid);
          return [chat, ...updatedChats];
        } else {
          fetchAvatar(remoteJid);
          const newChat: Chat = {
            id: remoteJid,
            name: message.pushName || "Novo Lead",
            lastMessage: text,
            time: time,
            unreadCount: 1,
            avatar: avatarCache.get(remoteJid) || "",
            leadInfo: {
              status: "Novo Lead",
              temperature: "Frio",
              source: "WhatsApp",
              campaign: "Geral"
            }
          };
          return [newChat, ...prevChats];
        }
      });

      setSelectedChat(currentSelected => {
        if (currentSelected?.id === remoteJid) {
          const msgId = message.key?.id || Date.now().toString();
          setMessages(prevMsgs => {
            if (prevMsgs.some(m => m.id === msgId)) return prevMsgs;
            const newMsg: Message = {
              id: msgId,
              text: text,
              time: time,
              sender: message.key?.fromMe ? "me" : "contact",
              status: "sent"
            };
            return [...prevMsgs, newMsg];
          });
        }
        return currentSelected;
      });
    };

    const handleIncomingMessage = (data: Record<string, unknown>) => {
      console.log('📩 Nova mensagem recebida (Realtime):', data);

      // Com WEBSOCKET_GLOBAL_EVENTS=true o payload vem como { instance, data: msg|msg[] }
      // Filtra apenas eventos da instância configurada
      const instanceName = import.meta.env.VITE_EVO_INSTANCE as string;
      if (data.instance && data.instance !== instanceName) return;

      const raw = data.data ?? data;
      const messages: EvoMessageResponse[] = Array.isArray(raw)
        ? (raw as EvoMessageResponse[])
        : [raw as EvoMessageResponse];

      messages.forEach(processMessage);
    };

    socket.on('messages.upsert', handleIncomingMessage);
    socket.on('MESSAGES_UPSERT', handleIncomingMessage);
    socket.on('message', handleIncomingMessage);
    socket.on('message-received', handleIncomingMessage);

    // Usa profilePicUrl direto do evento contacts.update (sem chamada extra à API)
    const handleContactsUpdate = (data: Record<string, unknown>) => {
      const instanceName = import.meta.env.VITE_EVO_INSTANCE as string;
      if (data.instance && data.instance !== instanceName) return;

      const raw = data.data ?? data;
      const contacts = Array.isArray(raw) ? raw : [raw];

      (contacts as Array<{ remoteJid?: string; profilePicUrl?: string }>).forEach(c => {
        const jid = c.remoteJid;
        const picUrl = c.profilePicUrl;
        if (!jid || !picUrl || !jid.endsWith('@s.whatsapp.net')) return;
        avatarCache.set(jid, picUrl);
        setChats(prev => prev.map(chat =>
          chat.id === jid ? { ...chat, avatar: picUrl } : chat
        ));
      });
    };

    socket.on('contacts.update', handleContactsUpdate);
    socket.on('CONTACTS_UPDATE', handleContactsUpdate);

    const handlePresenceUpdate = (data: Record<string, unknown>) => {
      const instanceName = import.meta.env.VITE_EVO_INSTANCE as string;
      if (data.instance && data.instance !== instanceName) return;

      const raw = (data.data ?? data) as Record<string, unknown>;
      // formato: { id: "jid", presences: { "jid": { lastKnownPresence: "composing"|"paused"|"available" } } }
      const jid = (raw.id ?? raw.remoteJid) as string | undefined;
      if (!jid) return;

      const presences = raw.presences as Record<string, { lastKnownPresence?: string }> | undefined;
      const presence = presences
        ? Object.values(presences)[0]?.lastKnownPresence
        : (raw.presence as string | undefined);

      const isTyping = presence === 'composing' || presence === 'recording';

      setTypingChats(prev => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(jid);
          // limpa após 5s sem atualização
          const existing = typingTimers.current.get(jid);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            setTypingChats(s => { const n = new Set(s); n.delete(jid); return n; });
            typingTimers.current.delete(jid);
          }, 5000);
          typingTimers.current.set(jid, timer);
        } else {
          next.delete(jid);
          const existing = typingTimers.current.get(jid);
          if (existing) { clearTimeout(existing); typingTimers.current.delete(jid); }
        }
        return next;
      });
    };

    socket.on('presence.update', handlePresenceUpdate);
    socket.on('PRESENCE_UPDATE', handlePresenceUpdate);

    socket.on('disconnect', () => {
      console.log('❌ Carflax HUB: Desconectado do WhatsApp Realtime');
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchAvatar]);

  useEffect(() => {
    // loadChats(); // Desativado a pedido do usuário para não carregar conversas antigas
    setLoading(false);
  }, [loadChats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat) return;
    
    const textToSend = inputText;
    setInputText("");

    try {
      const newMsg: Message = {
        id: Date.now().toString(),
        text: textToSend,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: "me",
        status: "sent"
      };
      setMessages(prev => [...prev, newMsg]);
      await evolutionApi.sendText(selectedChat.id, textToSend);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleSelectChat = useCallback(async (chat: Chat) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    setBudgetId(chat.leadInfo?.budgetId || "");
    setSaleValue(chat.leadInfo?.saleValue || "");

    try {
      console.log("Buscando mensagens para:", chat.id);
      const data = await evolutionApi.getMessages(chat.id) as Record<string, unknown>;
      console.log("Dados brutos da API:", data);
      
      const dataObj = data as Record<string, unknown>;
      // Busca exaustiva pelo array de mensagens
      let rawMessages: EvoMessageResponse[] = [];

      if (Array.isArray(data)) {
        rawMessages = data as EvoMessageResponse[];
      } else if (dataObj?.records && Array.isArray(dataObj.records)) {
        rawMessages = dataObj.records as EvoMessageResponse[];
      } else if (dataObj?.messages && Array.isArray(dataObj.messages)) {
        rawMessages = dataObj.messages as EvoMessageResponse[];
      } else if ((dataObj?.messages as Record<string, unknown>)?.records && Array.isArray((dataObj.messages as Record<string, unknown>).records)) {
        rawMessages = (dataObj.messages as Record<string, unknown>).records as EvoMessageResponse[];
      }

      const msgs: Message[] = rawMessages.map((m: EvoMessageResponse) => {
        // Extração robusta de texto na v2
        const messageContent = m.message;
        const text = 
          messageContent?.conversation || 
          messageContent?.extendedTextMessage?.text || 
          messageContent?.imageMessage?.caption ||
          messageContent?.videoMessage?.caption ||
          (typeof messageContent === 'string' ? messageContent : "") ||
          "Mídia";

        return {
          id: (m.key?.id || m.id || Math.random().toString()) as string,
          text: text as string,
          time: m.messageTimestamp ? new Date((m.messageTimestamp as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
          sender: (m.key?.fromMe ? "me" : "contact") as "me" | "contact",
          status: (m.status === "READ" ? "read" : "sent") as "sent" | "delivered" | "read"
        };
      }).reverse();
      
      console.log("Mensagens processadas:", msgs);
      setMessages(msgs);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [setBudgetId, setSaleValue, setSelectedChat, setMessages, setLoadingMessages]);

  // Initial Auto-selection - MOVED BELOW handleSelectChat
  useEffect(() => {
    if (chats.length > 0 && !selectedChat) {
      handleSelectChat(chats[0]);
    }
  }, [chats, selectedChat, handleSelectChat]);

  const scheduleFollowUp = (label: string) => {
    if (!selectedChat || !selectedChat.leadInfo) return;
    setSelectedChat({
      ...selectedChat,
      leadInfo: { ...selectedChat.leadInfo, followUpDate: label }
    });
  };

  return (
    <div className="flex h-full bg-background overflow-hidden border border-border/50 rounded-2xl shadow-2xl m-4 relative">
      {/* Modals */}
      {showFollowUpModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Bell className="w-5 h-5 text-primary" />
                 <h3 className="font-black text-sm uppercase tracking-tighter">Agendar Follow-up</h3>
              </div>
              <button onClick={() => setShowFollowUpModal(false)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {["Hoje", "Amanhã", "Próxima Semana"].map((label) => (
                  <button 
                    key={label}
                    onClick={() => { scheduleFollowUp(label); setShowFollowUpModal(false); }}
                    className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-primary/5 border border-border rounded-2xl font-bold text-xs"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSaleModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
               <DollarSign className="w-5 h-5 text-emerald-500" />
               <h3 className="font-black text-sm uppercase tracking-tighter">Registrar Venda</h3>
               <button onClick={() => setShowSaleModal(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
               <input type="text" placeholder="ID Orçamento" value={budgetId} onChange={(e)=>setBudgetId(e.target.value)} className="w-full p-3 bg-secondary rounded-xl text-xs font-bold" />
               <input type="number" placeholder="Valor" value={saleValue} onChange={(e)=>setSaleValue(e.target.value)} className="w-full p-3 bg-secondary rounded-xl text-xs font-bold" />
               <button onClick={()=>setShowSaleModal(false)} className="w-full p-4 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Arquivar</h3>
              <button onClick={() => setShowArchiveModal(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-2">
              {ARCHIVE_REASONS.map(r => (
                <button key={r} onClick={()=>setShowArchiveModal(false)} className="w-full p-3 text-left hover:bg-secondary rounded-xl text-xs font-bold">{r}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Chats */}
      <div className="w-80 border-r border-border flex flex-col bg-card/50 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tighter">Mensagens</h2>
            <button onClick={() => loadChats()} className="p-2 hover:bg-secondary rounded-xl">
              <History className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar..." className="w-full bg-secondary/50 border border-border rounded-2xl pl-11 pr-4 py-3 text-xs font-bold" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-2 opacity-50">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : chats.map((chat) => (
            <button 
              key={chat.id} 
              onClick={() => handleSelectChat(chat)}
              className={cn(
                "w-full p-4 rounded-2xl flex gap-4 transition-all relative",
                selectedChat?.id === chat.id ? "bg-primary text-white shadow-xl" : "hover:bg-secondary/80 text-muted-foreground"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {chat.avatar ? <img src={chat.avatar} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-center mb-1">
                  <span className={cn("font-black text-xs uppercase truncate", selectedChat?.id === chat.id ? "text-white" : "text-foreground")}>{chat.name}</span>
                  <span className="text-[9px] font-bold opacity-60">{chat.time}</span>
                </div>
                {typingChats.has(chat.id)
                  ? <p className="text-[11px] truncate text-emerald-400 font-bold">digitando...</p>
                  : <p className="text-[11px] truncate opacity-70">{chat.lastMessage}</p>
                }
              </div>
              {chat.unreadCount > 0 && (
                <div className="absolute top-4 right-4 w-5 h-5 bg-rose-500 text-white rounded-lg flex items-center justify-center text-[9px] font-black">
                  {chat.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-4 flex items-center justify-between border-b border-border bg-card/20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden border border-border">
                   {selectedChat.avatar ? <img src={selectedChat.avatar} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tighter">{selectedChat.name}</h4>
                  <div className="flex items-center gap-2">
                    {typingChats.has(selectedChat.id)
                      ? <p className="text-[10px] text-emerald-400 font-bold tracking-widest animate-pulse">digitando...</p>
                      : <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
                    }
                    {selectedChat.leadInfo && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">• {selectedChat.leadInfo.campaign}</p>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowTempDropdown(!showTempDropdown)}
                    className={cn("p-2.5 rounded-xl border flex items-center gap-2 transition-all", getTempColor(selectedChat.leadInfo?.temperature))}
                  >
                    <Flame className="w-4 h-4 pointer-events-none" />
                    <span className="text-[10px] font-black uppercase pointer-events-none">{selectedChat.leadInfo?.temperature || "Frio"}</span>
                    <ChevronDown className="w-3 h-3 pointer-events-none" />
                  </button>
                  {showTempDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-card border border-border rounded-xl shadow-2xl z-[110] overflow-hidden">
                      {(["Quente", "Morno", "Frio"] as Temperature[]).map(t => (
                        <button key={t} onClick={()=>{ setSelectedChat({...selectedChat, leadInfo: {...selectedChat.leadInfo!, temperature: t}}); setShowTempDropdown(false); }} className="w-full p-3 text-[10px] font-black uppercase hover:bg-secondary text-left">{t}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={()=>setShowFollowUpModal(true)} className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><Bell className="w-4 h-4"/></button>
                <button onClick={()=>setShowSaleModal(true)} className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><DollarSign className="w-4 h-4"/></button>
                <button onClick={()=>setShowArchiveModal(true)} className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><Archive className="w-4 h-4"/></button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col bg-[url('https://w0.peakpx.com/wallpaper/580/650/HD-wallpaper-whatsapp-background-dark-mode-pattern-whatsapp-dark-mode-thumbnail.jpg')] bg-repeat">
              {loadingMessages ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Carregando...</span>
                </div>
              ) : (
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.sender === "me" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] px-4 py-2 rounded-2xl shadow-sm relative", msg.sender === "me" ? "bg-primary text-white rounded-tr-none" : "bg-card border border-border text-foreground rounded-tl-none")}>
                        <p className="text-sm font-medium">{msg.text}</p>
                        <div className="flex justify-end gap-1 mt-1 opacity-60">
                          <span className="text-[9px] font-bold">{msg.time}</span>
                          {msg.sender === "me" && (msg.status === "read" ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 border-t border-border bg-card/50 backdrop-blur-md">
                <div className="flex items-center gap-2 max-w-5xl mx-auto">
                  <button className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><Smile className="w-5 h-5"/></button>
                  <button className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><Paperclip className="w-5 h-5"/></button>
                  <input 
                    type="text" 
                    value={inputText} 
                    onChange={(e)=>setInputText(e.target.value)} 
                    onKeyDown={(e)=>e.key === "Enter" && handleSendMessage()} 
                    placeholder="Responda agora..." 
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none" 
                  />
                  <button onClick={handleSendMessage} className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg"><Send className="w-5 h-5"/></button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse"><Megaphone className="w-12 h-12 text-primary" /></div>
            <h3 className="text-2xl font-black uppercase">Gerenciador de Leads</h3>
            <p className="text-muted-foreground max-w-md">Selecione uma conversa para começar o atendimento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
