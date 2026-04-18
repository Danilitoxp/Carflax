import { useState, useEffect, useRef } from "react";
import { X, Send, Minus, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConversas, addConversa, type CrmConversa } from "@/lib/crm-service";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: string;
  empresa: string;
  title: string;
  subtitle: string;
  avatarText?: string;
}

export function ChatModal({ isOpen, onClose, documento, empresa, title, subtitle, avatarText }: ChatModalProps) {
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
      destino: "todos",
      timestamp: new Date().toISOString(),
    };
    setConversas((prev) => [...prev, { ...nova, id: `tmp-${Date.now()}` }]);
    setMessageText("");
    try {
      await addConversa(nova);
      // Reload to get server-assigned id + timestamp
      const updated = await getConversas(documento);
      setConversas(updated);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 pointer-events-none">
      <div
        className={cn(
          "w-[340px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-4",
          isMinimized ? "h-[56px]" : "h-[480px]"
        )}
      >
        {/* Header */}
        <div
          className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0 cursor-pointer"
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-black">
              {avatarText || title.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-900 tracking-tight leading-none mb-0.5">#{documento}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
            >
              {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors text-slate-400"
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
                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                      {msg.enviado_por_nome}
                    </span>
                  )}
                  <div
                    className={cn(
                      "p-2.5 rounded-2xl max-w-[85%] leading-relaxed text-[11px] font-medium",
                      isMe(msg)
                        ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10"
                        : "bg-slate-100 text-slate-700 rounded-tl-none"
                    )}
                  >
                    {msg.obs}
                  </div>
                  <div className={cn("flex items-center gap-1", isMe(msg) ? "mr-1" : "ml-1")}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{formatTime(msg.timestamp)}</span>
                    {isMe(msg) && (
                      <span className={cn("text-[8px] font-black uppercase tracking-tighter", msg.lida ? "text-emerald-500" : "text-slate-300")}>
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
              className="p-4 border-t border-slate-100"
            >
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Adicionar observação..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-[11px] font-semibold outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="absolute right-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90 disabled:opacity-40"
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
