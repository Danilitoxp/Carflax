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
  avatarText?: string;
  userProfile?: UserProfile;
}

export function ChatModal({ isOpen, onClose, documento, empresa, title, avatarText, userProfile }: ChatModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [conversas, setConversas] = useState<CrmConversa[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !documento) return;
    setLoading(true);
    getConversas(documento)
      .then(setConversas)
      .finally(() => setLoading(false));
  }, [isOpen, documento]);

  useEffect(() => {
    if (!isMinimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversas, isMinimized]);

  const [centralizer, setCentralizer] = useState<{ id: string; name: string; avatar: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    async function fetchConfig() {
      const { data: config } = await supabase
        .from("crm_config")
        .select("value")
        .eq("key", "centralizer_user_id")
        .maybeSingle();
      
      if (config?.value) {
        const { data: userData } = await supabase
          .from("usuarios")
          .select("id, name, avatar")
          .eq("id", config.value)
          .maybeSingle();
        
        if (userData) setCentralizer(userData);
      }
    }
    
    fetchConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);

    const nova: Omit<CrmConversa, "id"> = {
      documento,
      empresa,
      obs: text,
      enviado_por_nome: "Você",
      lida: false,
      fechada: false,
      destino: centralizer?.id || "todos",
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
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts.slice(11, 16);
    }
  };

  const isMe = (c: CrmConversa) =>
    c.enviado_por_nome === "Você" || c.enviado_por === "me";

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Destaque para chaves (ex: Endereço:)
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

      // Processar negritos (ex: *texto*)
      const finalLine = String(line).split(/(\*.*?\*)/g).map((segment, j) => {
        if (segment.startsWith('*') && segment.endsWith('*')) {
          return <span key={j} className="font-black text-foreground">{segment.slice(1, -1)}</span>;
        }
        return segment;
      });

      return <div key={i} className="mb-1 leading-normal">{parts.length > 1 ? coloredLine : finalLine}</div>;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 pointer-events-none">
      <div
        className={cn(
          "w-[340px] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-4",
          isMinimized ? "h-[56px]" : "h-[480px]"
        )}
      >
        {/* Header */}
        <div
          className="p-4 border-b border-border flex items-center justify-between bg-secondary/30 rounded-t-2xl shrink-0 cursor-pointer"
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-[10px] font-black overflow-hidden border border-blue-500/30">
              {centralizer?.avatar ? (
                <img src={centralizer.avatar} alt={centralizer.name} className="w-full h-full object-cover" />
              ) : (
                <span>{centralizer ? centralizer.name.split(" ").map(n => n[0]).join("") : (avatarText || title.split(" ").map((n) => n[0]).join(""))}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-foreground tracking-tight leading-none mb-1 uppercase">
                {centralizer ? centralizer.name : title}
              </span>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter opacity-80">
                #{documento}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
            >
              {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {loading && (
                <div className="flex items-center justify-center py-8 gap-2 text-[10px] text-slate-400 font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversas...
                </div>
              )}

              {!loading && conversas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <Send className="w-4 h-4 text-slate-300" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nenhuma conversa ainda</p>
                  <p className="text-[9px] text-slate-300 font-medium">Envie a primeira mensagem</p>
                </div>
              )}

              {!loading && conversas.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex flex-col space-y-1", isMe(msg) ? "items-end" : "items-start")}
                >
                  {!isMe(msg) && (
                    <span className="text-[8px] font-black text-muted-foreground uppercase ml-1 tracking-widest">
                      {msg.enviado_por_nome}
                    </span>
                  )}
                  <div
                    className={cn(
                      "p-3.5 rounded-2xl max-w-[90%] text-[11px] font-medium shadow-xl",
                      isMe(msg)
                        ? "bg-blue-600 text-white rounded-tr-none shadow-blue-600/20"
                        : "bg-secondary/80 text-foreground/90 rounded-tl-none border border-border/40"
                    )}
                  >
                    {renderFormattedText(msg.obs)}
                  </div>
                  <div className={cn("flex items-center gap-2", isMe(msg) ? "mr-1" : "ml-1")}>
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter opacity-50">{formatTime(msg.timestamp)}</span>
                    {isMe(msg) && (
                      <span className={cn("text-[8px] font-black uppercase tracking-tighter", msg.lida ? "text-emerald-500" : "text-muted-foreground")}>
                        {msg.lida ? "✓ Lida" : "✓✓"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Footer */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-4 border-t border-border bg-secondary/10"
            >
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Adicionar observação..."
                  className="w-full bg-secondary/50 border border-border rounded-xl pl-4 pr-10 py-3 text-[11px] font-bold text-foreground outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground/30 uppercase tracking-tight"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="absolute right-2 p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all active:scale-90 disabled:opacity-40"
                >
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
