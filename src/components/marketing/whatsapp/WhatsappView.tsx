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
  RefreshCw,
  Pin,
  PinOff,
  Play,
  Pause,
  Mic
} from "lucide-react";
import { evolutionApi } from "@/lib/evolution-v2";
import { marketingService } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  time: string;
  sender: "me" | "contact";
  status: "sent" | "delivered" | "read";
  tipo?: string;
  mediaUrl?: string;
  reacao?: string;
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
  lastMessageSender?: "me" | "contact";
  time: string;
  unreadCount: number;
  avatar?: string;
  online?: boolean;
  arquivado?: boolean;
  fixado?: boolean;
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
    base64?: string;
    conversation?: string; 
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string; mimetype?: string };
    videoMessage?: { caption?: string; mimetype?: string };
    audioMessage?: { ptt?: boolean; mimetype?: string };
    documentMessage?: { fileName?: string; caption?: string; mimetype?: string };
    stickerMessage?: { mimetype?: string };
    reactionMessage?: { key?: { id?: string }; text?: string };
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

function formatAudioTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CustomAudioPlayer({ 
  src, 
  isMe, 
  avatar, 
  msgTime, 
  msgStatus 
}: { 
  src: string, 
  isMe: boolean, 
  avatar?: string,
  msgTime?: string,
  msgStatus?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTime = (Number(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  return (
    <div className={cn("flex items-center gap-3 min-w-[250px] sm:min-w-[280px] pt-1 pb-1", isMe ? "text-white" : "text-foreground")}>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden" 
      />
      
      {/* Avatar com Microfone */}
      <div className="relative shrink-0 ml-1">
        <div className="w-[42px] h-[42px] rounded-full overflow-hidden bg-black/10 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 opacity-50" />
          )}
        </div>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 rounded-full p-[2px] border-2",
          isMe ? "border-primary bg-primary" : "border-card bg-card"
        )}>
           <Mic className={cn("w-[10px] h-[10px]", isMe ? "text-green-300" : "text-green-500")} fill="currentColor" />
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-0.5 pr-2">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button onClick={togglePlay} className="p-1 shrink-0 focus:outline-none opacity-80 hover:opacity-100 transition-opacity">
            {isPlaying ? (
              <Pause className="w-[22px] h-[22px]" fill="currentColor" />
            ) : (
              <Play className="w-[22px] h-[22px]" fill="currentColor" />
            )}
          </button>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center relative h-5">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress || 0}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            {/* Custom Track */}
            <div className="w-full h-[3px] bg-black/20 rounded-full overflow-hidden">
               <div className="h-full bg-current transition-all" style={{ width: `${progress}%` }} />
            </div>
            {/* Custom Thumb */}
            <div 
              className="absolute h-2.5 w-2.5 rounded-full bg-current shadow-sm transition-all pointer-events-none" 
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>
        </div>

        {/* Time Text & Message Meta */}
        <div className="flex items-center justify-between pl-[40px] mt-0.5">
           <span className="text-[11px] opacity-70 font-medium tracking-wide">
             {formatAudioTime(isPlaying ? currentTime : duration)}
           </span>

           <div className="flex items-center gap-1 opacity-70">
             <span className="text-[9px] font-bold">{msgTime}</span>
             {isMe && (
               msgStatus === "read" 
                ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> 
                : <Check className="w-3.5 h-3.5" />
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsappView({ vendedorId }: { vendedorId?: string }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showTempDropdown, setShowTempDropdown] = useState(false);
  
  const [saleValue, setSaleValue] = useState("");

  const tempBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const lastPhoneJid = useRef<string | null>(null);
  const lidToJidMap = useRef<Map<string, string>>(new Map());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSeenMap = useRef<Map<string, Date>>(new Map());

  const [presenceChats, setPresenceChats] = useState<Map<string, string>>(new Map());
  const [myAvatar, setMyAvatar] = useState<string>("");
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chat: Chat } | null>(null);
  const [, forceUpdate] = useState(0); 

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    // Solicita permissão para notificações do Chrome
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendBrowserNotification = (title: string, body: string, icon?: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico"
      });
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wpp_lid_map');
      if (saved) new Map<string, string>(JSON.parse(saved)).forEach((v, k) => lidToJidMap.current.set(k, v));
    } catch { /* ignora */ }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wpp_lid_map');
      if (saved) new Map<string, string>(JSON.parse(saved)).forEach((v, k) => lidToJidMap.current.set(k, v));
    } catch { /* ignora */ }
  }, []);

  // Busca a foto da própria instância (Trafego)
  useEffect(() => {
    evolutionApi.getInstanceInfo().then(data => {
      if (data?.instance?.profilePictureUrl) {
        setMyAvatar(data.instance.profilePictureUrl);
      } else if (data?.instance?.owner) {
        evolutionApi.getProfilePic(data.instance.owner).then(url => {
          if (url) setMyAvatar(url);
        });
      }
    });
  }, []);

  const fetchAvatar = useCallback(async (remoteJid: string, force = false) => {
    // Se já tentamos buscar (mesmo que tenha vindo vazio), não tenta de novo nesta sessão
    if (!force && avatarCache.has(remoteJid)) {
      return avatarCache.get(remoteJid)!;
    }
    
    try {
      const url = await evolutionApi.getProfilePic(remoteJid);
      const finalUrl = url || "";
      avatarCache.set(remoteJid, finalUrl);
      
      if (finalUrl) {
        setChats(prev => prev.map(c => c.id === remoteJid ? { ...c, avatar: finalUrl } : c));
      }
      return finalUrl;
    } catch {
      // Silencia erros de busca de foto
    }
    return "";
  }, []);

  const isInitialLoad = useRef(true);

  const loadChats = useCallback(async (isSilent = false) => {
    try {
      // Só mostra o loading pesado se for a primeira carga absoluta
      if (!isSilent && isInitialLoad.current) setLoading(true);
      
      // 1. Busca instantânea no Supabase
      const dbClientes = await marketingService.getActiveClientes(viewMode === "archived");
      
      const mappedChats: Chat[] = dbClientes.map((item) => ({
        id: item.remote_jid,
        name: item.nome || item.push_name || item.remote_jid.split('@')[0],
        lastMessage: item.ultima_mensagem || "",
        time: item.ultima_conversa_em ? new Date(item.ultima_conversa_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        unreadCount: item.mensagens_nao_lidas || 0,
        avatar: item.foto_url || "",
        arquivado: item.arquivado,
        fixado: item.fixado || false,
        leadInfo: {
          status: item.status || "Novo Lead",
          temperature: (item.temperatura as Temperature) || "Frio",
          source: "WhatsApp",
          campaign: "Geral"
        }
      }));
      
      // MOSTRA OS DADOS DO BANCO IMEDIATAMENTE COM ORDENAÇÃO DE FIXADOS
      setChats(mappedChats.sort((a, b) => {
        if (a.fixado && !b.fixado) return -1;
        if (!a.fixado && b.fixado) return 1;
        return 0; // Mantém a ordem por data se ambos forem iguais
      }));
      setLoading(false);
      isInitialLoad.current = false;

      // 2. Sincronização em segundo plano (Não trava o usuário)
      if (mappedChats.length > 0) {
        evolutionApi.getChats().then(async (evoData) => {
          const evoChats = evoData as EvoChatResponse[];
          const updates: import("@/lib/marketing-service").MarketingCliente[] = []; 

          mappedChats.forEach(chat => {
            const evo = evoChats.find(e => (e.id || e.remoteJid) === chat.id);
            if (!evo) return;

            const resolvedName = evo.name || evo.pushName || chat.name;
            const lastMsg = typeof evo.lastMessage === 'string' ? evo.lastMessage : (evo.lastMessage?.message?.conversation || chat.lastMessage);

            if (resolvedName !== chat.name || lastMsg !== chat.lastMessage) {
              updates.push({
                remote_jid: chat.id,
                push_name: resolvedName,
                ultima_mensagem: lastMsg,
                ultima_conversa_em: evo.updatedAt || new Date().toISOString()
              });
            }
          });

          // Atualiza UI apenas se houver mudanças reais, preservando a ordem ATUAL do estado
          if (updates.length > 0) {
            setChats(prevChats => prevChats.map(chat => {
              const evo = evoChats.find(e => (e.id || e.remoteJid) === chat.id);
              if (!evo) return chat;
              const resolvedName = evo.name || evo.pushName || chat.name;
              const lastMsg = typeof evo.lastMessage === 'string' ? evo.lastMessage : (evo.lastMessage?.message?.conversation || chat.lastMessage);
              return { ...chat, name: resolvedName, lastMessage: lastMsg };
            }));
            marketingService.upsertClientes(updates);
          }
          });
      }
    } catch (error) {
      console.error("Erro ao carregar chats:", error);
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handlePinChat = async (chat: Chat) => {
    try {
      const newStatus = !chat.fixado;
      await marketingService.togglePin(chat.id, newStatus);
      
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, fixado: newStatus } : c).sort((a, b) => {
        if (a.fixado && !b.fixado) return -1;
        if (!a.fixado && b.fixado) return 1;
        return 0;
      }));
      
      if (selectedChat?.id === chat.id) {
        setSelectedChat({ ...selectedChat, fixado: newStatus });
      }
    } catch (error) {
      console.error("Erro ao fixar chat:", error);
    }
    setContextMenu(null);
  };

  const handleArchiveChat = async (reason?: string) => {
    const chatToArchive = contextMenu?.chat || selectedChat;
    if (!chatToArchive) return;
    
    try {
      await marketingService.toggleArchived(chatToArchive.id, true, reason);
      
      // Remove da lista local e limpa seleção se necessário
      setChats(prev => prev.filter(c => c.id !== chatToArchive.id));
      if (selectedChat?.id === chatToArchive.id) setSelectedChat(null);
      setShowArchiveModal(false);
    } catch (error) {
      console.error("Erro ao arquivar chat:", error);
    }
    setContextMenu(null);
  };

  const handleUnarchiveChat = async () => {
    const chatToUnarchive = contextMenu?.chat || selectedChat;
    if (!chatToUnarchive) return;
    
    try {
      await marketingService.toggleArchived(chatToUnarchive.id, false);
      
      // Remove da lista de arquivados e limpa seleção
      setChats(prev => prev.filter(c => c.id !== chatToUnarchive.id));
      if (selectedChat?.id === chatToUnarchive.id) setSelectedChat(null);
    } catch (error) {
      console.error("Erro ao desarquivar chat:", error);
    }
    setContextMenu(null);
  };

  useEffect(() => {
    // Conecta ao WebSocket para receber mensagens em tempo real
    const socket = evolutionApi.connectWebSocket();

    socket.on('connect', () => {
      socket.emit('subscribe', { instance: import.meta.env.VITE_EVO_INSTANCE });
      socket.emit('join', import.meta.env.VITE_EVO_INSTANCE);
    });

    const processMessage = async (message: EvoMessageResponse) => {
      const remoteJid = message.key?.remoteJid;
      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) return;

      // Guarda o JID para correlacionar com o LID do chats.update que vem logo após
      lastPhoneJid.current = remoteJid;

      // FILTRO DE DATA: Ignora mensagens com mais de 7 dias (evita spam de histórico antigo)
      const MIN_SYNC_TIMESTAMP = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
      const msgTimestamp = message.messageTimestamp || 0;
      
      if (msgTimestamp > 0 && msgTimestamp < MIN_SYNC_TIMESTAMP) {
        return;
      }

      console.log('📩 Mensagem de:', { remoteJid, pushName: message.pushName, fromMe: message.key?.fromMe, status: message.status });

      const messageContent = message.message;
      
      // Tratamento de reações
      if (messageContent?.reactionMessage) {
        const reactedMsgId = messageContent.reactionMessage.key?.id;
        const reactionText = messageContent.reactionMessage.text || "";
        if (reactedMsgId) {
          if (message.key && !message.key.fromMe) {
            const senderName = message.pushName || remoteJid.split('@')[0];
            const text = "Nova reação recebida";
            sendBrowserNotification(`Nova reação de ${senderName}`, text);
          }
          setMessages(prev => prev.map(m => m.id === reactedMsgId ? { ...m, reacao: reactionText } : m));
          return;
        }
      }

      const isAudio = !!messageContent?.audioMessage;
      const isSticker = !!messageContent?.stickerMessage;
      const text =
        messageContent?.conversation ||
        messageContent?.extendedTextMessage?.text ||
        messageContent?.imageMessage?.caption ||
        messageContent?.videoMessage?.caption ||
        (isAudio ? "🎵 Áudio" : isSticker ? "🖼️ Figurinha" : "📎 Mídia");

      const timestamp = message.messageTimestamp
        ? new Date(message.messageTimestamp * 1000).toISOString()
        : new Date().toISOString();

      if (!message.key?.fromMe) {
        const senderName = message.pushName || remoteJid.split('@')[0];
        sendBrowserNotification(`Nova mensagem de ${senderName}`, text);
      }

      const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const msgId = message.key?.id || Date.now().toString();

      // Download de mídias (foto, vídeo, áudio, doc)
      let mediaUrl: string | undefined = undefined;
      let tipoMsg = "text";
      const hasMedia = messageContent?.imageMessage || messageContent?.audioMessage || messageContent?.videoMessage || messageContent?.documentMessage || messageContent?.stickerMessage;

      if (hasMedia && message.key && message.key.id && message.key.remoteJid) {
        tipoMsg = messageContent.stickerMessage ? "sticker"
                : messageContent.imageMessage ? "image" 
                : messageContent.audioMessage ? "audio"
                : messageContent.videoMessage ? "video"
                : "document";

        try {
          // Extrai o objeto de mídia específico para pegar o mimetype
          const mediaObj = messageContent.imageMessage || messageContent.audioMessage || messageContent.videoMessage || messageContent.documentMessage || messageContent.stickerMessage;
          const mimetype = mediaObj?.mimetype || "application/octet-stream";
          
          let base64String = messageContent.base64;

          // Se o websocket já mandou o base64 (configuração da Evo API), usamos direto!
          if (base64String) {
            // Remove o prefixo data:mimetype;base64, se existir
            if (base64String.includes('base64,')) {
              base64String = base64String.split('base64,')[1];
            }
            
            const ext = mimetype.split('/')[1]?.split(';')[0] || "bin";
            const filename = `${msgId}.${ext}`;
            const publicUrl = await marketingService.uploadMedia(base64String, mimetype, filename);
            if (publicUrl) mediaUrl = publicUrl;
          } else {
            // Fallback: tenta baixar pela API
            const mediaData = await evolutionApi.getMediaBase64(message);
            if (mediaData) {
               const ext = mediaData.mimetype.split('/')[1]?.split(';')[0] || "bin";
               const filename = `${msgId}.${ext}`;
               const publicUrl = await marketingService.uploadMedia(mediaData.base64, mediaData.mimetype, filename);
               if (publicUrl) mediaUrl = publicUrl;
            }
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("Erro ao processar mídia da Evo API:", errorMessage);
        }
      }

      // pushName em mensagens recebidas (fromMe=false) é sempre o nome do contato
      const validPushName = !message.key?.fromMe && message.pushName ? message.pushName : null;

      // 1. Garante que o cliente existe ANTES de salvar a mensagem (evita FK constraint)
      await marketingService.upsertCliente({
        remote_jid: remoteJid,
        ...(validPushName ? { push_name: validPushName } : {}),
        ultima_mensagem: text,
        ultima_conversa_em: timestamp
      });

      // 2. Salva a mensagem no Supabase
      await marketingService.saveMessage({
        message_id: msgId,
        remote_jid: remoteJid,
        texto: text,
        sender: message.key?.fromMe ? "me" : "contact",
        timestamp: timestamp,
        status: message.status === "READ" ? "read" : "sent",
        tipo: tipoMsg,
        media_url: mediaUrl,
        ...(message.key?.fromMe ? { vendedor_id: vendedorId } : {})
      });

      // Se o chat estiver arquivado e chegou nova mensagem (de qualquer lado), desarquiva automaticamente
      setChats(prevChats => {
        const existingChat = prevChats.find(c => c.id === remoteJid);
        if (existingChat?.arquivado) {
          marketingService.toggleArchived(remoteJid, false);
        }
        return prevChats;
      });

      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(c => c.id === remoteJid);
        if (existingChatIndex !== -1) {
          const updatedChats = [...prevChats];
          const chat = { ...updatedChats[existingChatIndex] };

          // Se estava arquivado: remove da lista atual (ativa ou arquivada)
          if (chat.arquivado) {
            return prevChats.filter(c => c.id !== remoteJid);
          }

          chat.lastMessage = text;
          chat.lastMessageSender = message.key?.fromMe ? "me" : "contact";
          chat.time = time;

          // Atualiza nome se ainda estiver como número de telefone e tiver push name válido
          if (validPushName) {
            const isPhoneNumber = /^\d+$/.test(chat.name.replace(/\D/g, '')) && chat.name.length >= 8;
            if (isPhoneNumber || chat.name === "Novo Lead") {
              chat.name = validPushName;
            }
          }

          // Incrementa unread se não for o chat selecionado
          if (selectedChatRef.current?.id !== remoteJid) {
            chat.unreadCount = (chat.unreadCount || 0) + 1;
            // Persiste no banco de forma assíncrona
            marketingService.incrementUnread(remoteJid);
          }

          updatedChats.splice(existingChatIndex, 1);
          if (!chat.avatar) fetchAvatar(remoteJid);
          // Reinsere respeitando fixados: fixados ficam no topo
          const reordered = [chat, ...updatedChats];
          return reordered.sort((a, b) => {
            if (a.fixado && !b.fixado) return -1;
            if (!a.fixado && b.fixado) return 1;
            return 0; // dentro do mesmo grupo, mantém a ordem já existente
          });
        } else {
          fetchAvatar(remoteJid);

          const newChat: Chat = {
            id: remoteJid,
            name: message.key?.fromMe ? remoteJid.split('@')[0] : (validPushName || "Novo Lead"),
            lastMessage: text,
            lastMessageSender: message.key?.fromMe ? "me" : "contact",
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
          // Novo chat nunca é fixado, então vai logo após os fixados
          const withNew = [newChat, ...prevChats];
          return withNew.sort((a, b) => {
            if (a.fixado && !b.fixado) return -1;
            if (!a.fixado && b.fixado) return 1;
            return 0;
          });
        }
      });

      setSelectedChat(currentSelected => {
        if (currentSelected?.id === remoteJid) {
          setMessages(prevMsgs => {
            if (prevMsgs.some(m => m.id === msgId)) return prevMsgs;
            const newMsg: Message = {
              id: msgId,
              text: text,
              time: time,
              sender: message.key?.fromMe ? "me" : "contact",
              status: "sent",
              tipo: tipoMsg,
              mediaUrl: mediaUrl
            };
            return [...prevMsgs, newMsg];
          });
        }
        return currentSelected;
      });
    };

    const handleIncomingMessage = (data: Record<string, unknown>) => {

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
        if (!jid || !picUrl) return;

        if (jid.endsWith('@lid')) {
          // Mapeia LID → JID real usando o mesmo profilePicUrl
          const matchedJid = [...avatarCache.entries()].find(([, url]) => url === picUrl)?.[0];
          if (matchedJid) lidToJidMap.current.set(jid, matchedJid);
          return;
        }

        if (!jid.endsWith('@s.whatsapp.net')) return;
        avatarCache.set(jid, picUrl);
        marketingService.upsertCliente({ remote_jid: jid, foto_url: picUrl });
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
      const rawJid = (raw.id ?? raw.remoteJid) as string | undefined;
      if (!rawJid) return;

      const jid = rawJid.endsWith('@lid')
        ? (lidToJidMap.current.get(rawJid) ?? rawJid)
        : rawJid;

      const presences = raw.presences as Record<string, { lastKnownPresence?: string }> | undefined;
      const presence = presences
        ? Object.values(presences)[0]?.lastKnownPresence
        : (raw.presence as string | undefined);
      // Recebido: "typing" ou "composing" = digitando | "recording" = gravando áudio
      const presenceType = (presence === 'composing' || presence === 'typing') ? 'composing'
        : presence === 'recording' ? 'recording'
        : null;

      setPresenceChats(prev => {
        const next = new Map(prev);
        if (presenceType) {
          next.set(jid, presenceType);
          const existing = typingTimers.current.get(jid);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            setPresenceChats(s => { const n = new Map(s); n.delete(jid); return n; });
            typingTimers.current.delete(jid);
          }, 5000);
          typingTimers.current.set(jid, timer);
        } else {
          // Contato ficou offline/indisponível — registra o "visto por último"
          if (presence === 'unavailable' || presence === 'paused') {
            lastSeenMap.current.set(jid, new Date());
            forceUpdate(n => n + 1); // re-render para atualizar o header
          }
          next.delete(jid);
          const existing = typingTimers.current.get(jid);
          if (existing) { clearTimeout(existing); typingTimers.current.delete(jid); }
        }
        return next;
      });
    };

    socket.on('presence.update', handlePresenceUpdate);
    socket.on('PRESENCE_UPDATE', handlePresenceUpdate);

    // Correlaciona LID com JID de telefone usando a sequência de eventos
    const handleChatsUpdate = (data: Record<string, unknown>) => {
      const instanceName = import.meta.env.VITE_EVO_INSTANCE as string;
      if (data.instance && data.instance !== instanceName) return;
      const raw = data.data ?? data;
      const items = Array.isArray(raw) ? raw : [raw];
      (items as Array<{ remoteJid?: string }>).forEach(item => {
        const lid = item.remoteJid;
        if (lid?.endsWith('@lid') && lastPhoneJid.current) {
          lidToJidMap.current.set(lid, lastPhoneJid.current);
          localStorage.setItem('wpp_lid_map', JSON.stringify([...lidToJidMap.current.entries()]));
        }
      });
    };
    socket.on('chats.update', handleChatsUpdate);
    socket.on('CHATS_UPDATE', handleChatsUpdate);

    socket.on('disconnect', () => {
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchAvatar, vendedorId]);

  useEffect(() => {
    loadChats(); // Ativado para carregar conversas do banco/API
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

    // Se o chat estiver arquivado, desarquiva imediatamente ao responder
    if (selectedChat.arquivado) {
      marketingService.toggleArchived(selectedChat.id, false);
      setSelectedChat({ ...selectedChat, arquivado: false });
      setChats(prev => prev.filter(c => c.id !== selectedChat.id));
    }

    try {
      const msgId = "me_" + Date.now().toString();
      const timestamp = new Date().toISOString();
      const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newMsg: Message = {
        id: msgId,
        text: textToSend,
        time: time,
        sender: "me",
        status: "sent"
      };
      setMessages(prev => [...prev, newMsg]);

      // 1. Envia via API
      await evolutionApi.sendText(selectedChat.id, textToSend);

      // 2. Salva no Supabase
      await marketingService.saveMessage({
        message_id: msgId,
        remote_jid: selectedChat.id,
        texto: textToSend,
        sender: "me",
        timestamp: timestamp,
        status: "sent",
        vendedor_id: vendedorId
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleSelectChat = useCallback(async (chat: Chat) => {
    setSelectedChat(chat);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    // Persiste no banco que o usuário leu as mensagens
    if ((chat.unreadCount || 0) > 0) {
      marketingService.markAsRead(chat.id);
    }
    setLoadingMessages(true);
    setSaleValue("");
    evolutionApi.subscribePresence(chat.id);


    try {
      // 1. Busca do Banco primeiro (últimos 7 dias)
      const MIN_SYNC_DATE = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dbMessages = await marketingService.getMessagesByJid(chat.id, 50, MIN_SYNC_DATE);
      
      if (dbMessages.length > 0) {
        const msgs: Message[] = dbMessages.map(m => ({
          id: m.message_id,
          text: m.texto || "",
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: m.sender,
          status: (m.status as "sent" | "delivered" | "read") || "sent",
          tipo: m.tipo,
          mediaUrl: m.media_url,
          reacao: m.reacao
        }));
        setMessages(msgs);

        // Atualiza o lastMessageSender no chat da sidebar
        const lastMsg = dbMessages[dbMessages.length - 1];
        setChats(prev => prev.map(c =>
          c.id === chat.id ? { ...c, lastMessageSender: lastMsg.sender } : c
        ));

        setLoadingMessages(false);
      }

      // 2. Busca da Evolution API para sincronizar o que falta (opcional/segundo plano)
      const data = await evolutionApi.getMessages(chat.id) as Record<string, unknown>;
      
      const dataObj = data as Record<string, unknown>;
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

      const MIN_SYNC_TIMESTAMP = Math.floor(new Date('2026-05-04T08:50:00').getTime() / 1000);

      const apiMsgs: Message[] = rawMessages
        .filter((m: EvoMessageResponse) => {
          // Filtra apenas mensagens deste contato específico
          const msgJid = m.key?.remoteJid;
          if (msgJid && msgJid !== chat.id) return false;
          // Filtra mensagens antigas
          if (m.messageTimestamp && (m.messageTimestamp as number) < MIN_SYNC_TIMESTAMP) return false;
          return true;
        })
        .map((m: EvoMessageResponse) => {
          const messageContent = m.message;
          const text = 
            messageContent?.conversation || 
            messageContent?.extendedTextMessage?.text || 
            messageContent?.imageMessage?.caption ||
            messageContent?.videoMessage?.caption ||
            (typeof messageContent === 'string' ? messageContent : "") ||
            "Mídia";

          const msgTimestamp = m.messageTimestamp ? new Date((m.messageTimestamp as number) * 1000).toISOString() : new Date().toISOString();
          const msgId = (m.key?.id || m.id || Math.random().toString()) as string;

          // Salva mensagens da API no banco de forma assíncrona
          marketingService.saveMessage({
            message_id: msgId,
            remote_jid: chat.id,
            texto: text as string,
            sender: (m.key?.fromMe ? "me" : "contact") as "me" | "contact",
            timestamp: msgTimestamp,
            status: (m.status === "READ" ? "read" : "sent"),
            ...(m.key?.fromMe ? { vendedor_id: vendedorId } : {})
          });

          return {
            id: msgId,
            text: text as string,
            time: new Date(msgTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: (m.key?.fromMe ? "me" : "contact") as "me" | "contact",
            status: (m.status === "READ" ? "read" : "sent") as "sent" | "delivered" | "read"
          };
        }).reverse();
      
      // Se não tinha nada no banco, usa as da API
      if (dbMessages.length === 0) {
        setMessages(apiMsgs);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [vendedorId]);

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

  const handleConfirmSale = async () => {
    if (!selectedChat || !saleValue) return;
    
    try {
      const val = parseFloat(saleValue.replace(',', '.'));
      if (isNaN(val)) return;

      await marketingService.registerSale(selectedChat.id, val);
      
      // Feedback visual
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const saleMsg: Message = {
        id: "sale_" + Date.now(),
        text: `💰 VENDA REGISTRADA: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        time: time,
        sender: "me",
        status: "read",
        tipo: "text"
      };
      
      setMessages(prev => [...prev, saleMsg]);
      setShowSaleModal(false);
      setSaleValue("");
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
    }
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
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-muted-foreground uppercase">Valor da Venda</p>
                 <input 
                   type="number" 
                   placeholder="0,00" 
                   value={saleValue} 
                   onChange={(e)=>setSaleValue(e.target.value)} 
                   className="w-full p-4 bg-secondary/50 border border-border rounded-2xl text-lg font-black text-primary outline-none focus:border-primary/50 transition-colors" 
                 />
               </div>
               <button 
                 onClick={handleConfirmSale} 
                 className="w-full p-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
               >
                 Confirmar Venda
               </button>
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
                <button 
                  key={r} 
                  onClick={() => handleArchiveChat(r)} 
                  className="w-full p-3 text-left hover:bg-secondary rounded-xl text-xs font-bold transition-colors border border-transparent hover:border-border"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Chats */}
      <div className="w-80 border-r border-border flex flex-col bg-card/50 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-2xl tracking-tighter uppercase">
              {viewMode === "active" ? "Mensagens" : "Arquivados"}
            </h2>
            <div className="flex gap-1">
              {viewMode === "archived" && (
                <button 
                  onClick={() => setViewMode("active")}
                  className="p-2 hover:bg-secondary rounded-xl transition-all text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Sair
                </button>
              )}
              {viewMode === "active" && (
                <button 
                  onClick={() => setViewMode("archived")} 
                  className="p-2 hover:bg-secondary rounded-xl transition-colors text-muted-foreground hover:text-primary relative"
                  title="Arquivados"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </div>
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
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, chat });
              }}
              className={cn(
                "w-full p-4 rounded-2xl flex gap-4 transition-all relative group mb-1",
                selectedChat?.id === chat.id 
                  ? "bg-primary/10 border border-primary/20 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]" 
                  : "hover:bg-secondary/50 border border-transparent text-muted-foreground"
              )}
            >
              {/* Indicador Ativo */}
              {selectedChat?.id === chat.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
              )}

              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                {chat.avatar ? <img src={chat.avatar} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 min-w-0 flex justify-between gap-2">
                <div className="flex-1 min-w-0 flex flex-col justify-start pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(
                      "font-bold text-sm truncate tracking-tight font-inter", 
                      selectedChat?.id === chat.id ? "text-primary" : "text-foreground"
                    )}>
                      {chat.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {chat.fixado && <Pin className="w-3 h-3 text-primary rotate-45" />}
                  </div>
                  
                  <p className={cn(
                    "text-[11px] truncate font-medium pr-2 text-left",
                    presenceChats.has(chat.id)
                      ? "text-emerald-400 font-semibold animate-pulse"
                      : selectedChat?.id === chat.id ? "text-primary/70" : "text-muted-foreground/80"
                  )}>
                    {presenceChats.has(chat.id)
                      ? (presenceChats.get(chat.id) === 'recording' ? 'gravando áudio...' : 'escrevendo...')
                      : <>{chat.lastMessageSender === "me" && <span className="font-bold">Você: </span>}{chat.lastMessage}</>
                    }
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between py-0.5 shrink-0 min-w-[40px]">
                  <span className="text-[9px] font-bold opacity-50">{chat.time}</span>
                  {chat.unreadCount > 0 ? (
                    <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-black">
                      {chat.unreadCount}
                    </div>
                  ) : <div className="h-5" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-4 flex items-center justify-between border-b border-border bg-card/20 backdrop-blur-md z-40 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                   {selectedChat.avatar ? <img src={selectedChat.avatar} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-base tracking-tight font-inter">
                    {selectedChat.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <div className="flex items-center gap-2">
                    {presenceChats.has(selectedChat.id)
                      ? <p className="text-[10px] text-emerald-400 font-bold tracking-widest animate-pulse">
                          {presenceChats.get(selectedChat.id) === 'recording' ? 'gravando áudio...' : 'escrevendo...'}
                        </p>
                      : lastSeenMap.current.has(selectedChat.id)
                        ? <p className="text-[10px] text-muted-foreground font-medium">
                            visto por último às {lastSeenMap.current.get(selectedChat.id)!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        : <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    ref={tempBtnRef}
                    onClick={() => setShowTempDropdown(!showTempDropdown)}
                    className={cn("p-2.5 rounded-xl border flex items-center gap-2 transition-all", getTempColor(selectedChat.leadInfo?.temperature))}
                  >
                    <Flame className="w-4 h-4 pointer-events-none" />
                    <span className="text-[10px] font-black uppercase pointer-events-none">{selectedChat.leadInfo?.temperature || "Frio"}</span>
                    <ChevronDown className="w-3 h-3 pointer-events-none" />
                  </button>
                  {showTempDropdown && (
                    <div
                      className="absolute top-12 right-0 w-32 bg-card border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden"
                    >
                      {(["Quente", "Morno", "Frio"] as Temperature[]).map(t => (
                        <button key={t} onClick={()=>{ setSelectedChat({...selectedChat, leadInfo: {...selectedChat.leadInfo!, temperature: t}}); setShowTempDropdown(false); }} className="w-full p-3 text-[10px] font-black uppercase hover:bg-secondary text-left">{t}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={()=>setShowFollowUpModal(true)} className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><Bell className="w-4 h-4"/></button>
                <button onClick={()=>setShowSaleModal(true)} className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><DollarSign className="w-4 h-4"/></button>
                
                {viewMode === "active" ? (
                  <button 
                    onClick={() => setShowArchiveModal(true)} 
                    className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground hover:text-rose-500 transition-colors"
                    title="Arquivar Conversa"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={handleUnarchiveChat} 
                    className="p-2.5 hover:bg-secondary rounded-xl text-primary flex items-center gap-2 font-black text-[10px] uppercase tracking-widest px-4 transition-all"
                    title="Desarquivar Conversa"
                  >
                    <RefreshCw className="w-4 h-4" /> Desarquivar
                  </button>
                )}
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
                  {messages.map((msg) => {
                    const isVisualMedia = msg.tipo === "image" || msg.tipo === "video" || msg.tipo === "sticker";
                    const isSticker = msg.tipo === "sticker";
                    return (
                    <div key={msg.id} className={cn("flex flex-col", msg.sender === "me" ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-2xl shadow-sm relative flex flex-col group transition-all", 
                        isSticker 
                          ? "bg-transparent shadow-none border-none" 
                          : msg.sender === "me" ? "bg-primary text-white rounded-tr-none" : "bg-card border border-border text-foreground rounded-tl-none",
                        isVisualMedia ? "p-1" : "px-4 py-2"
                      )}>
                        
                        {/* Mídia: Imagem ou Figurinha */}
                        {(msg.tipo === "image" || msg.tipo === "sticker") && msg.mediaUrl && (
                          <img 
                            src={msg.mediaUrl} 
                            alt={isSticker ? "Figurinha" : "Imagem Recebida"} 
                            className={cn(
                              isSticker ? "w-40 sm:w-48 h-auto object-contain" : "w-72 max-w-full object-cover",
                              msg.text && !["Mídia", "📷 Imagem", "🖼️ Figurinha"].includes(msg.text) ? "rounded-t-xl rounded-b-sm" : "rounded-xl",
                              (msg.sender === "me" && !isSticker) ? "rounded-tr-none" : (!isSticker ? "rounded-tl-none" : "")
                            )} 
                          />
                        )}
                        
                        {/* Mídia: Vídeo */}
                        {msg.tipo === "video" && msg.mediaUrl && (
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className={cn(
                              "w-72 max-w-full",
                              msg.text && !["Mídia", "📹 Vídeo"].includes(msg.text) ? "rounded-t-xl rounded-b-sm" : "rounded-xl",
                              msg.sender === "me" ? "rounded-tr-none" : "rounded-tl-none"
                            )} 
                          />
                        )}
                        
                        {/* Mídia: Áudio */}
                        {msg.tipo === "audio" && msg.mediaUrl && (
                          <div className={cn(isVisualMedia ? "px-3 py-2" : "")}>
                            <CustomAudioPlayer 
                              src={msg.mediaUrl} 
                              isMe={msg.sender === "me"} 
                              avatar={msg.sender === "me" ? myAvatar : selectedChat?.avatar} 
                              msgTime={msg.time}
                              msgStatus={msg.status}
                            />
                          </div>
                        )}

                        {/* Mídia: Documento */}
                        {msg.tipo === "document" && msg.mediaUrl && (
                          <div className={cn(isVisualMedia ? "px-3 py-2" : "")}>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/10 p-3 rounded-xl mb-1 hover:bg-black/20 transition-colors">
                              <span className="text-xl">📎</span>
                              <span className="text-xs font-bold underline">Visualizar Anexo</span>
                            </a>
                          </div>
                        )}

                        {/* Texto ou Fallback de Erro */}
                        {msg.text && (
                          (!msg.mediaUrl && ["Mídia", "🎵 Áudio", "📎 Mídia", "🖼️ Figurinha"].includes(msg.text)) 
                            ? <p className={cn("text-sm font-medium whitespace-pre-wrap text-red-400", isVisualMedia ? "px-2 pt-2" : "")}>{msg.text} (Indisponível)</p>
                            : (!["Mídia", "🎵 Áudio", "📎 Mídia", "📷 Imagem", "📹 Vídeo", "🖼️ Figurinha"].includes(msg.text)) 
                              ? <p className={cn("text-sm font-medium whitespace-pre-wrap", isVisualMedia ? "px-2 pt-1 pb-1" : "")}>{msg.text}</p>
                              : null
                        )}
                        
                        {/* Time & Status (Hided for Audio as it's inside CustomAudioPlayer) */}
                        {msg.tipo !== "audio" && (
                          <div className={cn(
                            "flex justify-end gap-1",
                            (() => {
                              const hasRealText = msg.text && !["Mídia", "🎵 Áudio", "📎 Mídia", "📷 Imagem", "📹 Vídeo", "🖼️ Figurinha"].includes(msg.text);
                              if (isVisualMedia && !hasRealText) {
                                return cn(
                                  "absolute bottom-2 right-2.5 px-1.5 py-0.5 rounded-full z-10 text-white/90",
                                  isSticker ? "bg-black/20 backdrop-blur-[2px]" : "bg-black/30 backdrop-blur-md"
                                );
                              }
                              return cn("opacity-60", isVisualMedia ? "px-2 pb-0.5 mt-0.5" : "mt-1");
                            })()
                          )}>
                            <span className="text-[9px] font-bold mt-[1px]">{msg.time}</span>
                            {msg.sender === "me" && (
                              <span className={cn(
                                msg.status === "read" ? "text-blue-400" : "",
                                (() => {
                                  const hasRealText = msg.text && !["Mídia", "🎵 Áudio", "📎 Mídia", "📷 Imagem", "📹 Vídeo"].includes(msg.text);
                                  return (isVisualMedia && !hasRealText && msg.status === "read") ? "text-blue-300" : "";
                                })()
                              )}>
                                {msg.status === "read" ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Reação */}
                      {msg.reacao && (
                        <div className={cn("text-lg -mt-3 z-10", msg.sender === "me" ? "mr-4" : "ml-4")}>
                          <div className="bg-card border border-border shadow-md rounded-full px-1.5 py-0.5 text-sm">
                            {msg.reacao}
                          </div>
                        </div>
                      )}
                    </div>
                  )})}

                  {/* Indicador de Digitando / Gravando */}
                  {selectedChat && presenceChats.has(selectedChat.id) && (
                    <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-card/80 backdrop-blur-md px-4 py-3 rounded-2xl rounded-tl-none border border-border/50 flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
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

      {/* Context Menu UI */}
      {contextMenu && (
        <div 
          className="fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => handlePinChat(contextMenu.chat)}
            className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-secondary flex items-center gap-3 transition-colors"
          >
            {contextMenu.chat.fixado ? (
              <><PinOff className="w-4 h-4 text-muted-foreground" /> Desafixar</>
            ) : (
              <><Pin className="w-4 h-4 text-primary" /> Fixar Conversa</>
            )}
          </button>
          
          <button 
            onClick={() => {
              if (viewMode === "active") {
                setContextMenu(null);
                setShowArchiveModal(true);
              } else {
                handleUnarchiveChat();
              }
            }}
            className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-secondary flex items-center gap-3 transition-colors text-rose-500"
          >
            {viewMode === "active" ? (
              <><Archive className="w-4 h-4" /> Arquivar</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Desarquivar</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
