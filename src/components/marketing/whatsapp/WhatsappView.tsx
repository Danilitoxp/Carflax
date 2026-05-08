import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  Search, 
  Paperclip, 
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
  Mic,
  FileText,
  Sparkles,
  ShoppingBag,
  Camera,
  Video,
  Smile,
  Printer
} from "lucide-react";
import { evolutionApi } from "@/lib/evolution-v2";
import { marketingService } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";
import { apiDashboardProdutos } from "@/lib/api";
import { transcribeAudio, classifyTemperature } from "@/lib/gemini-service";
import { Package } from "lucide-react";

interface NormalizedProduct {
  cod: string;
  descricao: string;
  marca: string;
  preco: number;
  debito: number;
  credito: number;
  disponivel: number;
  quantidade?: number;
}

const BRAND_COLORS = [
  ['from-blue-500 to-blue-700', 'bg-blue-600'],
  ['from-emerald-500 to-emerald-700', 'bg-emerald-600'],
  ['from-violet-500 to-violet-700', 'bg-violet-600'],
  ['from-orange-500 to-orange-700', 'bg-orange-600'],
  ['from-rose-500 to-rose-700', 'bg-rose-600'],
  ['from-cyan-500 to-cyan-700', 'bg-cyan-600'],
  ['from-amber-500 to-amber-700', 'bg-amber-600'],
  ['from-indigo-500 to-indigo-700', 'bg-indigo-600'],
  ['from-teal-500 to-teal-700', 'bg-teal-600'],
  ['from-fuchsia-500 to-fuchsia-700', 'bg-fuchsia-600'],
];

