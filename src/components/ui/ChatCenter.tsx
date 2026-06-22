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
  forcedChatDoc?: string | null;
  onForcedChatResolved?: () => void;
}

const PAGE_SIZE = 20;

export function ChatCenter({
  activeChats,
  onCloseChat,
  userProfile,
  amICentralizer,
  openChatDoc,
  setOpenChatDoc,
  onUpdateChat,
  forcedChatDoc,
  onForcedChatResolved
}: ChatCenterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  const [posBottom, setPosBottom] = useState(24);
  const dragRef = useRef({ hasMoved: false });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const startY = e.clientY;
    const startBottom = posBottom;
    let moved = false;

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 4) moved = true;
      const maxBottom = window.innerHeight - (isExpanded ? 530 : 64);
      setPosBottom(Math.max(8, Math.min(startBottom - dy, maxBottom)));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (moved) {
        dragRef.current.hasMoved = true;
        setTimeout(() => { dragRef.current.hasMoved = false; }, 50);
      } else {
        dragRef.current.hasMoved = false;
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [posBottom, isExpanded]);

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

  return (
    <div
      className="fixed z-[9999] flex items-end gap-4 pointer-events-none"
      style={{ right: 24, bottom: `${posBottom}px` }}
    >
      {openChatDoc && activeChatData && (
        <div className="pointer-events-auto">
          <ChatModal
            isOpen={true}
            onClose={() => {
              if (forcedChatDoc === openChatDoc) return;
              if (openChatDoc) onCloseChat(openChatDoc);
            }}
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
            isForced={forcedChatDoc === openChatDoc}
            onForcedResolved={onForcedChatResolved}
          />
        </div>
      )}

      <div
        className={cn(
          "bg-card/95 backdrop-blur-xl border border-border shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 overflow-hidden",
          isExpanded
            ? "w-[350px] h-[520px] rounded-2xl"
            : "w-14 h-14 rounded-full bg-primary border-primary/20 items-center justify-center shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 text-primary-foreground"
        )}
        style={{ cursor: isExpanded ? undefined : "grab" }}
        onMouseDown={!isExpanded ? handleDragStart : undefined}
        onClick={() => {
          if (!isExpanded && !dragRef.current.hasMoved) {
            setIsExpanded(true);
          }
        }}
      >
        {!isExpanded ? (
          <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
            <MessageSquare className="w-5.5 h-5.5 text-white" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-card animate-pulse">
                {totalUnread}
              </span>
            )}
          </div>
        ) : (
          <>
            <div
              className="flex items-center p-3.5 cursor-grab active:cursor-grabbing hover:bg-secondary/50 border-b border-border/40 select-none transition-colors shrink-0"
              onMouseDown={handleDragStart}
              onClick={(e) => {
                if (!dragRef.current.hasMoved) {
                  e.stopPropagation();
                  setIsExpanded(false);
                }
              }}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <MessageSquare className="w-4.5 h-4.5 text-blue-500" />
                    {totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-[11px] font-black text-foreground uppercase tracking-widest">Conversas</span>
                  {totalUnread > 0 && (
                    <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg shadow-blue-500/20">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-300 rotate-90" />
              </div>
            </div>

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

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide"
              onScroll={handleScroll}
            >
              {visibleChats.map((chat) => {
                const userCache = (window as unknown as { _carflaxUserCache: Record<string, UserProfileLite & { operator_code?: string }> })._carflaxUserCache || {};
                const centralizerId = (window as unknown as Record<string, unknown>)._carflaxCentralizerId as string | undefined;
                const myId = userProfile?.id;

                let partnerName = "";
                let partnerAvatar = "";
                const cacheValues = Object.values(userCache);

                if (chat.sellerCode && chat.sellerCode !== myId && chat.sellerCode !== centralizerId) {
                  // Tenta pelo ID do Supabase
                  let cached = userCache[chat.sellerCode];
                  // Fallback: se o sellerCode é código ERP, busca pelo operator_code
                  if (!cached) {
                    const codeClean = chat.sellerCode.replace(/^0+/, "");
                    cached = cacheValues.find(u => u.operator_code && u.operator_code.replace(/^0+/, "") === codeClean) as typeof cached;
                  }
                  if (cached) {
                    partnerName = cached.name;
                    partnerAvatar = cached.avatar || "";
                  }
                }

                // Fallback pelo nome
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

                // Se sou vendedor, mostro o centralizador
                if (!partnerName && !amICentralizer && centralizerId) {
                  const centralizerUser = userCache[centralizerId];
                  if (centralizerUser) {
                    partnerName = centralizerUser.name;
                    partnerAvatar = centralizerUser.avatar || "";
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
                    ) : openChatDoc === chat.doc && (
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
