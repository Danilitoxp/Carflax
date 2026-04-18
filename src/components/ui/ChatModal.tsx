import { useState } from "react";
import { X, Send, Minus, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: string;
  title: string;
  subtitle: string;
  avatarText?: string;
}

export function ChatModal({ isOpen, onClose, id, title, subtitle, avatarText }: ChatModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Tento negociar preço aqui se precisar", sender: "them", time: "10:35" },
    { id: 2, text: "Quando vamos falar novamente?", sender: "me", time: "10:53", read: true },
    { id: 3, text: "Hoje após o almoço", sender: "them", time: "10:53" },
  ]);

  if (!isOpen) return null;

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: messageText,
      sender: "me",
      time: new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setMessages([...messages, newMessage]);
    setMessageText("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 pointer-events-none">
      <div className={cn(
        "w-[320px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-4",
        isMinimized ? "h-[56px]" : "h-[450px]"
      )}>
        {/* Header */}
        <div 
          className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0 cursor-pointer" 
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-black">
              {avatarText || title.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-900 tracking-tight leading-none mb-0.5">#{id}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
            >
              {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chat Body & Footer - Only visible when NOT minimized */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col space-y-1",
                    msg.sender === "me" ? "items-end" : "items-start"
                  )}
                >
                  {msg.sender === "them" && (
                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
                      {subtitle.toLowerCase()}
                    </span>
                  )}
                  <div className={cn(
                    "p-2.5 rounded-2xl max-w-[80%] leading-relaxed text-[11px] font-medium",
                    msg.sender === "me" 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10" 
                      : "bg-slate-100 text-slate-700 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                  <div className={cn("flex items-center gap-1", msg.sender === "me" ? "mr-1" : "ml-1")}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{msg.time}</span>
                    {msg.sender === "me" && (
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter",
                        msg.read ? "text-emerald-500" : "text-slate-300"
                      )}>
                        {msg.read ? "✓ Lida" : "✓✓"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 border-t border-slate-100"
            >
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Enviar mensagem..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-[11px] font-semibold outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300"
                />
                <button 
                  type="submit"
                  className="absolute right-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
