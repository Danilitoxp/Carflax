import { useState, useMemo, useCallback, useRef } from "react";
import { MessageSquare, X, Search } from "lucide-react";
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
  phone?: string;
  whatsapp?: string;
}

interface ChatCenterProps {
  activeChats: ActiveChat[];
  onCloseChat: (doc: string) => void;
  userProfile?: UserProfileLite;
  openChatDocs: string[];
  onToggleChatDoc: (doc: string) => void;
  onCloseChatDoc: (doc: string) => void;
  onUpdateChat?: (doc: string, data: Partial<ActiveChat>) => void;
  forcedChatDoc?: string | null;
  onForcedChatResolved?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const PAGE_SIZE = 20;

export function ChatCenter({
  activeChats,
  onCloseChat,
  userProfile,
  openChatDocs,
  onToggleChatDoc,
  onCloseChatDoc,
  onUpdateChat,
  forcedChatDoc,
  onForcedChatResolved,
  isOpen = false,
  onClose,
}: ChatCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  const totalUnread = useMemo(() => {
    return activeChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [activeChats]);

  const filteredChats = useMemo(() => {
    let chats = [...activeChats];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      chats = chats.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.doc.toLowerCase().includes(term) ||
        c.sellerName?.toLowerCase().includes(term)
      );
    }

    return chats.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (b.unreadCount || 0) - (a.unreadCount || 0);
    });
  }, [activeChats, searchTerm]);

  const visibleChats = useMemo(() => filteredChats.slice(0, visibleCount), [filteredChats, visibleCount]);
  const hasMore = visibleCount < filteredChats.length;

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  const openChatsData = useMemo(() => {
    return openChatDocs
      .map(doc => activeChats.find(c => c.doc === doc))
      .filter(Boolean) as ActiveChat[];
  }, [activeChats, openChatDocs]);

  const handleUpdateLastMessage = useCallback((doc: string) => (msg: string, time: string) => {
    onUpdateChat?.(doc, { lastMessage: msg, lastMessageTime: time });
  }, [onUpdateChat]);

  const formatLastMessage = (text: string | undefined) => {
    if (!text) return "Nenhuma mensagem...";

    if (text.toUpperCase().includes("STATUS:")) {
      const lines = text.split('\n');
      const statusLine = lines.find(l => l.toUpperCase().includes("STATUS:"));
      if (statusLine) {
        const afterStatus = statusLine.split(/STATUS:/i)[1];
        if (afterStatus) {
          const cleaned = afterStatus.replace(/[^\w\sÀ-Ú]/g, "").trim().toUpperCase();
          if (cleaned) return cleaned;
        }
      }
    }

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

    if (text.includes("ATUALIZAÇÃO DE STATUS")) return "ATUALIZAÇÃO";

    return text.replace(/[-=_]{3,}/g, "").trim();
  };

  if (!isOpen && openChatDocs.length === 0) return null;

  return (
    <>
      {/* Chat modals — stack from right, shift when list panel is open (full screen on mobile) */}
      {openChatsData.length > 0 && (
        <div
          className="fixed z-[9999] max-sm:!inset-0 sm:bottom-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-end gap-4 pointer-events-none transition-all duration-300 w-full sm:w-auto"
          style={{ right: isOpen ? "calc(350px + 24px + 16px)" : "24px" }}
        >
          {openChatsData.map((chat) => (
            <div key={chat.doc} className="pointer-events-auto w-full h-full sm:w-auto sm:h-auto">
              <ChatModal
                isOpen={true}
                onClose={() => {
                  if (forcedChatDoc === chat.doc) return;
                  onCloseChatDoc(chat.doc);
                }}
                documento={chat.doc}
                empresa="001"
                title={chat.title}
                userProfile={userProfile}
                sellerName={chat.sellerName}
                sellerCode={chat.sellerCode}
                itemsInitial={chat.items}
                isMinimized={false}
                onUpdateLastMessage={handleUpdateLastMessage(chat.doc)}
                isForced={forcedChatDoc === chat.doc}
                onForcedResolved={onForcedChatResolved}
              />
            </div>
          ))}
        </div>
      )}

      {/* Chat list panel — separate from modals (full screen on mobile) */}
      {isOpen && (
        <div className="fixed z-[9999] max-sm:!inset-0 sm:bottom-6 sm:right-6 bg-card/95 backdrop-blur-xl border border-border shadow-2xl flex flex-col pointer-events-auto w-full h-[100dvh] sm:w-[350px] sm:h-[520px] rounded-none sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:animate-none">

        {/* Header with notch padding on mobile */}
        <div className="flex items-center justify-between p-4 pt-[calc(1.2rem+env(safe-area-inset-top))] sm:pt-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4.5 h-4.5 text-blue-500" />
            <span className="text-[11px] font-black text-foreground uppercase tracking-widest">Conversas</span>
            {totalUnread > 0 && (
              <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg shadow-blue-500/20">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Chat list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide"
          onScroll={handleScroll}
        >
          {visibleChats.map((chat) => {
            const userCache = (window as unknown as { _carflaxUserCache: Record<string, UserProfileLite & { operator_code?: string }> })._carflaxUserCache || {};
            const myId = userProfile?.id;

            let partnerName = "";
            let partnerAvatar = "";
            const cacheValues = Object.values(userCache);

            if (chat.sellerCode && chat.sellerCode !== myId) {
              let cached = userCache[chat.sellerCode];
              if (!cached) {
                const codeClean = chat.sellerCode.replace(/^0+/, "");
                cached = cacheValues.find(u => u.operator_code && u.operator_code.replace(/^0+/, "") === codeClean) as typeof cached;
              }
              if (cached) {
                partnerName = cached.name;
                partnerAvatar = cached.avatar || "";
              }
            }

            if (!partnerName && chat.sellerName) {
              const sellerUpper = chat.sellerName.toUpperCase().trim();
              const myNameUpper = userProfile?.name?.toUpperCase().trim();
              const isMyName = myNameUpper && (sellerUpper === myNameUpper || sellerUpper.includes(myNameUpper) || myNameUpper.includes(sellerUpper));
              if (!isMyName) {
                partnerName = chat.sellerName;
                const match = cacheValues.find(u => {
                  const n = u.name?.toUpperCase().trim();
                  return n && (n === sellerUpper || sellerUpper.includes(n) || n.includes(sellerUpper));
                });
                if (match) {
                  if (!partnerName) partnerName = match.name;
                  partnerAvatar = match.avatar || "";
                }
              }
            }

            if (!partnerName) {
              partnerName = chat.title || `#${chat.doc.replace("#", "")}`;
            }

            const avatarUrl = partnerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerName || chat.doc}`;

            return (
              <div
                key={chat.doc}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer relative",
                  openChatDocs.includes(chat.doc)
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "hover:bg-secondary/80 border border-transparent"
                )}
                onClick={() => onToggleChatDoc(chat.doc)}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border shrink-0 overflow-hidden">
                  <img
                    src={avatarUrl}
                    className="w-full h-full object-cover"
                    alt={partnerName}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">
                        {partnerName}
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
                    {chat.lastMessageTime && (() => {
                      const d = new Date(chat.lastMessageTime);
                      const now = new Date();
                      const isToday = d.toDateString() === now.toDateString();
                      const yesterday = new Date(now);
                      yesterday.setDate(now.getDate() - 1);
                      const isYesterday = d.toDateString() === yesterday.toDateString();
                      const dateLabel = isToday ? "Hoje" : isYesterday ? "Ontem" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                      const timeLabel = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 shrink-0 text-right leading-tight flex flex-col items-end gap-0.5">
                          <span>{dateLabel}</span>
                          <span>{timeLabel}</span>
                        </span>
                      );
                    })()}
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
                ) : openChatDocs.includes(chat.doc) && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center py-3">
              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                Carregando mais...
              </span>
            </div>
          )}

          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
              <MessageSquare className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                Nenhuma conversa encontrada
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary/10 flex justify-center shrink-0">
          <button
            onClick={() => {
              activeChats.forEach(c => onCloseChat(c.doc));
            }}
            className="text-[9px] font-black text-muted-foreground hover:text-rose-500 uppercase tracking-widest transition-colors"
          >
            Limpar Todas as Conversas
          </button>
        </div>
      </div>
      )}
    </>
  );
}
