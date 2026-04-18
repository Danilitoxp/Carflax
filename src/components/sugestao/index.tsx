import { useState } from "react";
import { 
  X, 
  MessageSquare, 
  Lock, 
  Send, 
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

interface SugestaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SugestaoModal({ isOpen, onClose }: SugestaoModalProps) {
  const [suggestion, setSuggestion] = useState("");
  const [category, setCategory] = useState("Sugestão");
  const maxLength = 1000;

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!suggestion.trim()) return;
    // Aqui viria a lógica de envio
    console.log("Sugestão enviada:", { category, suggestion });
    setSuggestion("");
    onClose();
  };

  const categories = ["Sugestão", "Crítica", "Elogio", "Dúvida", "Outros"];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/10">
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                Sugestão Anônima
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Sua voz é importante</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
          {/* Anonymity Notice */}
          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Protocolo de Confidencialidade</p>
              <p className="text-[10px] font-bold text-emerald-500 mt-0.5">Sua participação é 100% anônima e segura.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Manifestação</label>
              <TinyDropdown 
                value={category}
                options={categories}
                onChange={setCategory}
                icon={Hash}
                variant="blue"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Mensagem</label>
              <div className="relative group">
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value.slice(0, maxLength))}
                  placeholder="Descreva aqui sua sugestão, crítica ou feedback de forma detalhada..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm font-medium text-slate-600 placeholder:text-slate-300 focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all outline-none resize-none h-[200px] scrollbar-hide"
                />
                <div className="absolute bottom-4 right-4 text-[9px] font-bold text-slate-300">
                  <span className={cn(suggestion.length >= maxLength && "text-rose-500")}>
                    {suggestion.length}
                  </span>
                  /{maxLength}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3 shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="font-bold text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200 px-6 rounded-xl h-11 transition-all"
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!suggestion.trim()}
            className={cn(
              "h-11 px-8 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg",
              suggestion.trim() 
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-95" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            <Send className="w-3.5 h-3.5" />
            ENVIAR AGORA
          </Button>
        </div>
      </div>
    </div>
  );
}
