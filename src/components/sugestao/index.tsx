import { useState } from "react";
import { 
  X, 
  MessageSquare, 
  Lock, 
  Send, 
  XCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SugestaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SugestaoModal({ isOpen, onClose }: SugestaoModalProps) {
  const [suggestion, setSuggestion] = useState("");
  const maxLength = 1000;

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!suggestion.trim()) return;
    // Aqui viria a lógica de envio
    console.log("Sugestão enviada:", suggestion);
    setSuggestion("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-card border border-border/50 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] p-8 md:p-10 animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Close Button Cross */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 text-muted-foreground/60 hover:text-foreground hover:bg-secondary rounded-2xl transition-all duration-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">
              Enviar Sugestão Anônima
            </h3>
          </div>

          {/* Anonymity Notice */}
          <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
            <Lock className="w-4 h-4 text-emerald-500" />
            <p className="text-[12px] font-bold text-emerald-500/90 tracking-tight">
              Sua sugestão será enviada de forma totalmente anônima
            </p>
          </div>

          {/* Text Area Section */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Sua Sugestão:
            </label>
            <div className="relative group">
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value.slice(0, maxLength))}
                placeholder="Compartilhe sua ideia, sugestão ou feedback de forma anônima..."
                className="w-full bg-secondary/20 border border-border/40 rounded-3xl p-6 text-sm text-foreground font-medium placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none h-[220px] scrollbar-hide"
              />
              <div className="absolute bottom-6 right-6">
                <span className={cn(
                  "text-[10px] font-black tracking-widest transition-colors",
                  suggestion.length >= maxLength ? "text-rose-500" : "text-muted-foreground/30"
                )}>
                  {suggestion.length}/{maxLength}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="flex-1 py-7 bg-secondary/50 hover:bg-secondary text-foreground rounded-2xl font-black text-xs uppercase tracking-widest gap-2 border border-border/10"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!suggestion.trim()}
              className="flex-1 py-7 bg-[#0081FF] hover:bg-[#0070E0] text-white rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-[0_10px_25px_-5px_rgba(0,129,255,0.4)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Enviar Sugestão
            </Button>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10 opacity-50" />
      </div>
    </div>
  );
}
