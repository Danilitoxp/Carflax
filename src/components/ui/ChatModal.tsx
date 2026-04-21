import { useState, useEffect, useRef } from "react";
import { X, Send, Minus, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConversas, addConversa, type CrmConversa } from "@/lib/crm-service";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id?: string;
  name: string;
  role: string;
  avatar?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: string;
  empresa: string;
  title: string;
  userProfile?: UserProfile;
  sellerName?: string;
  sellerCode?: string;
  amICentralizer?: boolean;
}

export function ChatModal({ 
  isOpen, 
  onClose, 
  documento, 
  empresa, 
  title, 
  userProfile, 
  sellerName, 
  sellerCode,
  amICentralizer 
}: ChatModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [conversas, setConversas] = useState<CrmConversa[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [budgetOwner, setBudgetOwner] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [centralizer, setCentralizer] = useState<{ id: string; name: string; avatar: string } | null>(null);

  // 1. Efeito Principal de Inicialização e Realtime
  useEffect(() => {
    if (!isOpen || !documento) return;

    console.log("[Chat] Abrindo orçamento:", documento);

    // 1. Tentar resolver pelo Cache Global primeiro (instantâneo) e evitar skeleton
    const userCache = (window as any)._carflaxUserCache || {};
    let resolvedImmediately = false;

    if (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName !== userProfile?.name) {
      const lookup = sellerName.toUpperCase().trim();
      const match = Object.values(userCache).find((u: any) => 
        u.name?.toUpperCase() === lookup || lookup.includes(u.name?.toUpperCase())
      ) as any;
      
      if (match && match.id !== userProfile?.id) {
        setOwnerProfile({ name: match.name, avatar: match.avatar || "" });
        setBudgetOwner(match.id);
        resolvedImmediately = true;
        console.log("[Chat] Vendedor resolvido via cache:", match.name);
      }
    }

    if (!resolvedImmediately) {
      setHeaderLoading(true);
      setOwnerProfile(null);
      setBudgetOwner(null);
    }

    // Buscar quem é a outra parte da conversa (Reforço no banco)
    async function fetchOwner() {
      // Se sou Vendedor, busca o perfil do Centralizador
      if (!amICentralizer) {
        try {
          const { data: config } = await supabase.from("crm_config").select("value").eq("key", "centralizer_user_id").maybeSingle();
          if (config?.value) {
            const { data: user } = await supabase.from("usuarios").select("id, name, avatar").eq("id", config.value).maybeSingle();
            if (user) {
              setOwnerProfile({ name: user.name, avatar: user.avatar || "" });
              setCentralizer(user);
            }
          }
        } catch (e) {
          console.error("[Chat] Erro ao buscar centralizador:", e);
        } finally {
          setTimeout(() => setHeaderLoading(false), 100);
        }
        return;
      }

      // Se sou Centralizador, busca o dono do orçamento (vendedor)
      const docId = documento.replace("#", "").split("-")[0].trim();

      try {
        const { data: status } = await supabase.from("crm_status").select("vendedor_codigo, vendedor").eq("documento", docId).maybeSingle();
        
        const vCode = sellerCode || status?.vendedor_codigo;
        const vName = (status?.vendedor && status.vendedor.toUpperCase() !== "SISTEMA") ? status.vendedor : sellerName;

        if (vName && vName.toUpperCase() !== "SISTEMA" && vName !== userProfile?.name) {
          setOwnerProfile(prev => ({ name: vName, avatar: prev?.avatar || "" }));
        }

        if (vCode) {
          const user = Object.values(userCache).find((u: any) => u.operator_code === vCode) as any;
          if (user && user.id !== userProfile?.id) {
            setBudgetOwner(user.id);
            setOwnerProfile({ name: user.name, avatar: user.avatar || "" });
          } else {
            const { data: dbUser } = await supabase.from("usuarios").select("id, name, avatar").eq("operator_code", vCode).maybeSingle();
            if (dbUser && dbUser.id !== userProfile?.id) {
              setBudgetOwner(dbUser.id);
              setOwnerProfile({ name: dbUser.name, avatar: dbUser.avatar || "" });
            }
          }
        }
      } catch (e) {
        console.error("[Chat] Erro fetchOwner:", e);
      } finally {
        setTimeout(() => setHeaderLoading(false), 200);
      }
    }

    fetchOwner();

    // Carregar mensagens iniciais
    setLoading(true);
    getConversas(documento).then(async (data) => {
      setConversas(data);
      setLoading(false);

      // Marcar como lidas
      const unreadForMe = data.filter(m => !m.lida && (m.destino === userProfile?.id || (amICentralizer && m.destino === "todos")));
      if (unreadForMe.length > 0) {
        const ids = unreadForMe.map(m => m.id).filter(Boolean);
        await supabase.from("crm_conversas").update({ lida: true }).in("id", ids);
        setConversas(prev => prev.map(m => ids.includes(m.id) ? { ...m, lida: true } : m));
      }
    });

    // Realtime para este documento
    const channel = supabase
      .channel(`chat_${documento}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_conversas', filter: `documento=eq.${documento}` }, 
        (payload) => {
          const newMsg = payload.new as CrmConversa;
          setConversas((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            // Se for resposta de um envio nosso (tmp), remove o tmp
            return [...prev, newMsg];
          });
          
          if (newMsg.destino === userProfile?.id || (amICentralizer && newMsg.destino === "todos")) {
            supabase.from("crm_conversas").update({ lida: true }).eq("id", newMsg.id).then();
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, documento, userProfile?.id]);

  // 2. Efeito de Resolução Dinâmica de Perfil baseada em Mensagens e Cache Global
  useEffect(() => {
    if (!isOpen) return;

    // Tentar resolver pelo Cache Global primeiro (instantâneo)
    const userCache = (window as any)._carflaxUserCache || {};
    
    const resolveFromCache = (name: string) => {
      const lookup = name.toUpperCase().trim();
      const match = Object.values(userCache).find((u: any) => 
        u.name?.toUpperCase() === lookup || lookup.includes(u.name?.toUpperCase())
      ) as any;
      if (match && match.id !== userProfile?.id) {
        setOwnerProfile({ name: match.name, avatar: match.avatar || "" });
        setBudgetOwner(match.id);
        return true;
      }
      return false;
    };

    // Tenta resolver pelo nome que veio via props (se não for Sistema)
    if (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName !== userProfile?.name) {
      if (resolveFromCache(sellerName)) return;
    }

    if (conversas.length > 0 && (!ownerProfile || ownerProfile.name === userProfile?.name)) {
      // Tentar encontrar um humano que não sou eu nas mensagens
      const otherMessage = [...conversas].reverse().find(m => m.enviado_por && m.enviado_por !== userProfile?.id);
      
      if (otherMessage?.enviado_por) {
        const user = userCache[otherMessage.enviado_por];
        if (user) {
          setOwnerProfile({ name: user.name, avatar: user.avatar || "" });
          if (amICentralizer) setBudgetOwner(user.id);
          else setCentralizer(user);
        } else {
          supabase.from("usuarios").select("id, name, avatar").eq("id", otherMessage.enviado_por).maybeSingle().then(({ data: u }) => {
            if (u && u.id !== userProfile?.id) {
              setOwnerProfile({ name: u.name, avatar: u.avatar || "" });
              if (amICentralizer) setBudgetOwner(u.id);
            }
          });
        }
      } else {
        // Se só tem mensagem de Sistema, tenta "ler" o nome do vendedor dentro do texto
        const systemMsg = conversas.find(m => (m.enviado_por_nome?.toUpperCase() === "SISTEMA") && m.obs.includes("Vendedor:"));
        if (systemMsg) {
          const match = systemMsg.obs.match(/Vendedor:.*?\*?\s*(.*?)(?:\n|$)/i);
          const extractedName = match ? match[1].replace(/\*/g, "").trim() : null;
          
          if (extractedName && extractedName.toUpperCase() !== userProfile?.name?.toUpperCase()) {
            if (!resolveFromCache(extractedName)) {
              setOwnerProfile(prev => ({ name: extractedName, avatar: prev?.avatar || "" }));
              // Fallback para banco se não estiver no cache
              supabase.from("usuarios").select("id, name, avatar").ilike("name", `%${extractedName}%`).maybeSingle().then(({ data: u }) => {
                if (u && u.id !== userProfile?.id) {
                  setOwnerProfile({ name: u.name, avatar: u.avatar || "" });
                  setBudgetOwner(u.id);
                }
              });
            }
          }
        }
      }
    }
  }, [conversas, userProfile?.id, ownerProfile, amICentralizer, sellerName, isOpen]);

  // Scroll automático
  useEffect(() => {
    if (!isMinimized && conversas.length > 0) {
      const scroll = () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      };
      
      // Tenta rolar imediatamente e novamente após um pequeno delay para garantir
      scroll();
      const timer = setTimeout(scroll, 100);
      return () => clearTimeout(timer);
    }
  }, [conversas, isMinimized, loading, headerLoading]);

  if (!isOpen) return null;

  // Lógica de exibição no Header: Prioridade TOTAL ao humano (Vendedor/Dono do Orçamento)
  const displayUser = amICentralizer 
    ? { 
        name: (ownerProfile?.name && ownerProfile.name.toUpperCase() !== "SISTEMA" ? ownerProfile.name : null) || 
              (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName !== userProfile?.name ? sellerName : null) || 
              title, 
        avatar: ownerProfile?.avatar || "" 
      }
    : { 
        name: (ownerProfile?.name && ownerProfile.name.toUpperCase() !== "SISTEMA" ? ownerProfile.name : null) || 
              (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName !== userProfile?.name ? sellerName : null) || 
              "Centralizador Carflax", 
        avatar: ownerProfile?.avatar || "" 
      };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);

    let destinoId = amICentralizer ? (budgetOwner || "todos") : (centralizer?.id || "todos");

    if (amICentralizer && (destinoId === "todos" || !destinoId) && sellerCode) {
      const { data: user } = await supabase.from("usuarios").select("id").eq("operator_code", sellerCode).maybeSingle();
      if (user) {
        destinoId = user.id;
        setBudgetOwner(user.id);
      }
    }

    const nova: Omit<CrmConversa, "id"> = {
      documento,
      empresa,
      obs: text,
      enviado_por: userProfile?.id,
      enviado_por_nome: userProfile?.name || "Você",
      lida: false,
      fechada: false,
      destino: destinoId || "todos",
      timestamp: new Date().toISOString(),
    };

    setConversas((prev) => [...prev, { ...nova, id: `tmp-${Date.now()}` }]);
    setMessageText("");

    try {
      await addConversa({
        ...nova,
        enviado_por: userProfile?.id || null,
        enviado_por_nome: userProfile?.name || "Você"
      });
      const updated = await getConversas(documento);
      setConversas(updated);
    } catch (err) {
      console.error("[Chat] Erro no envio:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const isMe = (msg: CrmConversa) => {
    if (!userProfile) return false;
    if (msg.enviado_por === userProfile.id) return true;
    if (msg.enviado_por_nome && userProfile.name) {
      const nameA = msg.enviado_por_nome.toUpperCase().trim();
      const nameB = userProfile.name.toUpperCase().trim();
      if (nameA === nameB && nameA !== "SISTEMA") return true;
    }
    return false;
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(':');
      let coloredLine: React.ReactNode = line;
      if (parts.length > 1) {
        coloredLine = (
          <>
            <span className="text-amber-400 font-black">{parts[0]}:</span>
            <span className="text-foreground"> {parts.slice(1).join(':')}</span>
          </>
        );
      }
      const finalLine = String(line).split(/(\*.*?\*)/g).map((segment, j) => {
        if (segment.startsWith('*') && segment.endsWith('*')) {
          return <span key={j} className="font-black text-foreground">{segment.slice(1, -1)}</span>;
        }
        return segment;
      });
      return <div key={i} className="mb-1">{parts.length > 1 ? coloredLine : finalLine}</div>;
    });
  };

  const ChatSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex flex-col space-y-1", i % 2 === 0 ? "items-end" : "items-start")}>
          <div className="h-2 w-16 bg-secondary/40 rounded-full mb-1" />
          <div className={cn("h-12 w-48 bg-secondary/20 rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 pointer-events-none">
      <div className={cn(
          "w-[340px] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-4",
          isMinimized ? "h-[56px]" : "h-[480px]"
        )}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30 rounded-t-2xl shrink-0 cursor-pointer"
          onClick={() => isMinimized && setIsMinimized(false)}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black overflow-hidden border border-blue-500/30",
              (headerLoading) ? "bg-secondary/40 animate-pulse" : "bg-blue-500/20 text-blue-500"
            )}>
              {displayUser?.avatar && !headerLoading ? (
                <img src={displayUser.avatar} alt={displayUser.name} className="w-full h-full object-cover" />
              ) : displayUser?.name && !headerLoading ? (
                <span>{displayUser.name.split(" ").filter(Boolean).map(n => n[0]).join("")}</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              {headerLoading ? (
                <div className="h-2 w-24 bg-secondary/40 rounded-full animate-pulse" />
              ) : (
                <span className="text-[10px] font-black text-foreground tracking-tight leading-none uppercase">
                  {displayUser.name}
                </span>
              )}
              {documento && !headerLoading ? (
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter opacity-80">
                  #{documento.replace("#", "")}
                </span>
              ) : (
                <div className="h-1.5 w-16 bg-secondary/20 rounded-full animate-pulse" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
              {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {(loading || headerLoading) && <ChatSkeleton />}
              {!(loading || headerLoading) && conversas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-10 h-10 bg-secondary/30 rounded-full flex items-center justify-center border border-border">
                    <Send className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Nenhuma conversa ainda</p>
                </div>
              )}
              {!(loading || headerLoading) && conversas.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col space-y-1", isMe(msg) ? "items-end" : "items-start")}>
                  {!isMe(msg) && <span className="text-[8px] font-black text-muted-foreground uppercase ml-1 tracking-widest">{msg.enviado_por_nome}</span>}
                  <div className={cn("p-3.5 rounded-2xl max-w-[90%] text-[11px] font-medium shadow-xl", isMe(msg) ? "bg-blue-600 text-white rounded-tr-none" : "bg-secondary/80 text-foreground/90 rounded-tl-none border border-border/40")}>
                    {renderFormattedText(msg.obs)}
                  </div>
                  <div className={cn("flex items-center gap-2", isMe(msg) ? "mr-1" : "ml-1")}>
                    <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">{formatTime(msg.timestamp)}</span>
                    {isMe(msg) && <span className={cn("text-[8px] font-black uppercase", msg.lida ? "text-emerald-500" : "text-muted-foreground")}>{msg.lida ? "✓ Lida" : "✓✓"}</span>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-border bg-secondary/10">
              <div className="relative flex items-center gap-2">
                <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Adicionar observação..." className="w-full bg-secondary/50 border border-border rounded-xl pl-4 pr-10 py-3 text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground/30 uppercase" />
                <button type="submit" disabled={sending || !messageText.trim()} className="absolute right-2 p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all active:scale-90 disabled:opacity-40">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
