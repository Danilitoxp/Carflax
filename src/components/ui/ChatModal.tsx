import { useState, useEffect, useRef } from "react";
import { X, Send, Minus, Square, Loader2, Package, ShoppingBag, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConversas, addConversa, type CrmConversa } from "@/lib/crm-service";
import { supabase } from "@/lib/supabase";
import { apiCrmOrcamentos, type CrmItem } from "@/lib/api";

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
  itemsInitial?: CrmItem[];
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
  amICentralizer,
  itemsInitial
}: ChatModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [conversas, setConversas] = useState<CrmConversa[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [budgetOwner, setBudgetOwner] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [centralizer, setCentralizer] = useState<{ id: string; name: string; avatar: string } | null>(null);

  // Estados para Itens do Orçamento
  const [showItems, setShowItems] = useState(false);
  const [items, setItems] = useState<CrmItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // 1. Efeito Principal de Inicialização e Realtime
  useEffect(() => {
    if (!isOpen || !documento) return;

    // Resetar itens ao trocar de documento. Priorizar itemsInitial se vier do evento
    setItems(itemsInitial || []);
    setShowItems(false);

    interface CacheUser {
      id: string;
      name: string;
      avatar?: string;
      operator_code?: string;
    }
    const userCache = (window as unknown as { _carflaxUserCache: Record<string, CacheUser> })._carflaxUserCache || {};
    let resolvedImmediately = false;

    if (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName !== userProfile?.name) {
      const lookup = sellerName.toUpperCase().trim();
      const match = Object.values(userCache).find(u => 
        u.name?.toUpperCase() === lookup || lookup.includes(u.name?.toUpperCase())
      );
      
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
          const user = Object.values(userCache).find((u) => u.operator_code === vCode);
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

    // Realtime para este documento (Filtragem manual estabilizada)
    const cleanDoc = documento.replace("#", "").trim();
    const channel = supabase
      .channel(`chat_room_${cleanDoc}`) // Nome estável
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_conversas' }, 
        (payload) => {
          const newMsg = payload.new as CrmConversa;
          
          const msgDoc = (newMsg.documento || "").replace("#", "").trim();
          if (msgDoc !== cleanDoc) return;

          setConversas((prev) => {
            const exists = prev.some(m => m.id === newMsg.id || (m.timestamp === newMsg.timestamp && m.obs === newMsg.obs));
            if (exists) return prev;
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
  }, [isOpen, documento, userProfile?.id, userProfile?.name, itemsInitial, amICentralizer, sellerCode, sellerName]);

  // 2. Efeito de Resolução Dinâmica de Perfil baseada em Mensagens e Cache Global
  useEffect(() => {
    if (!isOpen) return;

    // Tentar resolver pelo Cache Global primeiro (instantâneo)
    interface CacheUser {
      id: string;
      name: string;
      avatar?: string;
      operator_code?: string;
    }
    const userCache = (window as unknown as { _carflaxUserCache: Record<string, CacheUser> })._carflaxUserCache || {};
    
    const resolveFromCache = (name: string) => {
      const lookup = name.toUpperCase().trim();
      const match = Object.values(userCache).find(u => 
        u.name?.toUpperCase() === lookup || lookup.includes(u.name?.toUpperCase())
      );
      if (match && match.id !== userProfile?.id) {
        if (ownerProfile?.name !== match.name || ownerProfile?.avatar !== match.avatar) {
          setOwnerProfile({ name: match.name, avatar: match.avatar || "" });
        }
        if (budgetOwner !== match.id) {
          setBudgetOwner(match.id);
        }
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
          else setCentralizer({ id: user.id, name: user.name, avatar: user.avatar || "" });
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
        const systemMsg = conversas.find(m => (m.enviado_por_nome?.toUpperCase() === "SISTEMA") && /vendedor:/i.test(m.obs));
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
  }, [conversas, userProfile?.id, userProfile?.name, amICentralizer, sellerName, isOpen]);


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

  // Lógica de exibição no Header: Prioridade TOTAL ao humano (Remetente da última mensagem -> Dono do Orçamento -> Centralizador)
  const displayUser = (() => {
    if (conversas && conversas.length > 0) {
      const otherMessage = [...conversas].reverse().find(m => 
        m.enviado_por && 
        m.enviado_por !== userProfile?.id && 
        m.enviado_por_nome?.toUpperCase() !== "SISTEMA"
      );

      if (otherMessage && otherMessage.enviado_por_nome) {
        return {
          name: otherMessage.enviado_por_nome,
          // Se tiver a foto atachada na mensagem usa, senão usa as que baixou no useEffect
          avatar: (otherMessage as CrmConversa & { enviado_por_foto?: string }).enviado_por_foto || ownerProfile?.avatar || centralizer?.avatar || ""
        };
      }
    }

    if (amICentralizer) {
      return { 
        name: (ownerProfile?.name && ownerProfile.name.toUpperCase() !== "SISTEMA" && ownerProfile.name.toUpperCase().trim() !== userProfile?.name?.toUpperCase().trim() ? ownerProfile.name : null) || 
              (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName.toUpperCase().trim() !== userProfile?.name?.toUpperCase().trim() ? sellerName : null) || 
              (title.toUpperCase().includes(userProfile?.name?.toUpperCase() || "---") ? `Orçamento #${documento.replace("#", "")}` : title), 
        avatar: ownerProfile?.avatar || "" 
      };
    } else {
      return { 
        name: (centralizer?.name) || 
              (sellerName && sellerName.toUpperCase() !== "SISTEMA" && sellerName.toUpperCase().trim() !== userProfile?.name?.toUpperCase().trim() ? sellerName : null) || 
              "Centralizador Carflax", 
        avatar: centralizer?.avatar || "" 
      };
    }
  })();

  const handleToggleItems = async () => {
    if (showItems) {
      setShowItems(false);
      return;
    }

    setShowItems(true);
    
    // Se já temos itens no estado ou no initial, não buscamos de novo
    if (items.length > 0) return;
    
    if (itemsInitial && itemsInitial.length > 0) {
      setItems(itemsInitial);
      return;
    }

    setItemsLoading(true);
    try {
      const fullDocId = documento.trim();
      const cleanDocId = documento.replace("#", "").split("-")[0].trim();
      
      const raw = await apiCrmOrcamentos({});
      // Busca flexível: tenta ID completo ou ID limpo
      const budget = raw.find(b => 
        b.ORCAMENTO === fullDocId || 
        b.ORCAMENTO === cleanDocId || 
        b.ORCAMENTO?.includes(cleanDocId)
      );

      if (budget) {
        setItems(budget.PRODUTOS || []);
      }
    } catch (e) {
      console.error("[Chat] Erro ao buscar produtos:", e);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleSend = async () => {
    const text = messageText.trim().toUpperCase();
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
    const myId = userProfile.id;
    const myName = userProfile.name?.toUpperCase().trim();
    
    // 1. Check ID
    if (myId && msg.enviado_por === myId) return true;
    
    // 2. Check Name OR System-Attributed Name
    const rawSender = msg.enviado_por_nome?.toUpperCase().trim();
    let resolvedSender = rawSender;

    if (rawSender === "SISTEMA") {
      const match = msg.obs.match(/Vendedor:.*?\*?\s*(.*?)(?:\n|$)/i);
      if (match) resolvedSender = match[1].replace(/\*/g, "").trim().toUpperCase();
    }

    if (resolvedSender && myName && resolvedSender === myName) return true;
    
    return false;
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        result.push(
          <div key={`table-${result.length}`} className="my-3 rounded-xl border border-border/50 overflow-hidden bg-background/50 shadow-inner">
            <table className={cn("w-full text-left transition-all", isMaximized ? "text-[11px]" : "text-[10px]")}>
              <thead className={cn("bg-secondary/60 text-muted-foreground uppercase tracking-widest font-black", isMaximized ? "text-[9px]" : "text-[8px]")}>
                <tr>
                  {tableRows[0].map((h, i) => <th key={i} className={cn("px-2 py-1.5 border-b border-border/50", i > 0 && "text-center")}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tableRows.slice(2).map((row, i) => (
                  <tr key={i} className="hover:bg-secondary/40 transition-colors">
                    {row.map((cell, j) => {
                       const isRed = cell.includes('<red>');
                       const isGreen = cell.includes('<green>');
                       const cleanCell = cell.replace(/<\/?(red|green)>/g, '');
                       return (
                         <td key={j} className={cn(
                           "px-2 py-1.5 font-semibold", 
                           isRed ? "text-rose-500 font-black" : (isGreen ? "text-emerald-500 font-black" : "text-foreground/90"), 
                           j === 0 ? "text-[9px] uppercase tracking-tighter" : "text-center"
                         )}>
                           {cleanCell}
                         </td>
                       );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cols = line.split('|').slice(1, -1).map(c => c.trim());
        tableRows.push(cols);
      } else {
        flushTable();
        
        // Renderiza linha normal
        const renderLine = (str: string) => {
          // Processa <red>
          const parts = str.split(/(<red>.*?<\/red>)/g);
          return parts.map((part, k) => {
            if (part.startsWith('<red>')) {
              return <span key={k} className="text-rose-500 font-black">{part.replace(/<\/?red>/g, '')}</span>;
            }
            // Processa *bold*
            const boldParts = part.split(/(\*.*?\*)/g);
            return boldParts.map((bp, j) => {
              if (bp.startsWith('*') && bp.endsWith('*')) {
                return <span key={`${k}-${j}`} className="font-black text-foreground">{bp.slice(1, -1)}</span>;
              }
              // Processa dois pontos apenas se for a primeira palavra da linha, mantendo retrocompatibilidade
              if (j === 0 && k === 0 && bp.includes(':') && !bp.startsWith('http')) {
                const colonIdx = bp.indexOf(':');
                return (
                  <span key={`${k}-${j}-c`}>
                    <span className="text-amber-400 font-black">{bp.slice(0, colonIdx)}:</span>
                    <span className="text-foreground">{bp.slice(colonIdx + 1)}</span>
                  </span>
                );
              }
              return bp;
            });
          });
        };

        result.push(
          <div key={index} className="mb-0.5 leading-relaxed">
            {renderLine(line)}
          </div>
        );
      }
    });
    flushTable();

    return result;
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
    <div className="pointer-events-none">
      <div className={cn(
          "bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-4",
          isMaximized && !isMinimized ? "w-[900px]" : "w-[340px]",
          isMinimized ? "h-[56px]" : (isMaximized ? "h-[85vh]" : "h-[480px]")
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
            {amICentralizer && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleToggleItems(); }} 
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-95",
                  showItems ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-secondary text-muted-foreground hover:text-blue-600"
                )}
                title="Ver Itens do Orçamento"
              >
                <Package className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); if (isMaximized) setIsMaximized(false); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground" title={isMinimized ? "Restaurar" : "Minimizar"}>
              {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            {!isMinimized && (
              <button onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground" title={isMaximized ? "Restaurar" : "Maximizar"}>
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* PAINEL DE ITENS DO ORCAMENTO */}
            {showItems && (
              <div className="absolute inset-0 z-50 bg-card flex flex-col animate-in slide-in-from-right-full duration-300">
                <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Produtos do Orçamento</span>
                  </div>
                  <button onClick={() => setShowItems(false)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                  {itemsLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Carregando Itens...</span>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                      <Package className="w-8 h-8 text-muted-foreground/20 mb-2" />
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Nenhum item encontrado para este orçamento.</p>
                    </div>
                  ) : (
                    items.map((it, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">CÓD: {it.COD_PRODUTO}</span>
                          <span className="text-[9px] font-black text-emerald-500">{parseFloat(String(it.QUANTIDADE)).toFixed(0)} {it.UN || 'UN'}</span>
                        </div>
                        <p className="text-[10px] font-bold text-foreground leading-tight uppercase tracking-tight mb-1">{it.PRODUTO}</p>
                        <div className="flex justify-between items-center text-[9px] font-black opacity-60">
                          <span>UNIT: {(parseFloat(String(it.PRECO_UNITARIO))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                          <span className="text-foreground">TOTAL: {(parseFloat(String(it.QUANTIDADE)) * parseFloat(String(it.PRECO_UNITARIO))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-3 border-t border-border bg-secondary/10 shrink-0">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase">Valor Total:</span>
                    <span className="text-[11px] font-black text-emerald-500">
                      {items.reduce((acc, it) => acc + (parseFloat(String(it.QUANTIDADE)) * parseFloat(String(it.PRECO_UNITARIO))), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                  {!isMe(msg) && (
                    <span className="text-[8px] font-black text-muted-foreground uppercase ml-1 tracking-widest">
                      {(() => {
                        if (msg.enviado_por_nome?.toUpperCase() === "SISTEMA") {
                          const match = msg.obs.match(/Vendedor:.*?\*?\s*(.*?)(?:\n|$)/i);
                          return match ? match[1].replace(/\*/g, "").trim() : "Sistema";
                        }
                        return msg.enviado_por_nome;
                      })()}
                    </span>
                  )}
                  <div className={cn(
                    "rounded-2xl max-w-full shadow-xl leading-relaxed transition-all uppercase", 
                    isMaximized ? "p-4 text-[14px] font-bold" : "p-3.5 text-[11px] font-medium",
                    isMe(msg) ? "bg-blue-600 text-white rounded-tr-none" : "bg-secondary/80 text-foreground/90 rounded-tl-none border border-border/40"
                  )}>
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
                <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Adicionar observação..." className={cn(
                  "w-full bg-secondary/50 border border-border rounded-xl pl-4 pr-10 outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground/30 uppercase font-bold",
                  isMaximized ? "py-4 text-[13px]" : "py-3 text-[11px]"
                )} />
                <button type="submit" disabled={sending || !messageText.trim()} className="absolute right-2 p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all active:scale-90 disabled:opacity-40">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
