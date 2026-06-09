import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Calendar, Hash, ArrowUpDown, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Sugestao {
  id: string;
  created_at: string;
  category: string;
  suggestion: string;
}

export function SugestoesAdminView() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const fetchSugestoes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sugestoes")
      .select("*")
      .order("created_at", { ascending: sortOrder === "asc" });

    if (!error && data) {
      setSugestoes(data);
    } else {
      console.error("Erro ao buscar sugestões:", error);
    }
    setLoading(false);
  }, [sortOrder]);

  useEffect(() => {
    fetchSugestoes();
  }, [fetchSugestoes]);

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "sugestao": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "critica": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "elogio": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "duvida": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[11px] font-black uppercase tracking-widest text-foreground">Caixa de Sugestões</h1>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Feedback Anônimo da Equipe</p>
              </div>
            </div>
            
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortOrder === "desc" ? "Mais Recentes" : "Mais Antigas"}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mb-3" />
              <p className="text-[9px] font-bold uppercase tracking-widest">Carregando sugestões...</p>
            </div>
          ) : sugestoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-2xl border border-dashed border-border/50">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nenhuma sugestão recebida ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sugestoes.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-border transition-all"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                      getCategoryColor(item.category)
                    )}>
                      <Hash className="w-2.5 h-2.5" />
                      {item.category || "Outros"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(item.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                      {item.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
