import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { MessageSquare, X, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatModal } from "./ChatModal";
import { type CrmItem } from "@/lib/api";

interface ActiveChat {
  id: number;
  doc: string;
  title: string;
  sellerName?: string;
  sellerCode?: string;
  items?: CrmItem[];
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface UserProfileLite {
  id?: string;
  name: string;
  role: string;
  avatar?: string;
}

interface ChatCenterProps {
  activeChats: ActiveChat[];
  onCloseChat: (doc: string) => void;
  userProfile?: UserProfileLite;
  amICentralizer: boolean;
  openChatDoc: string | null;
  setOpenChatDoc: (doc: string | null) => void;
  onUpdateChat?: (doc: string, data: Partial<ActiveChat>) => void;
}

export function ChatCenter({ 
  activeChats, 
  onCloseChat, 
  userProfile, 
  amICentralizer,
  openChatDoc,
  setOpenChatDoc,
  onUpdateChat
}: ChatCenterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const totalUnread = useMemo(() => {
    return activeChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [activeChats]);

  const filteredChats = useMemo(() => {
    let chats = [...activeChats];
    
    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      chats = chats.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.doc.toLowerCase().includes(term) ||
        c.sellerName?.toLowerCase().includes(term)
      );
    }

    // Ordenação: 1. Não lidas primeiro, 2. Mais recentes primeiro
    return chats.sort((a, b) => {
      if ((a.unreadCount || 0) > (b.unreadCount || 0)) return -1;
      if ((a.unreadCount || 0) < (b.unreadCount || 0)) return 1;
      
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [activeChats, searchTerm]);

  const activeChatData = useMemo(() => {
    return activeChats.find(c => c.doc === openChatDoc);
  }, [activeChats, openChatDoc]);

  const activeChatDocRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatDocRef.current = activeChatData?.doc || null;
  }, [activeChatData?.doc]);

  const handleUpdateLastMessage = useCallback((msg: string, time: string) => {
    if (activeChatDocRef.current) {
      onUpdateChat?.(activeChatDocRef.current, { lastMessage: msg, lastMessageTime: time });
    }
  }, [onUpdateChat]);

  const formatLastMessage = (text: string | undefined) => {
    if (!text) return "Nenhuma mensagem...";
    
    // Se for mensagem de status do sistema (estratégia por linha)
    if (text.toUpperCase().includes("STATUS:")) {
      const lines = text.split('\n');
      const statusLine = lines.find(l => l.toUpperCase().includes("STATUS:"));
      if (statusLine) {
        // Pega tudo que vem depois de "STATUS:"
        const afterStatus = statusLine.split(/STATUS:/i)[1];
        if (afterStatus) {
          // Remove emojis e símbolos, mantém letras e espaços
          const cleaned = afterStatus.replace(/[^\w\sÀ-Ú]/g, "").trim().toUpperCase();
          if (cleaned) return cleaned;
        }
      }
    }

    // Se for divergência/aviso
    if (text.toUpperCase().includes("DIVERGÊNCIA:")) {
      const lines = text.split('\n');
      const divLine = lines.find(l => l.toUpperCase().includes("DIVERGÊNCIA:"));
      if (divLine) {
        const afterDiv = divLine.split(/DIVERGÊNCIA:/i)[1];
        if (afterDiv) {
          return afterDiv.replace(/[^\w\sÀ-Ú]/g, "").trim().toUpperCase();
        }
      }
    }

    // Limpeza para mensagens de sistema que não casaram acima
    if (text.includes("ATUALIZAÇÃO DE STATUS")) {
      return "ATUALIZAÇÃO";
    }

    // Limpeza geral para outras mensagens (remove hífens repetidos e quebras)
    return text.replace(/[-=_]{3,}/g, "").trim();
  };

  if (activeChats.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-end gap-4 pointer-events-none">
      {/* 1. Chat Detail Area (Only shown if a chat is open and NOT minimized) */}
      {openChatDoc && activeChatData && (
        <div className="pointer-events-auto">
          <ChatModal
            isOpen={true}
            onClose={() => setOpenChatDoc(null)}
            documento={activeChatData.doc}
            empresa="001"
            title={activeChatData.title}
            userProfile={userProfile}
            sellerName={activeChatData.sellerName}
            sellerCode={activeChatData.sellerCode}
            itemsInitial={activeChatData.items}
            amICentralizer={amICentralizer}
            isMinimized={false}
            onUpdateLastMessage={handleUpdateLastMessage}
          />
        </div>
      )}

      {/* 2. Chat List / Launcher Area */}
      <div className={cn(
        "bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-500 overflow-hidden",
        isExpanded ? "w-[320px] h-[500px]" : "w-[64px] h-[64px]"
      )}>
        {/* Toggle / Header */}
        <div 
          className={cn(
            "flex items-center p-4 cursor-pointer transition-all duration-300 hover:bg-secondary/50 active:scale-95",
            !isExpanded && "justify-center h-full w-full"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                </div>
                <span className="text-xs font-black text-foreground uppercase tracking-widest">Conversas</span>
                {totalUnread > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg shadow-blue-500/20">
                    {totalUnread}
                  </span>
                )}
              </div>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-0")} />
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/40 transition-all animate-pulse" />
              <MessageSquare className="w-7 h-7 text-blue-600 relative z-10 drop-shadow-sm" />
              {totalUnread > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-card shadow-lg z-20">
                  {totalUnread}
                </span>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Search */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {filteredChats.map((chat) => {
                const userCache = (window as unknown as { _carflaxUserCache: Record<string, UserProfileLite> })._carflaxUserCache || {};
                const sellerName = chat.sellerName?.toUpperCase().trim();
                const cachedUser = Object.values(userCache).find((u) => 
                  u.name?.toUpperCase() === sellerName || (u.id && u.id === chat.sellerCode)
                );
                const avatarUrl = cachedUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.sellerName || chat.doc}`;

                return (
                  <div 
                    key={chat.doc}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer relative",
                      openChatDoc === chat.doc 
                        ? "bg-blue-500/10 border border-blue-500/20" 
                        : "hover:bg-secondary/80 border border-transparent"
                    )}
                    onClick={() => setOpenChatDoc(chat.doc)}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border shrink-0 overflow-hidden">
                      <img 
                        src={avatarUrl}
                        className="w-full h-full object-cover"
                        alt={chat.sellerName}
                      />
                    </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">
                          {chat.sellerName || "Vendedor"}
                        </p>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter opacity-80 shrink-0">
                          #{chat.doc.replace("#", "")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {chat.lastMessage?.toUpperCase().includes("STATUS:") && (
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            (() => {
                              const s = formatLastMessage(chat.lastMessage);
                              if (s.includes("ENVIADO")) return "bg-blue-500";
                              if (s.includes("FATURADO") || s.includes("APROVADO") || s.includes("PEDIDO")) return "bg-emerald-500";
                              if (s.includes("PERDIDO") || s.includes("DECLINADO") || s.includes("CANCELADO")) return "bg-rose-500";
                              if (s.includes("PENDENTE") || s.includes("AGUARDANDO")) return "bg-amber-500";
                              return "bg-blue-500";
                            })()
                          )} />
                        )}
                        <p className={cn(
                          "text-[10px] font-bold truncate leading-tight",
                          chat.lastMessage?.toUpperCase().includes("STATUS:") ? "text-blue-500/80" : "text-muted-foreground/60"
                        )}>
                          {formatLastMessage(chat.lastMessage)}
                        </p>
                      </div>
                      {chat.lastMessageTime && (
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 shrink-0">
                          {new Date(chat.lastMessageTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseChat(chat.doc);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {chat.unreadCount ? (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg shadow-blue-500/20 z-10">
                      {chat.unreadCount}
                    </div>
                  ) : openChatDoc === chat.doc && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
              );
            })}

              {filteredChats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                    Nenhuma conversa encontrada
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-border bg-secondary/10 flex justify-center">
              <button 
                onClick={() => {
                  activeChats.forEach(c => onCloseChat(c.doc));
                  setIsExpanded(false);
                }}
                className="text-[9px] font-black text-muted-foreground hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                Limpar Todas as Conversas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