function getBrandStyle(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

function getBrandInitials(brand: string): string {
  return brand.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';
}

interface Message {
  id: string;
  text: string;
  time: string;
  sender: "me" | "contact";
  status: "sent" | "delivered" | "read";
  tipo?: string;
  mediaUrl?: string;
  reacao?: string;
  fileName?: string;
  transcription?: string;
  isTranscribing?: boolean;
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
  lastMessageType?: string;
  lastMessageStatus?: "sent" | "delivered" | "read";
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

function inferMsgType(text?: string): string | undefined {
  if (!text) return undefined;
  if (text.includes("🎵") || text === "Áudio") return "audio";
  if (text.includes("📷") || text === "Foto") return "image";
  if (text.includes("📹") || text === "Vídeo") return "video";
  if (text.includes("📎") || text === "Documento") return "document";
  if (text.includes("🖼️") || text === "Figurinha") return "sticker";
  return "text";
}

function getFileExt(filename?: string): string {
  if (!filename) return "DOC";
  return (filename.split('.').pop()?.toUpperCase() || "DOC").slice(0, 4);
}

function getFileIconColor(filename?: string): string {
  const ext = filename?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'bg-red-500';
    case 'doc': case 'docx': return 'bg-blue-500';
    case 'xls': case 'xlsx': return 'bg-emerald-600';
    case 'ppt': case 'pptx': return 'bg-orange-500';
    case 'zip': case 'rar': case '7z': return 'bg-yellow-600';
    case 'mp4': case 'mov': case 'avi': return 'bg-purple-500';
    default: return 'bg-slate-500';
  }
}

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => (a.fixado === b.fixado ? 0 : a.fixado ? -1 : 1));
}

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
                ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#020817' }} />
                : msgStatus === "delivered"
                  ? <CheckCheck className="w-3.5 h-3.5 text-white" />
                  : <Check className="w-3.5 h-3.5 text-white" />
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [allProducts, setAllProducts] = useState<NormalizedProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cartProducts, setCartProducts] = useState<NormalizedProduct[]>([]);
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null);
  const productsLoadedRef = useRef(false);

  const tempBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const lastPhoneJid = useRef<string | null>(null);
  const lidToJidMap = useRef<Map<string, string>>(new Map());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSeenMap = useRef<Map<string, Date>>(new Map());
  const processedMsgIds = useRef<Set<string>>(new Set());
  const lidSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualOverrideRef = useRef<Map<string, number>>(new Map());
  const tempClassifyTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [presenceChats, setPresenceChats] = useState<Map<string, string>>(new Map());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isClassifyingTemp, setIsClassifyingTemp] = useState(false);
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
        icon: icon || "/favicon.svg",
        badge: "/favicon.svg"
      });
    }
  };

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
      // Cap: remove a entrada mais antiga quando ultrapassa 300 contatos
      if (avatarCache.size >= 300) avatarCache.delete(avatarCache.keys().next().value!);
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

  const loadChats = useCallback(async () => {
    try {
      setChats([]);
      setLoading(true);

      // 1. Busca no Supabase — carrega ativas e arquivadas de uma só vez
      const dbClientes = await marketingService.getActiveClientes('all');
      
      const mappedChats: Chat[] = dbClientes.map((item) => ({
        id: item.remote_jid,
        name: item.nome || item.push_name || item.remote_jid.split('@')[0],
        lastMessage: item.ultima_mensagem || "",
        lastMessageType: inferMsgType(item.ultima_mensagem || ""),
        time: item.ultima_conversa_em ? new Date(item.ultima_conversa_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        unreadCount: item.mensagens_nao_lidas || 0,
        avatar: item.foto_url || "",
        arquivado: item.arquivado,
        fixado: item.fixado || false,
        leadInfo: {
          status: item.status || "Novo Lead",
          temperature: (item.temperatura as Temperature) || "Frio",
          source: "WhatsApp",
          campaign: "Geral",
          saleValue: item.valor_venda > 0
            ? item.valor_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : undefined
        }
      }));
      
      setChats(sortChats(mappedChats));
      setLoading(false);

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
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handlePinChat = (chat: Chat) => {
    const newStatus = !chat.fixado;

    // Atualiza UI imediatamente
    setChats(prev =>
      prev.map(c => c.id === chat.id ? { ...c, fixado: newStatus } : c)
         .sort((a, b) => (a.fixado === b.fixado ? 0 : a.fixado ? -1 : 1))
    );
    if (selectedChat?.id === chat.id) setSelectedChat({ ...selectedChat, fixado: newStatus });
    setContextMenu(null);

    // Persiste em segundo plano
    marketingService.togglePin(chat.id, newStatus).catch(err =>
      console.error("Erro ao fixar chat:", err)
    );
  };

  const handleArchiveChat = async (reason?: string) => {
    const chatToArchive = contextMenu?.chat || selectedChat;
    if (!chatToArchive) return;

    setChats(prev => prev.map(c => c.id === chatToArchive.id ? { ...c, arquivado: true } : c));
    if (selectedChat?.id === chatToArchive.id) setSelectedChat(null);
    setShowArchiveModal(false);
    setContextMenu(null);

    marketingService.toggleArchived(chatToArchive.id, true, reason).catch(err =>
      console.error("Erro ao arquivar chat:", err)
    );
  };

  const handleUnarchiveChat = async () => {
    const chatToUnarchive = contextMenu?.chat || selectedChat;
    if (!chatToUnarchive) return;

    setChats(prev => prev.map(c => c.id === chatToUnarchive.id ? { ...c, arquivado: false } : c));
    if (selectedChat?.id === chatToUnarchive.id) setSelectedChat(null);
    setContextMenu(null);

    marketingService.toggleArchived(chatToUnarchive.id, false).catch(err =>
      console.error("Erro ao desarquivar chat:", err)
    );
  };

  useEffect(() => {
    const currentTimers = tempClassifyTimers.current;
    // Conecta ao WebSocket para receber mensagens em tempo real
    const socket = evolutionApi.connectWebSocket();

    const processMessage = async (message: EvoMessageResponse) => {
      console.log("🚀 PAYLOAD RECEBIDO NO FRONTEND VIA WEBSOCKET:", JSON.stringify(message, null, 2));
      const remoteJid = message.key?.remoteJid;
      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) return;

      // Deduplicação: ignora se esta mensagem já foi processada na sessão
      const msgKeyId = message.key?.id;
      if (msgKeyId) {
        if (processedMsgIds.current.has(msgKeyId)) return;
        processedMsgIds.current.add(msgKeyId);
        // Evita crescimento ilimitado: descarta as primeiras 250 entradas ao atingir 500
        if (processedMsgIds.current.size > 500) {
          const arr = [...processedMsgIds.current];
          processedMsgIds.current = new Set(arr.slice(250));
        }
      }

      // Guarda o JID para correlacionar com o LID do chats.update que vem logo após
      lastPhoneJid.current = remoteJid;

      // Ignora mensagens com mais de 7 dias
      const MIN_SYNC_TIMESTAMP = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
      const msgTimestamp = message.messageTimestamp || 0;
      if (msgTimestamp > 0 && msgTimestamp < MIN_SYNC_TIMESTAMP) return;

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
      const isDocument = !!messageContent?.documentMessage;
      const text =
        messageContent?.conversation ||
        messageContent?.extendedTextMessage?.text ||
        messageContent?.imageMessage?.caption ||
        messageContent?.videoMessage?.caption ||
        (isDocument ? (messageContent.documentMessage?.fileName || "Documento") : null) ||
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

      // Determinando o tipo da mensagem e dados básicos para a UI
      const tipoMsg = messageContent?.stickerMessage ? "sticker"
                    : messageContent?.imageMessage ? "image" 
                    : messageContent?.audioMessage ? "audio"
                    : messageContent?.videoMessage ? "video"
                    : messageContent?.documentMessage ? "document"
                    : "text";

      const validPushName = !message.key?.fromMe && message.pushName ? message.pushName : null;
      const mediaUrl: string | undefined = undefined;
      const isMediaMsg = ["audio", "image", "video", "document", "sticker"].includes(tipoMsg);

      // Persiste a mensagem no Supabase para garantir que apareça após refresh
      marketingService.saveMessage({
        message_id: msgId,
        remote_jid: remoteJid,
        texto: text,
        sender: message.key?.fromMe ? "me" : "contact",
        timestamp,
        tipo: tipoMsg,
        status: (message.status === "READ" || String(message.status) === "3") ? "read" : (message.status === "DELIVERY_ACK" || String(message.status) === "2") ? "delivered" : "sent",
        ...(message.key?.fromMe ? { vendedor_id: vendedorId } : {}),
      }).catch(() => null);

      // Download assíncrono de mídia — não bloqueia a renderização da mensagem
      if (isMediaMsg) {
        interface EvoMediaPayload {
          base64?: string;
          message?: {
            base64?: string;
            imageMessage?: { mimetype?: string };
            videoMessage?: { mimetype?: string };
            documentMessage?: { mimetype?: string };
            audioMessage?: { mimetype?: string };
          };
        }
        
        const payload = message as unknown as EvoMediaPayload;
        const mediaBase64 = payload.message?.base64 || payload.base64;
        const mimetype = payload.message?.imageMessage?.mimetype || payload.message?.videoMessage?.mimetype || payload.message?.documentMessage?.mimetype || payload.message?.audioMessage?.mimetype || "application/octet-stream";

        if (mediaBase64) {
          // O Websocket já mandou a imagem pra gente, subimos direto!
          const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin';
          marketingService.uploadMedia(mediaBase64, mimetype, `${msgId}.${ext}`).then(async (publicUrl) => {
            if (publicUrl) {
              await marketingService.updateMessageMediaUrl(msgId, publicUrl);
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, mediaUrl: publicUrl } : m));
            }
          });
        } else {
          // Fallback
          evolutionApi.getMediaBase64(message).then(async (media) => {
            if (!media?.base64) return;
            const ext = media.mimetype?.split('/')[1]?.split(';')[0] || 'bin';
            const publicUrl = await marketingService.uploadMedia(media.base64, media.mimetype, `${msgId}.${ext}`);
            if (!publicUrl) return;
            await marketingService.updateMessageMediaUrl(msgId, publicUrl);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, mediaUrl: publicUrl } : m));
          }).catch(() => null);
        }
      }

      // Classificação automática de temperatura — só mensagens do contato
      if (!message.key?.fromMe) {
        const existing = tempClassifyTimers.current.get(remoteJid);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          tempClassifyTimers.current.delete(remoteJid);
          triggerTempClassifyRef.current(remoteJid);
        }, 5000);
        tempClassifyTimers.current.set(remoteJid, timer);
      }

      // Upsert do cliente para manter nome atualizado
      if (validPushName) {
        marketingService.upsertCliente({ remote_jid: remoteJid, nome: validPushName }).catch(() => null);
      }

      setChats(prevChats => {
        // Desarquiva automaticamente se chegou nova mensagem
        const existingChat = prevChats.find(c => c.id === remoteJid);
        if (existingChat?.arquivado) marketingService.toggleArchived(remoteJid, false);
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
          chat.lastMessageType = tipoMsg;
          chat.lastMessageStatus = message.key?.fromMe ? "sent" : undefined;
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
          return sortChats([chat, ...updatedChats]);
        } else {
          fetchAvatar(remoteJid);

          const newChat: Chat = {
            id: remoteJid,
            name: message.key?.fromMe ? remoteJid.split('@')[0] : (validPushName || "Novo Lead"),
            lastMessage: text,
            lastMessageSender: message.key?.fromMe ? "me" : "contact",
            lastMessageType: tipoMsg,
            lastMessageStatus: message.key?.fromMe ? "sent" : undefined,
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
          return sortChats([newChat, ...prevChats]);
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

    const handleMessageUpdate = (data: Record<string, unknown>) => {
      console.log("📬 messages.update RECEBIDO:", JSON.stringify(data, null, 2));
      const instanceName = import.meta.env.VITE_EVO_INSTANCE as string;
      if (data.instance && data.instance !== instanceName) {
        console.log("📬 ignorado — instância diferente:", data.instance, "!=", instanceName);
        return;
      }

      interface UpdateItemNested {
        key?: { id?: string };
        update?: { status?: string | number };
      }
      interface UpdateItemFlat {
        keyId?: string;
        status?: string | number;
      }

      const rawData = data.data;
      const items: unknown[] = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : [data]);

      items.forEach((item) => {
         const flat = item as UpdateItemFlat;
         const nested = item as UpdateItemNested;

         // Suporta formato plano { keyId, status } e formato aninhado { key: { id }, update: { status } }
         const msgId = flat.keyId || nested.key?.id;
         const rawStatus = flat.status ?? nested.update?.status;

         console.log("📬 item — msgId:", msgId, "rawStatus:", rawStatus);
         if (!msgId || rawStatus === undefined || rawStatus === null) return;

         let newStatus: "sent" | "delivered" | "read" | undefined;
         if (rawStatus === 2 || rawStatus === "DELIVERY_ACK") newStatus = "delivered";
         if (rawStatus === 3 || rawStatus === "READ" || rawStatus === 4 || rawStatus === "PLAYED") newStatus = "read";

         console.log("📬 rawStatus:", rawStatus, "→ newStatus:", newStatus);

         if (newStatus) {
            setMessages(prev => {
              const found = prev.some(m => m.id === msgId);
              console.log("📬 buscando msg id:", msgId, "— encontrou?", found);
              return prev.map(m => m.id === msgId ? { ...m, status: newStatus as "sent" | "delivered" | "read" } : m);
            });
            // Atualiza status na sidebar para a última mensagem
            setChats(prev => prev.map(c => {
              const lastMsgIsThis = c.lastMessageSender === "me";
              return lastMsgIsThis ? { ...c, lastMessageStatus: newStatus } : c;
            }));
            marketingService.updateMessageStatus(msgId, newStatus);
         }
      });
    };

    socket.on('messages.update', handleMessageUpdate);
    socket.on('MESSAGES_UPDATE', handleMessageUpdate);

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
          // Debounce: evita serialização síncrona em cada evento WS
          if (lidSaveTimer.current) clearTimeout(lidSaveTimer.current);
          lidSaveTimer.current = setTimeout(() => {
            localStorage.setItem('wpp_lid_map', JSON.stringify([...lidToJidMap.current.entries()]));
          }, 2000);
        }
      });
    };
    socket.on('chats.update', handleChatsUpdate);
    socket.on('CHATS_UPDATE', handleChatsUpdate);

    socket.on('disconnect', () => {
    });

    return () => {
      socket.off('messages.upsert', handleIncomingMessage);
      socket.off('MESSAGES_UPSERT', handleIncomingMessage);
      socket.off('message', handleIncomingMessage);
      socket.off('message-received', handleIncomingMessage);
      socket.off('contacts.update', handleContactsUpdate);
      socket.off('CONTACTS_UPDATE', handleContactsUpdate);
      socket.off('presence.update', handlePresenceUpdate);
      socket.off('PRESENCE_UPDATE', handlePresenceUpdate);
      socket.off('chats.update', handleChatsUpdate);
      socket.off('CHATS_UPDATE', handleChatsUpdate);
      currentTimers.forEach(t => clearTimeout(t));
      currentTimers.clear();
    };
  }, [fetchAvatar, vendedorId]);

  useEffect(() => {
    loadChats();
    setLoading(false);
  }, [loadChats]);

  // Reclassifica leads sem temperatura definida (Frio padrão) ao carregar
  useEffect(() => {
    const reclassifyUnclassified = async () => {
      const allClientes = await marketingService.getActiveClientes('all');
      // Processa apenas leads sem temperatura ou com "Frio" padrão, em lotes de 5
      const targets = allClientes.filter(c => !c.temperatura || c.temperatura === 'Frio');
      for (let i = 0; i < Math.min(targets.length, 30); i++) {
        const cliente = targets[i];
        const msgs = await marketingService.getMessagesByJid(cliente.remote_jid, 15);
        if (msgs.length < 3) continue;
        try {
          const newTemp = await classifyTemperature(
            msgs.map(m => ({ sender: m.sender as "me" | "contact", text: m.texto || "" }))
          );
          if (newTemp !== 'Frio') {
            await marketingService.upsertCliente({ remote_jid: cliente.remote_jid, temperatura: newTemp });
            setChats(prev => prev.map(c =>
              c.id === cliente.remote_jid ? { ...c, leadInfo: { ...c.leadInfo!, temperature: newTemp as Temperature } } : c
            ));
          }
        } catch {
          // silencia erros individuais para não interromper o lote
        }
        // pequena pausa para não sobrecarregar a API do Gemini
        await new Promise(r => setTimeout(r, 300));
      }
    };
    // Aguarda os chats carregarem antes de reclassificar
    const id = setTimeout(reclassifyUnclassified, 5000);
    return () => clearTimeout(id);
  }, []);

  // Tempo médio de 1ª resposta do dia (atualiza a cada 5 min)
  useEffect(() => {
    const fetchResponseTime = async () => {
      const today = new Date();
      const val = await marketingService.getAvgFirstResponseTime(today, today);
      setAvgResponseTime(val);
    };
    fetchResponseTime();
    const id = setInterval(fetchResponseTime, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      manualOverrideRef.current.forEach((ts, jid) => {
        if (now - ts > 10 * 60 * 1000) manualOverrideRef.current.delete(jid);
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

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
      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, arquivado: false } : c));
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
        status: "sent",
        tipo: "text"
      };

      setMessages(prev => [...prev, newMsg]);

      // Atualiza o lastMessage no chat da sidebar
      setChats(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, lastMessage: textToSend, lastMessageSender: "me", lastMessageType: "text", lastMessageStatus: "sent", time: "Agora" } : c
      ));

      const sendResp = await evolutionApi.sendText(selectedChat.id, textToSend);
      console.log("📤 sendText response:", JSON.stringify(sendResp, null, 2));
      const realId = sendResp?.key?.id;
      console.log("📤 fakeId:", msgId, "→ realId:", realId);
      if (realId) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, id: realId } : m));
      }

      await marketingService.upsertCliente({
        remote_jid: selectedChat.id,
        ultima_mensagem: textToSend,
        ultima_conversa_em: timestamp,
        status: "Em Contato"
      });

      await marketingService.saveMessage({
        message_id: realId || msgId,
        remote_jid: selectedChat.id,
        texto: textToSend,
        sender: "me",
        timestamp,
        status: "sent",
        tipo: "text",
        vendedor_id: vendedorId
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleSendDocument = async (file: File) => {
    if (!selectedChat) return;
    setPendingFile(file);
  };

  const confirmSendFile = async () => {
    if (!pendingFile || !selectedChat) return;
    
    const file = pendingFile;
    const caption = inputText;
    setPendingFile(null);
    setInputText("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Full = reader.result as string;
      const base64 = base64Full.split(',')[1];

      const msgId = "doc_" + Date.now();
      const timestamp = new Date().toISOString();
      const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newMsg: Message = {
        id: msgId,
        text: caption || file.name,
        time,
        sender: "me",
        status: "sent",
        tipo: "document",
        mediaUrl: base64Full,
        fileName: file.name,
      };
      setMessages(prev => [...prev, newMsg]);

      try {
        const ext = file.name.split('.').pop() || 'bin';
        const filename = `${msgId}.${ext}`;
        const publicUrl = await marketingService.uploadMedia(base64, file.type, filename);

        if (publicUrl) {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, mediaUrl: publicUrl } : m));
        }

        const docResp = await evolutionApi.sendDocument(selectedChat.id, base64, file.type, file.name, caption);
        const realDocId = docResp?.key?.id;
        if (realDocId) {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, id: realDocId } : m));
        }

        await marketingService.upsertCliente({
          remote_jid: selectedChat.id,
          ultima_mensagem: `📎 ${file.name}`,
          ultima_conversa_em: timestamp,
          status: "Em Contato"
        });

        await marketingService.saveMessage({
          message_id: realDocId || msgId,
          remote_jid: selectedChat.id,
          texto: caption || file.name,
          sender: "me",
          timestamp,
          status: "sent",
          tipo: "document",
          media_url: publicUrl || undefined,
          vendedor_id: vendedorId,
        });
      } catch (error) {
        console.error("Erro ao enviar documento:", error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.kind === 'file') {
      const file = item.getAsFile();
      if (file) handleSendDocument(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSendDocument(file);
  };

  const loadProducts = useCallback(async () => {
    if (productsLoadedRef.current) return;
    setLoadingProducts(true);
    try {
      const data = await apiDashboardProdutos();
      // Normaliza preços uma única vez no fetch — elimina parsing repetido no render
      const normalized: NormalizedProduct[] = data.map(p => {
        const parseBrl = (val: string | number | null | undefined) => {
          if (val === undefined || val === null || val === '') return 0;
          const s = String(val).trim();
          // Se tiver vírgula e ponto, ou só vírgula, assume formato BRL (1.234,56 ou 1234,56)
          if (s.includes(',')) {
            return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
          }
          return parseFloat(s) || 0;
        };

        const preco = parseBrl(p.PRECO_VENDA);
        const debito = preco;
        const credito = preco * 1.0466;
        
        return {
          cod: p.COD_ITEM,
          descricao: p.DESCRICAO,
          marca: p.MARCA || '',
          disponivel: parseBrl(p.TOTAL_DISPONIVEL),
          preco,
          debito,
          credito,
        };
      });
      setAllProducts(normalized);
      productsLoadedRef.current = true;
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []); // Sem deps: usa ref para o flag, não recria a função após o load

  useEffect(() => {
    if (showProductSelector) loadProducts();
  }, [showProductSelector, loadProducts]);

  const displayedChats = useMemo(() =>
    chats.filter(c => viewMode === "archived" ? c.arquivado : !c.arquivado),
    [chats, viewMode]
  );

  const filteredChats = useMemo(() => {
    const searchLower = chatSearch.trim().toLowerCase();
    if (!searchLower) return displayedChats;
    return displayedChats.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower) ||
      c.lastMessage.toLowerCase().includes(searchLower)
    );
  }, [displayedChats, chatSearch]);

  const filteredProducts = useMemo(() => {
    const searchLower = productSearch.trim().toLowerCase();
    
    // Filtra itens indesejados e itens que já estão no carrinho
    const cartIds = new Set(cartProducts.map(x => x.cod));
    const validProducts = allProducts.filter(p => 
      p.descricao !== "ITEM CONVERSAO" && 
      p.debito > 0 &&
      !cartIds.has(p.cod)
    );

    if (searchLower.length < 2) return validProducts.slice(0, 30);
    
    const words = searchLower.split(/\s+/);
    return validProducts
      .filter(p => {
        const desc = p.descricao.toLowerCase();
        const cod = p.cod.toLowerCase();
        return words.every(w => desc.includes(w)) || cod.includes(searchLower);
      })
      .slice(0, 50);
  }, [allProducts, productSearch, cartProducts]);

  const handleToggleCart = (p: NormalizedProduct) => {
    setCartProducts(prev => {
      const exists = prev.find(x => x.cod === p.cod);
      if (exists) return prev.filter(x => x.cod !== p.cod);
      return [...prev, { ...p, quantidade: 1 }];
    });
  };

  const handleUpdateQuantity = (cod: string, delta: number) => {
    setCartProducts(prev => prev.map(p => {
      if (p.cod === cod) {
        const newQty = Math.max(1, (p.quantidade || 1) + delta);
        return { ...p, quantidade: newQty };
      }
      return p;
    }));
  };

  const handleInsertQuote = () => {
    if (cartProducts.length === 0) return;

    const totalDebito = cartProducts.reduce((s, p) => s + (p.debito * (p.quantidade || 1)), 0);
    const totalCredito = cartProducts.reduce((s, p) => s + (p.credito * (p.quantidade || 1)), 0);

    let text = `📦 *ORÇAMENTO:*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📋 *ITENS DO PEDIDO:*\n\n`;
    
    cartProducts.forEach((p, index) => {
      const qty = p.quantidade || 1;
      text += `${index + 1}️⃣ *${p.descricao.toUpperCase()}*\n`;
      text += `   ▫️ *Quantidade:* ${qty}\n`;
      
      if (qty > 1) {
        text += `   ▫️ *Unitário:* R$ ${p.debito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Pix)\n`;
      }
      
      text += `   ▫️ *Subtotal:* R$ ${(p.debito * qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Pix)\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `💰 *VALORES TOTAIS:* \n\n`;
    text += `💵 *À VISTA (PIX/DÉBITO):*\n`;
    text += `👉 *R$ ${totalDebito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    
    text += `💳 *CARTÃO DE CRÉDITO:*\n`;
    text += `👉 *R$ ${totalCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
    text += `*(Ou 3x de R$ ${(totalCredito / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} s/ juros)*\n\n`;

    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ _Valores sujeitos a alteração de estoque._\n`;
    text += `🚀 _Aguardamos sua confirmação para reserva!_`;

    setInputText(prev => prev + text);
    setShowProductSelector(false);
    setCartProducts([]);
  };

  const handleTranscribe = async (msg: Message) => {
    if (!msg.mediaUrl || msg.isTranscribing) return;

    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTranscribing: true } : m));

    try {
      // 1. Busca o áudio e converte para base64
      const response = await fetch(msg.mediaUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const base64 = await base64Promise;
      const transcription = await transcribeAudio(base64, blob.type || "audio/ogg");

      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, transcription, isTranscribing: false } : m));
    } catch (error) {
      console.error("Erro ao transcrever:", error);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTranscribing: false } : m));
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
      const dbMessages = await marketingService.getMessagesByJid(chat.id, 200);

      const msgs: Message[] = dbMessages.map(m => ({
        id: m.message_id,
        text: m.texto || "",
        time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: m.sender,
        status: (m.status as "sent" | "delivered" | "read") || "sent",
        tipo: m.tipo,
        mediaUrl: m.media_url,
        reacao: m.reacao,
      }));

      setMessages(msgs);

      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        setChats(prev => prev.map(c =>
          c.id === chat.id ? {
            ...c,
            lastMessageSender: lastMsg.sender,
            lastMessageType: lastMsg.tipo || inferMsgType(lastMsg.text),
            lastMessageStatus: lastMsg.sender === "me" ? lastMsg.status : undefined,
          } : c
        ));
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial Auto-selection - MOVED BELOW handleSelectChat
  useEffect(() => {
    if (displayedChats.length > 0 && !selectedChat) {
      const pendingChatJid = localStorage.getItem("carflax_pending_chat");
      if (pendingChatJid) {
        const found = displayedChats.find(c => c.id === pendingChatJid);
        if (found) {
          handleSelectChat(found);
          localStorage.removeItem("carflax_pending_chat");
          return;
        }
      }
      handleSelectChat(displayedChats[0]);
    }
  }, [displayedChats, selectedChat, handleSelectChat]);

  const scheduleFollowUp = (label: string) => {
    if (!selectedChat || !selectedChat.leadInfo) return;
    setSelectedChat({
      ...selectedChat,
      leadInfo: { ...selectedChat.leadInfo, followUpDate: label }
    });
  };

  const handleTemperatureChange = useCallback((newTemp: Temperature) => {
    if (!selectedChat) return;
    manualOverrideRef.current.set(selectedChat.id, Date.now());
    const updatedLeadInfo = { ...selectedChat.leadInfo!, temperature: newTemp };
    setSelectedChat({ ...selectedChat, leadInfo: updatedLeadInfo });
    setChats(prev => prev.map(c =>
      c.id === selectedChat.id ? { ...c, leadInfo: updatedLeadInfo } : c
    ));
    setShowTempDropdown(false);
    marketingService.upsertCliente({ remote_jid: selectedChat.id, temperatura: newTemp })
      .catch(err => console.error("[Temp] Erro ao salvar temperatura:", err));
  }, [selectedChat]);

  const triggerTemperatureClassification = useCallback(async (remoteJid: string) => {
    const OVERRIDE_TTL = 10 * 60 * 1000;
    const lastOverride = manualOverrideRef.current.get(remoteJid);
    if (lastOverride && Date.now() - lastOverride < OVERRIDE_TTL) return;

    try {
      setIsClassifyingTemp(true);
      const dbMessages = await marketingService.getMessagesByJid(remoteJid, 15);
      if (dbMessages.length < 3) return;

      const newTemp = await classifyTemperature(
        dbMessages.map(m => ({ sender: m.sender as "me" | "contact", text: m.texto || "" }))
      );

      await marketingService.upsertCliente({ remote_jid: remoteJid, temperatura: newTemp });

      setChats(prev => prev.map(c =>
        c.id === remoteJid ? { ...c, leadInfo: { ...c.leadInfo!, temperature: newTemp as Temperature } } : c
      ));
      setSelectedChat(cur => {
        if (!cur || cur.id !== remoteJid) return cur;
        return { ...cur, leadInfo: { ...cur.leadInfo!, temperature: newTemp as Temperature } };
      });
    } catch (err) {
      console.error("[Temp] Falha na classificação automática:", err);
    } finally {
      setIsClassifyingTemp(false);
    }
  }, []);

  const triggerTempClassifyRef = useRef(triggerTemperatureClassification);
  useEffect(() => { triggerTempClassifyRef.current = triggerTemperatureClassification; }, [triggerTemperatureClassification]);

  const handleDeleteSale = async () => {
    if (!selectedChat) return;
    try {
      await marketingService.deleteSale(selectedChat.id);
      const updatedLeadInfo = { ...selectedChat.leadInfo!, saleValue: undefined };
      setSelectedChat({ ...selectedChat, leadInfo: updatedLeadInfo });
      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, leadInfo: updatedLeadInfo } : c));
      setShowSaleModal(false);
      setSaleValue("");
    } catch (error) {
      console.error("Erro ao remover venda:", error);
    }
  };

  const handleConfirmSale = async () => {
    if (!selectedChat || !saleValue) return;
    
    try {
      const val = parseFloat(saleValue.replace(/\./g, '').replace(',', '.'));
      if (isNaN(val)) return;

      await marketingService.registerSale(selectedChat.id, val);

      const formatted = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Atualiza o valor fixado no chat
      const updatedLeadInfo = { ...selectedChat.leadInfo!, saleValue: formatted };
      setSelectedChat({ ...selectedChat, leadInfo: updatedLeadInfo });
      setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, leadInfo: updatedLeadInfo } : c));

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
               <h3 className="font-black text-sm uppercase tracking-tighter">
                 {selectedChat?.leadInfo?.saleValue ? "Editar Venda" : "Registrar Venda"}
               </h3>
               <button onClick={() => { setShowSaleModal(false); setSaleValue(""); }}><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-muted-foreground uppercase">Valor da Venda</p>
                 <input
                   type="text"
                   inputMode="numeric"
                   placeholder="R$ 0,00"
                   value={saleValue ? `R$ ${saleValue}` : ""}
                   onChange={(e) => {
                     const digits = e.target.value.replace(/\D/g, '');
                     if (!digits) { setSaleValue(""); return; }
                     const cents = parseInt(digits, 10);
                     setSaleValue((cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                   }}
                   className="w-full p-4 bg-secondary/50 border border-border rounded-2xl text-lg font-black text-primary outline-none focus:border-primary/50 transition-colors"
                 />
               </div>
               <button
                 onClick={handleConfirmSale}
                 className="w-full p-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
               >
                 {selectedChat?.leadInfo?.saleValue ? "Atualizar Venda" : "Confirmar Venda"}
               </button>
               {selectedChat?.leadInfo?.saleValue && (
                 <button
                   onClick={handleDeleteSale}
                   className="w-full p-4 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                 >
                   Excluir Venda
                 </button>
               )}
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
            <div className="flex flex-col gap-1">
              <h2 className="font-black text-base tracking-tighter uppercase leading-none">
                {viewMode === "active" ? "Mensagens" : "Arquivados"}
              </h2>
              {viewMode === "active" && (
                <div className="flex items-center gap-1 group relative">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Tempo médio:</span>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider",
                    avgResponseTime === null ? "text-muted-foreground" :
                    avgResponseTime < 3 ? "text-emerald-500" :
                    avgResponseTime < 5 ? "text-amber-500" : "text-rose-500"
                  )}>
                    {avgResponseTime === null ? "—" :
                     avgResponseTime < 1 ? "< 1 min" :
                     avgResponseTime < 60 ? `${Math.round(avgResponseTime)} min` :
                     `${Math.floor(avgResponseTime / 60)}h ${Math.round(avgResponseTime % 60)}min`}
                  </span>
                  {/* Ícone de dica */}
                  <button className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-[8px] font-black leading-none hover:bg-primary/20 hover:text-primary transition-colors shrink-0">
                    !
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl p-3 shadow-xl z-50 hidden group-hover:flex flex-col gap-1.5 pointer-events-none">
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground mb-1">Como melhorar</p>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-black text-[9px] shrink-0">●</span>
                      <span className="text-[9px] text-muted-foreground leading-relaxed">Ative notificações no navegador para não perder mensagens</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-black text-[9px] shrink-0">●</span>
                      <span className="text-[9px] text-muted-foreground leading-relaxed">Deixe a aba aberta durante o horário comercial</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-black text-[9px] shrink-0">●</span>
                      <span className="text-[9px] text-muted-foreground leading-relaxed">Meta: responder em menos de 3 minutos</span>
                    </div>
                    <div className="mt-1 pt-1.5 border-t border-border flex gap-2 text-[8px] font-black uppercase tracking-widest">
                      <span className="text-emerald-500">Verde &lt;3min</span>
                      <span className="text-amber-500">Âmbar &lt;5min</span>
                      <span className="text-rose-500">Vermelho ≥5min</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode(viewMode === "archived" ? "active" : "archived")}
                className="p-2 hover:bg-secondary rounded-xl transition-colors relative"
                title="Arquivados"
              >
                <Archive className={`w-4 h-4 transition-colors ${viewMode === "archived" ? "text-red-500" : "text-muted-foreground hover:text-primary"}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-2xl pl-11 pr-4 py-3 text-xs font-bold" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-2 opacity-50">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : filteredChats.map((chat) => (
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
                {chat.avatar ? (
                  <img 
                    src={chat.avatar} 
                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(chat.avatar!);
                    }}
                  />
                ) : (
                  <User className="w-6 h-6" />
                )}
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
                      ? "text-white font-semibold animate-pulse"
                      : selectedChat?.id === chat.id ? "text-primary/70" : "text-muted-foreground/80"
                  )}>
                    {presenceChats.has(chat.id)
                      ? (presenceChats.get(chat.id) === 'recording' ? 'Gravando áudio...' : 'Digitando...')
                      : (
                        <span className="flex items-center gap-1 min-w-0">
                          {chat.lastMessageSender === "me" && (() => {
                            const s = chat.lastMessageStatus;
                            return s === "read"
                              ? <CheckCheck className="w-3 h-3 shrink-0" style={{ color: '#020817' }} />
                              : s === "delivered"
                                ? <CheckCheck className="w-3 h-3 shrink-0 text-muted-foreground" />
                                : <Check className="w-3 h-3 shrink-0 text-muted-foreground" />;
                          })()}
                          {chat.lastMessageType === "image" && <Camera className="w-3 h-3 shrink-0" />}
                          {chat.lastMessageType === "video" && <Video className="w-3 h-3 shrink-0" />}
                          {chat.lastMessageType === "audio" && <Mic className="w-3 h-3 shrink-0" />}
                          {chat.lastMessageType === "document" && <Paperclip className="w-3 h-3 shrink-0" />}
                          {chat.lastMessageType === "sticker" && <Smile className="w-3 h-3 shrink-0" />}
                          <span className="truncate">
                            {chat.lastMessageType === "image" ? "Foto"
                              : chat.lastMessageType === "video" ? "Vídeo"
                              : chat.lastMessageType === "audio" ? "Áudio"
                              : chat.lastMessageType === "document" ? "Documento"
                              : chat.lastMessageType === "sticker" ? "Figurinha"
                              : chat.lastMessage}
                          </span>
                        </span>
                      )
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
                   {selectedChat.avatar ? (
                     <img 
                      src={selectedChat.avatar} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" 
                      onClick={() => setSelectedImage(selectedChat.avatar!)}
                    />
                   ) : (
                     <User className="w-5 h-5" />
                   )}
                </div>
                <div>
                  <h4 className="font-bold text-base tracking-tight font-inter">
                    {selectedChat.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <div className="flex items-center gap-2">
                    {presenceChats.has(selectedChat.id)
                      ? <p className="text-[10px] text-white font-bold tracking-widest animate-pulse">
                          {presenceChats.get(selectedChat.id) === 'recording' ? 'Gravando áudio...' : 'Digitando...'}
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
                    className={cn("h-9 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all", getTempColor(selectedChat.leadInfo?.temperature))}
                  >
                    {isClassifyingTemp
                      ? <Sparkles className="w-4 h-4 pointer-events-none animate-pulse" />
                      : <Flame className="w-4 h-4 pointer-events-none" />
                    }
                    <span className="text-[10px] font-black uppercase pointer-events-none">{selectedChat.leadInfo?.temperature || "Frio"}</span>
                    <ChevronDown className="w-3 h-3 pointer-events-none" />
                  </button>
                  {showTempDropdown && (
                    <div
                      className="absolute top-12 right-0 w-32 bg-card border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden"
                    >
                      {(["Quente", "Morno", "Frio"] as Temperature[]).map(t => (
                        <button key={t} onClick={() => handleTemperatureChange(t)} className="w-full p-3 text-[10px] font-black uppercase hover:bg-secondary text-left">{t}</button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedChat.leadInfo?.saleValue && (
                  <button
                    onClick={() => { setSaleValue(selectedChat.leadInfo!.saleValue!); setShowSaleModal(true); }}
                    className="flex items-center justify-center gap-1.5 h-9 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                    title="Venda registrada — clique para editar"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-black">R$ {selectedChat.leadInfo.saleValue}</span>
                  </button>
                )}
                <button onClick={()=>setShowFollowUpModal(true)} className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"><Bell className="w-4 h-4"/></button>
                <button onClick={()=>setShowSaleModal(true)} className={cn("p-2.5 hover:bg-secondary rounded-xl transition-colors", selectedChat.leadInfo?.saleValue ? "text-emerald-500" : "text-muted-foreground")}><DollarSign className="w-4 h-4"/></button>
                
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

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex-1 min-h-0 flex flex-col bg-[url('https://w0.peakpx.com/wallpaper/580/650/HD-wallpaper-whatsapp-background-dark-mode-pattern-whatsapp-dark-mode-thumbnail.jpg')] bg-repeat relative"
            >
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary m-4 rounded-3xl animate-in fade-in duration-200">
                  <div className="bg-card p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                       <Paperclip className="w-8 h-8 text-primary animate-bounce" />
                    </div>
                    <p className="text-xl font-black uppercase tracking-tighter">Solte para enviar</p>
                  </div>
                </div>
              )}
              {loadingMessages ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Carregando...</span>
                </div>
              ) : (
                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => {
                    const isVisualMedia = msg.tipo === "image" || msg.tipo === "video" || msg.tipo === "sticker";
                    const isDocumentMsg = msg.tipo === "document";
                    const isSticker = msg.tipo === "sticker";
                    return (
                    <div key={msg.id} className={cn("flex flex-col", msg.sender === "me" ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-2xl shadow-sm relative flex flex-col group transition-all", 
                        isSticker
                          ? "bg-transparent shadow-none border-none"
                          : msg.sender === "me" ? "bg-primary text-white rounded-tr-none" : "bg-card border border-border text-foreground rounded-tl-none",
                        isDocumentMsg ? "p-0 overflow-hidden" : isVisualMedia ? "p-1" : "px-4 py-2"
                      )}>
                        
                        {/* Mídia: Imagem ou Figurinha */}
                        {(msg.tipo === "image" || msg.tipo === "sticker") && msg.mediaUrl && (
                          <div className="relative group/img">
                            <img 
                              src={msg.mediaUrl} 
                              alt={isSticker ? "Figurinha" : "Imagem Recebida"} 
                              onClick={() => !isSticker && setSelectedImage(msg.mediaUrl!)}
                              className={cn(
                                isSticker ? "w-40 sm:w-48 h-auto object-contain" : "w-72 max-w-full object-cover cursor-pointer hover:opacity-95 transition-all duration-300",
                                msg.text && !["Mídia", "📷 Imagem", "🖼️ Figurinha"].includes(msg.text) ? "rounded-t-xl rounded-b-sm" : "rounded-xl",
                                (msg.sender === "me" && !isSticker) ? "rounded-tr-none" : (!isSticker ? "rounded-tl-none" : "")
                              )} 
                            />
                          </div>
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
                          <div className={cn("p-2 relative group/audio", isVisualMedia ? "px-3 py-2" : "")}>
                            {/* Botão de Transcrição Minimalista */}
                            {!msg.transcription && !msg.isTranscribing && (
                              <button 
                                onClick={() => handleTranscribe(msg)}
                                title="Transcrever com AI"
                                className={cn(
                                  "absolute -top-1 -right-1 p-1.5 rounded-lg opacity-0 group-hover/audio:opacity-100 transition-all z-20 shadow-lg border border-white/10",
                                  msg.sender === "me" ? "bg-white/10 text-white hover:bg-white/20" : "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {msg.isTranscribing && (
                              <div className="absolute -top-1 -right-1 p-1.5 rounded-lg bg-primary/20 text-primary animate-pulse z-20">
                                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              </div>
                            )}

                            <CustomAudioPlayer 
                              src={msg.mediaUrl} 
                              isMe={msg.sender === "me"} 
                              avatar={msg.sender === "me" ? myAvatar : selectedChat?.avatar} 
                              msgTime={msg.time}
                              msgStatus={msg.status}
                            />
                            
                            <div className="mt-1 flex flex-col gap-2">
                                {msg.transcription && (
                                  <div className={cn(
                                    "p-3 rounded-xl text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300 relative overflow-hidden",
                                    msg.sender === "me" ? "bg-black/20 text-white/90" : "bg-secondary/50 text-foreground"
                                  )}>
                                    <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                      <Sparkles className="w-3 h-3 text-primary" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Transcrição AI</span>
                                    </div>
                                    <p className="italic relative z-10">"{msg.transcription}"</p>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                      <Sparkles className="w-12 h-12 rotate-12" />
                                    </div>
                                  </div>
                                )}
                              </div>
                          </div>
                        )}

                        {/* Mídia: Documento */}
                        {msg.tipo === "document" && (
                          <div className="flex flex-col gap-0 min-w-[280px] max-w-[320px] rounded-2xl overflow-hidden shadow-lg group/doc">
                            {/* Preview Area (Simulado) */}
                            <div className={cn(
                              "h-32 flex flex-col items-center justify-center relative overflow-hidden",
                              msg.sender === "me" ? "bg-white/10" : "bg-card border-b border-border/10"
                            )}>
                               <div className="w-20 h-24 bg-white rounded shadow-md p-3 flex flex-col gap-1.5 transform rotate-2 group-hover/doc:rotate-0 transition-transform duration-500">
                                  <div className="w-full h-1 bg-slate-200 rounded-full" />
                                  <div className="w-3/4 h-1 bg-slate-100 rounded-full" />
                                  <div className="w-full h-1 bg-slate-200 rounded-full" />
                                  <div className="w-1/2 h-1 bg-slate-100 rounded-full" />
                                  <div className="w-full h-1 bg-slate-200 rounded-full mt-2" />
                                  <div className="w-full h-6 bg-slate-50 rounded" />
                               </div>
                               <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                            </div>

                            {/* Metadata Bar */}
                            <div className={cn(
                              "flex items-center gap-3 px-4 py-4",
                              msg.sender === "me" ? "bg-black/40" : "bg-black/10"
                            )}>
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm",
                                getFileIconColor(msg.fileName || msg.text)
                              )}>
                                <div className="flex flex-col items-center">
                                  <FileText className="w-5 h-5" />
                                  <span className="text-[7px] font-black uppercase tracking-tighter leading-none mt-0.5">{getFileExt(msg.fileName || msg.text)}</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[13px] font-bold truncate leading-tight mb-0.5",
                                  msg.sender === "me" ? "text-white" : "text-foreground"
                                )}>{msg.text || msg.fileName || "Documento"}</p>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    msg.sender === "me" ? "text-white/70" : "text-muted-foreground"
                                  )}>
                                    {getFileExt(msg.fileName || msg.text)}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    msg.sender === "me" ? "text-white/70" : "text-muted-foreground"
                                  )}>
                                    740 KB
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 opacity-80">
                                <span className={cn(
                                  "text-[10px] font-bold",
                                  msg.sender === "me" ? "text-white/90" : "text-muted-foreground"
                                )}>{msg.time}</span>
                                {msg.sender === "me" && (
                                  msg.status === "read"
                                    ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#020817' }} />
                                    : msg.status === "delivered"
                                      ? <CheckCheck className="w-3.5 h-3.5 text-white" />
                                      : <Check className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                            </div>

                            {/* Actions Area */}
                            <div className={cn(
                              "grid grid-cols-2 border-t",
                              msg.sender === "me" ? "bg-white/5 border-white/10" : "bg-card/50 border-border/50"
                            )}>
                               <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "py-3 text-center text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors",
                                    msg.sender === "me" ? "text-white" : "text-primary"
                                  )}
                               >
                                  Abrir
                               </a>
                               <a
                                  href={msg.mediaUrl}
                                  download={msg.text}
                                  className={cn(
                                    "py-3 text-center text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors border-l",
                                    msg.sender === "me" ? "text-white/80 border-white/10" : "text-primary border-border/50"
                                  )}
                               >
                                  Salvar como...
                               </a>
                            </div>
                          </div>
                        )}

                        {/* Texto ou Fallback de Erro */}
                        {msg.text && !isDocumentMsg && (
                          (!msg.mediaUrl && ["Mídia", "🎵 Áudio", "📎 Mídia", "🖼️ Figurinha"].includes(msg.text))
                            ? <p className={cn("text-sm font-medium whitespace-pre-wrap text-red-400", isVisualMedia ? "px-2 pt-2" : "")}>{msg.text} (Indisponível)</p>
                            : (!["Mídia", "🎵 Áudio", "📎 Mídia", "📷 Imagem", "📹 Vídeo", "🖼️ Figurinha"].includes(msg.text))
                              ? <p className={cn("text-sm font-medium whitespace-pre-wrap", isVisualMedia ? "px-2 pt-1 pb-1" : "")}>{msg.text}</p>
                              : null
                        )}
                        
                        {/* Time & Status (hidden for audio/document as they have their own layout) */}
                        {msg.tipo !== "audio" && !isDocumentMsg && (
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
                              <span>
                                {msg.status === "read"
                                  ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#020817' }} />
                                  : msg.status === "delivered"
                                    ? <CheckCheck className="w-3.5 h-3.5 text-white" />
                                    : <Check className="w-3.5 h-3.5 text-white" />}
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

              <div className="p-4 border-t border-border bg-card/50 backdrop-blur-md relative">
                {/* Preview de Arquivo Pendente */}
                {pendingFile && (
                  <div className="absolute bottom-full left-0 right-0 p-4 bg-card/90 backdrop-blur-xl border-t border-border animate-in slide-in-from-bottom-4 duration-300 z-50">
                    <div className="max-w-5xl mx-auto flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-14 rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg",
                        getFileIconColor(pendingFile.name)
                      )}>
                        <FileText className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase mt-0.5">{getFileExt(pendingFile.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{pendingFile.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                          {(pendingFile.size / 1024).toFixed(1)} KB • Pronto para enviar
                        </p>
                      </div>
                      <button 
                        onClick={() => setPendingFile(null)}
                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Seletor de Produtos Integrado */}
                {showProductSelector && (
                  <div className="absolute bottom-full left-0 right-0 bg-card/95 backdrop-blur-2xl border-t border-border animate-in slide-in-from-bottom-4 duration-300 z-50 overflow-hidden shadow-2xl">
                    <div className="max-w-5xl mx-auto flex flex-col h-[400px]">
                      <div className="p-4 border-b border-border/50 flex items-center gap-4 bg-muted/20">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Pesquise o nome do produto (mín. 2 letras)..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all shadow-inner"
                          />
                        </div>
                        <button 
                          onClick={() => { setShowProductSelector(false); setProductSearch(""); setCartProducts([]); }}
                          className="p-3 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {/* Itens Selecionados (Carrinho) */}
                        {cartProducts.length > 0 && (
                          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between px-3 mb-2">
                              <h3 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <ShoppingBag className="w-3.5 h-3.5" /> Itens no Orçamento ({cartProducts.length})
                              </h3>
                              <button 
                                onClick={() => setCartProducts([])}
                                className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors"
                              >
                                Limpar Tudo
                              </button>
                            </div>
                            <div className="flex flex-col divide-y divide-border/30 bg-primary/5 rounded-2xl overflow-hidden border border-primary/10">
                              {cartProducts.map((p) => {
                                const [gradient] = getBrandStyle(p.marca || p.descricao);
                                const initials = getBrandInitials(p.marca || p.descricao);
                                return (
                                  <div
                                    key={`cart-${p.cod}`}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-background/40"
                                  >
                                    <div className={cn(
                                      "w-12 h-12 rounded-xl shrink-0 bg-gradient-to-br flex flex-col items-center justify-center shadow-sm relative overflow-hidden",
                                      gradient
                                    )}>
                                      <span className="text-white font-black text-xs leading-none">{initials}</span>
                                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white drop-shadow" />
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold leading-snug truncate text-primary">
                                        {p.descricao}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-black text-foreground">
                                          💵 R$ {(p.debito * (p.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center bg-background rounded-lg p-1 border border-border/50 shadow-sm">
                                      <button 
                                        onClick={() => handleUpdateQuantity(p.cod, -1)}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center text-xs font-black">{p.quantidade || 1}</span>
                                      <button 
                                        onClick={() => handleUpdateQuantity(p.cod, 1)}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      onClick={() => handleToggleCart(p)}
                                      className="p-2 text-muted-foreground hover:text-rose-500 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            
                            <div className="relative h-8 flex items-center justify-center mt-2">
                               <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                               <span className="relative bg-background px-4 text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">Resultados da Busca</span>
                            </div>
                          </div>
                        )}

                        {loadingProducts ? (
                          <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando produtos...</span>
                          </div>
                        ) : filteredProducts.length > 0 ? (
                          <div className="flex flex-col divide-y divide-border/30">
                            {filteredProducts.map((p) => {
                              const inCart = cartProducts.some(x => x.cod === p.cod);
                              const [gradient] = getBrandStyle(p.marca || p.descricao);
                              const initials = getBrandInitials(p.marca || p.descricao);
                              return (
                                <button
                                  key={p.cod}
                                  onClick={() => handleToggleCart(p)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all group",
                                    inCart ? "bg-primary/8" : "hover:bg-secondary/40"
                                  )}
                                >
                                  {/* Imagem / Placeholder da marca */}
                                  <div className={cn(
                                    "w-14 h-14 rounded-xl shrink-0 bg-gradient-to-br flex flex-col items-center justify-center shadow-sm relative overflow-hidden",
                                    gradient
                                  )}>
                                    <span className="text-white font-black text-base leading-none tracking-tight">{initials}</span>
                                    {p.marca && (
                                      <span className="text-white/60 text-[7px] font-bold uppercase tracking-wider mt-0.5 px-1 text-center leading-tight truncate w-full text-center">{p.marca}</span>
                                    )}
                                    {inCart && (
                                      <div className="absolute inset-0 bg-primary/30 backdrop-blur-[1px] flex items-center justify-center">
                                        <Check className="w-5 h-5 text-white drop-shadow" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Info do produto */}
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-[12px] font-bold leading-snug truncate transition-colors",
                                      inCart ? "text-primary" : "text-foreground group-hover:text-primary"
                                    )}>
                                      {p.descricao}
                                    </p>
                                    {p.marca && (
                                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{p.marca}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[11px] font-black text-foreground">
                                        💵 R$ {p.debito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-border/60">·</span>
                                      <span className="text-[11px] font-black text-primary">
                                        💳 R$ {p.credito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Botão +/✓ e Controle de Quantidade */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {inCart && (
                                      <div className="flex items-center bg-secondary/50 rounded-lg p-1 animate-in fade-in zoom-in-95 duration-200">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p.cod, -1); }}
                                          className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-md text-muted-foreground transition-colors"
                                        >
                                          -
                                        </button>
                                        <span className="w-8 text-center text-xs font-black">{cartProducts.find(x => x.cod === p.cod)?.quantidade || 1}</span>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p.cod, 1); }}
                                          className="w-6 h-6 flex items-center justify-center hover:bg-background rounded-md text-muted-foreground transition-colors"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                    
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleCart(p); }}
                                      className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                                        inCart
                                          ? "bg-primary border-primary text-white"
                                          : "border-border/50 text-muted-foreground hover:border-primary hover:text-primary"
                                      )}
                                    >
                                      {inCart
                                        ? <Check className="w-4 h-4" />
                                        : <span className="text-lg leading-none font-bold">+</span>
                                      }
                                    </button>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                             <Search className="w-16 h-16 mb-4" />
                             <p className="text-sm font-black uppercase tracking-tighter">Nenhum produto encontrado com "{productSearch}"</p>
                          </div>
                        )}
                      </div>

                      {/* Footer do carrinho */}
                      {cartProducts.length > 0 && (
                        <div className="border-t border-border bg-card/80 backdrop-blur-md px-4 py-3 flex items-center gap-4">
                          <div className="flex-1 flex items-center gap-6">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{cartProducts.length} {cartProducts.length === 1 ? 'produto' : 'produtos'} selecionados</span>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs font-bold text-foreground">
                                  Débito: <span className="text-primary">R$ {cartProducts.reduce((s, p) => s + (p.debito * (p.quantidade || 1)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-xs font-bold text-foreground">
                                  Crédito (3x de R$ {(cartProducts.reduce((s, p) => s + (p.credito * (p.quantidade || 1)), 0) / 3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} s/ juros): <span className="text-primary">R$ {cartProducts.reduce((s, p) => s + (p.credito * (p.quantidade || 1)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setCartProducts([])}
                            className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground hover:text-rose-500 transition-colors"
                          >
                            Limpar
                          </button>
                          <button
                            onClick={handleInsertQuote}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Montar Orçamento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 max-w-5xl mx-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.mp4,.mov"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSendDocument(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => setShowProductSelector(!showProductSelector)}
                    className={cn(
                      "p-2.5 rounded-xl transition-all relative",
                      showProductSelector ? "bg-primary text-white" : "hover:bg-secondary text-muted-foreground"
                    )}
                  >
                    <Package className="w-5 h-5"/>
                    {cartProducts.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                        {cartProducts.length}
                      </span>
                    )}
                  </button>
                  <button
                    className="p-2.5 hover:bg-secondary rounded-xl text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-5 h-5"/>
                  </button>
                  <input 
                    type="text" 
                    value={inputText} 
                    onChange={(e)=>setInputText(e.target.value)} 
                    onKeyDown={(e)=>e.key === "Enter" && (pendingFile ? confirmSendFile() : handleSendMessage())} 
                    onPaste={handlePaste}
                    placeholder={pendingFile ? "Adicione uma legenda..." : "Responda agora..."} 
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-all" 
                  />
                  <button 
                    onClick={pendingFile ? confirmSendFile : handleSendMessage} 
                    className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send className={cn("w-5 h-5", pendingFile && "animate-pulse")} />
                  </button>
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
      {/* Lightbox de Imagem */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-8 right-8 flex flex-col items-center gap-4 z-[10000]">
            <button 
              onClick={() => setSelectedImage(null)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all group"
              title="Fechar"
            >
              <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head><title>Imprimir Imagem</title></head>
                      <body style="margin:0;display:flex;justify-content:center;align-items:center;background:white;">
                        <img src="${selectedImage}" style="max-width:100%;height:auto;" onload="window.print();setTimeout(() => window.close(), 500);">
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all group"
              title="Imprimir Imagem"
            >
              <Printer className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
