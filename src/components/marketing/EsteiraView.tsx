import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Trash2, Pencil, Calendar, Tag, Sparkles, 
  Database, AlertTriangle, User, Check, Clock, Kanban, 
  CheckCircle2, BarChart2, Info, X, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface KanbanCard {
  id: string; // uuid or string
  title: string;
  description: string;
  column_id: "IDEIAS" | "A FAZER" | "FAZENDO" | "CONCLUIDOS";
  order_index: number;
  tag_name?: string;
  tag_color?: string; // hex or tailwind class name
  due_date?: string;
  created_by_name?: string;
  created_at?: string;
}

interface UserProfile {
  id?: string;
  name: string;
  role: string;
}

interface EsteiraViewProps {
  userProfile?: UserProfile | null;
}

const COLUMNS: { id: KanbanCard["column_id"]; title: string; color: string; bgClass: string; borderClass: string; textClass: string }[] = [
  { 
    id: "IDEIAS", 
    title: "Ideias", 
    color: "violet",
    bgClass: "bg-violet-500/5 dark:bg-violet-500/10",
    borderClass: "border-violet-500/20",
    textClass: "text-violet-500"
  },
  { 
    id: "A FAZER", 
    title: "A Fazer", 
    color: "sky",
    bgClass: "bg-sky-500/5 dark:bg-sky-500/10",
    borderClass: "border-sky-500/20",
    textClass: "text-sky-500"
  },
  { 
    id: "FAZENDO", 
    title: "Fazendo", 
    color: "amber",
    bgClass: "bg-amber-500/5 dark:bg-amber-500/10",
    borderClass: "border-amber-500/20",
    textClass: "text-amber-500"
  },
  { 
    id: "CONCLUIDOS", 
    title: "Concluídos", 
    color: "emerald",
    bgClass: "bg-emerald-500/5 dark:bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    textClass: "text-emerald-500"
  }
];

const TAG_OPTIONS = [
  { name: "Mídias Sociais", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20" },
  { name: "Tráfego Pago", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" },
  { name: "Design / Peças", color: "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20" },
  { name: "Institucional", color: "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20" },
  { name: "Vídeos / Reels", color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" },
  { name: "Campanha Interna", color: "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20" },
];

export function EsteiraView({ userProfile }: EsteiraViewProps) {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLocalStorageMode, setIsLocalStorageMode] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  
  // Modals state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Partial<KanbanCard> | null>(null);
  
  const creatorName = userProfile?.name || "Marketing User";

  const SQL_SCRIPT = `CREATE TABLE public.marketing_esteira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT NOT NULL, -- 'IDEIAS', 'A FAZER', 'FAZENDO', 'CONCLUIDOS'
  order_index INTEGER DEFAULT 0,
  tag_name TEXT,
  tag_color TEXT,
  due_date TIMESTAMPTZ,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.marketing_esteira ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso irrestrito para autenticados
CREATE POLICY "Acesso leitura para autenticados" ON public.marketing_esteira
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Acesso escrita total para autenticados" ON public.marketing_esteira
  FOR ALL TO authenticated USING (true);`;

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("marketing_esteira")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) {
        throw error;
      }

      setCards(data || []);
      setIsLocalStorageMode(false);
    } catch (err) {
      console.warn("[EsteiraView] Supabase table 'marketing_esteira' missing or inaccessible. Falling back to LocalStorage.", err);
      setIsLocalStorageMode(true);
      const localData = localStorage.getItem("carflax_marketing_esteira_cards");
      if (localData) {
        try {
          setCards(JSON.parse(localData));
        } catch {
          setCards([]);
        }
      } else {
        setCards([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const persistCards = async (newCards: KanbanCard[]) => {
    setCards(newCards);
    if (isLocalStorageMode) {
      localStorage.setItem("carflax_marketing_esteira_cards", JSON.stringify(newCards));
    } else {
      // Para manter simples, sincronizamos o estado atual no Supabase
      // Idealmente fazemos operações pontuais, mas para drag e drop ou alterações rápidas podemos persistir
      // Vamos criar helpers individuais para inserts, updates e deletes.
    }
  };

  // Helper para salvar um card (Insert ou Update)
  const saveCard = async (cardData: Partial<KanbanCard>) => {
    const isNew = !cardData.id;
    const now = new Date().toISOString();
    
    let updatedCard: KanbanCard;

    if (isNew) {
      updatedCard = {
        id: isLocalStorageMode ? Math.random().toString(36).substring(2, 9) : "", // Supabase gera UUID
        title: cardData.title || "Sem título",
        description: cardData.description || "",
        column_id: cardData.column_id || "IDEIAS",
        order_index: cards.filter(c => c.column_id === (cardData.column_id || "IDEIAS")).length,
        tag_name: cardData.tag_name || "",
        tag_color: cardData.tag_color || "",
        due_date: cardData.due_date || undefined,
        created_by_name: creatorName,
        created_at: now
      };
    } else {
      updatedCard = {
        ...(cards.find(c => c.id === cardData.id) as KanbanCard),
        ...cardData,
      };
    }

    if (isLocalStorageMode) {
      let nextCards: KanbanCard[];
      if (isNew) {
        nextCards = [...cards, updatedCard];
      } else {
        nextCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
      }
      persistCards(nextCards);
    } else {
      try {
        if (isNew) {
          // Remover o campo temporário id para o supabase gerar
          const { id: _, ...supabaseInsertData } = updatedCard;
          const { data, error } = await supabase
            .from("marketing_esteira")
            .insert([supabaseInsertData])
            .select()
            .single();

          if (error) throw error;
          if (data) {
            persistCards([...cards, data]);
          }
        } else {
          const { error } = await supabase
            .from("marketing_esteira")
            .update({
              title: updatedCard.title,
              description: updatedCard.description,
              column_id: updatedCard.column_id,
              order_index: updatedCard.order_index,
              tag_name: updatedCard.tag_name,
              tag_color: updatedCard.tag_color,
              due_date: updatedCard.due_date,
            })
            .eq("id", updatedCard.id);

          if (error) throw error;
          persistCards(cards.map(c => c.id === updatedCard.id ? updatedCard : c));
        }
      } catch (err) {
        console.error("[EsteiraView] Falha ao sincronizar com Supabase. Salvando localmente.", err);
        // Fallback rápido local
        let nextCards: KanbanCard[];
        if (isNew) {
          updatedCard.id = "fallback_" + Math.random().toString(36).substring(2, 9);
          nextCards = [...cards, updatedCard];
        } else {
          nextCards = cards.map(c => c.id === updatedCard.id ? updatedCard : c);
        }
        persistCards(nextCards);
      }
    }
    setIsCardModalOpen(false);
    setSelectedCard(null);
  };

  // Helper para deletar um card
  const deleteCard = async (cardId: string) => {
    if (!confirm("Deseja realmente excluir este card?")) return;

    if (isLocalStorageMode) {
      const nextCards = cards.filter(c => c.id !== cardId);
      persistCards(nextCards);
    } else {
      try {
        const { error } = await supabase
          .from("marketing_esteira")
          .delete()
          .eq("id", cardId);

        if (error) throw error;
        persistCards(cards.filter(c => c.id !== cardId));
      } catch (err) {
        console.error("[EsteiraView] Falha ao excluir do Supabase. Removendo localmente.", err);
        persistCards(cards.filter(c => c.id !== cardId));
      }
    }
    // Fechar modal caso estivesse aberto editando o card deletado
    if (selectedCard?.id === cardId) {
      setIsCardModalOpen(false);
      setSelectedCard(null);
    }
  };

  // Drag and Drop Native Handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: KanbanCard["column_id"]) => {
    e.preventDefault();
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: KanbanCard["column_id"]) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const cardId = e.dataTransfer.getData("text/plain");
    
    const targetCard = cards.find(c => c.id === cardId);
    if (!targetCard || targetCard.column_id === targetColumnId) return;

    // Atualiza a coluna e recalcula os order_index
    const updatedCards = cards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          column_id: targetColumnId,
          order_index: cards.filter(x => x.column_id === targetColumnId).length
        };
      }
      return c;
    });

    persistCards(updatedCards);

    // Se estiver em Supabase, atualiza no banco
    if (!isLocalStorageMode) {
      try {
        const { error } = await supabase
          .from("marketing_esteira")
          .update({ column_id: targetColumnId, order_index: cards.filter(x => x.column_id === targetColumnId).length })
          .eq("id", cardId);

        if (error) throw error;
      } catch (err) {
        console.error("[EsteiraView] Erro ao sincronizar drag-and-drop no Supabase:", err);
      }
    }
  };

  // Copy SQL Schema to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Filter cards by search term
  const filteredCards = useMemo(() => {
    if (!search.trim()) return cards;
    const term = search.toLowerCase();
    return cards.filter(c => 
      c.title.toLowerCase().includes(term) || 
      c.description.toLowerCase().includes(term) ||
      (c.tag_name && c.tag_name.toLowerCase().includes(term))
    );
  }, [cards, search]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = cards.length;
    const ideas = cards.filter(c => c.column_id === "IDEIAS").length;
    const todo = cards.filter(c => c.column_id === "A FAZER").length;
    const doing = cards.filter(c => c.column_id === "FAZENDO").length;
    const done = cards.filter(c => c.column_id === "CONCLUIDOS").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    
    return { total, ideas, todo, doing, done, completionRate };
  }, [cards]);

  // Check if a date is overdue (and not finished)
  const isOverdue = (dateStr?: string, columnId?: KanbanCard["column_id"]) => {
    if (!dateStr || columnId === "CONCLUIDOS") return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return due < today;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground p-6 overflow-hidden relative font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Kanban className="w-8 h-8 text-primary" />
            Esteira de Atividades
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Fluxo Kanban e Gestão de Campanhas de Marketing</p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Status database badge */}
          <button 
            onClick={() => setIsSqlModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-secondary/80 ${
              isLocalStorageMode 
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {isLocalStorageMode ? "Modo Local (Avisar)" : "Supabase Sinc"}
            <Info className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          <button 
            onClick={() => {
              setSelectedCard({ column_id: "IDEIAS" });
              setIsCardModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all text-sm font-bold shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Adicionar Card
          </button>
        </div>
      </div>

      {/* STATISTICS CAROUSEL / GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0">
        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-muted-foreground group-hover:scale-110 transition-transform">
            <BarChart2 className="w-20 h-20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Total</span>
          <span className="text-2xl font-black mt-2 leading-none">{stats.total}</span>
        </div>
        
        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-violet-500 group-hover:scale-110 transition-transform">
            <Sparkles className="w-20 h-20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Ideias</span>
          <span className="text-2xl font-black text-violet-500 mt-2 leading-none">{stats.ideas}</span>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-sky-500 group-hover:scale-110 transition-transform">
            <Clock className="w-20 h-20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">A Fazer / Fazendo</span>
          <span className="text-2xl font-black text-sky-500 mt-2 leading-none">{stats.todo + stats.doing}</span>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-20 h-20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Concluídos</span>
          <span className="text-2xl font-black text-emerald-500 mt-2 leading-none">{stats.done}</span>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl col-span-2 md:col-span-1 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Aproveitamento</span>
            <span className="text-[11px] font-bold text-emerald-500">{stats.completionRate}%</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.completionRate}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative shrink-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por título, descrição ou tag de marketing..."
          className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary/50 placeholder:text-muted-foreground/30 transition-all uppercase"
        />
      </div>

      {/* DRAG AND DROP KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto min-h-0 flex gap-4 pr-1 pb-4 select-none custom-scrollbar">
        {COLUMNS.map(col => {
          const colCards = filteredCards.filter(c => c.column_id === col.id);
          const isOver = draggedOverColumn === col.id;

          return (
            <div 
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-80 shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${col.bgClass} ${col.borderClass} ${
                isOver ? "ring-2 ring-primary/20 scale-[0.99] border-primary/40 bg-secondary/50" : ""
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.textClass} bg-current`} />
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">{col.title}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border/50 text-[10px] font-black text-muted-foreground uppercase">{colCards.length}</span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar min-h-[150px]">
                {loading ? (
                  Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="bg-card border border-border/50 p-4 rounded-xl animate-pulse space-y-3">
                      <div className="h-4 bg-secondary rounded w-3/4" />
                      <div className="h-3 bg-secondary rounded w-5/6" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-secondary rounded w-20" />
                        <div className="h-5 bg-secondary rounded-full w-5" />
                      </div>
                    </div>
                  ))
                ) : colCards.length > 0 ? (
                  colCards.map(card => {
                    const expired = isOverdue(card.due_date, card.column_id);
                    const tagStyle = TAG_OPTIONS.find(t => t.name === card.tag_name)?.color || "bg-secondary text-muted-foreground border-border/50";

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        className={`bg-card hover:shadow-md border border-border hover:border-border/80 transition-all duration-200 hover:-translate-y-0.5 rounded-xl p-4 cursor-grab active:cursor-grabbing relative overflow-hidden group`}
                      >
                        {/* Top elements */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          {card.tag_name ? (
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${tagStyle}`}>
                              {card.tag_name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30 font-bold italic">Sem tag</span>
                          )}

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setSelectedCard(card);
                                setIsCardModalOpen(true);
                              }}
                              className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors"
                              title="Editar Card"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteCard(card.id)}
                              className="p-1 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                              title="Excluir Card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-foreground mb-1 leading-snug break-words">
                          {card.title}
                        </h4>

                        {/* Description */}
                        {card.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed break-words">
                            {card.description}
                          </p>
                        )}

                        {/* Footer details */}
                        <div className="pt-2.5 border-t border-border/30 flex items-center justify-between gap-2 text-[10px] font-bold text-muted-foreground">
                          {card.due_date ? (
                            <div className={`flex items-center gap-1.5 ${expired ? "text-red-500 bg-red-500/5 px-2 py-0.5 rounded-lg border border-red-500/10 animate-pulse" : ""}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(card.due_date)}</span>
                            </div>
                          ) : (
                            <div className="w-1" />
                          )}

                          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-md border border-border/40 shrink-0">
                            <User className="w-3 h-3 text-muted-foreground/70" />
                            <span className="truncate max-w-[60px] text-[9px] uppercase tracking-wider">{card.created_by_name?.split(' ')[0]}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/30 rounded-xl min-h-[120px] text-center opacity-30">
                    <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Coluna Vazia</span>
                  </div>
                )}
              </div>

              {/* Column Footer */}
              <div className="p-3 border-t border-border/40 shrink-0">
                <button 
                  onClick={() => {
                    setSelectedCard({ column_id: col.id });
                    setIsCardModalOpen(true);
                  }}
                  className="w-full py-2 bg-secondary/20 hover:bg-secondary/60 text-muted-foreground hover:text-foreground font-bold text-xs rounded-xl border border-dashed border-border/60 hover:border-border transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Atividade
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW/EDIT CARD MODAL */}
      <AnimatePresence>
        {isCardModalOpen && selectedCard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCardModalOpen(false);
                setSelectedCard(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-black uppercase tracking-tighter">
                      {selectedCard.id ? "Editar Card" : "Novo Card"}
                    </h3>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCardModalOpen(false);
                      setSelectedCard(null);
                    }}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título do Card</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Criar banner de Dia dos Pais"
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                      value={selectedCard.title || ""}
                      onChange={(e) => setSelectedCard({ ...selectedCard, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição / Tarefas</label>
                    <textarea 
                      rows={3}
                      placeholder="Detalhes adicionais, links de referências ou roteiros..."
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      value={selectedCard.description || ""}
                      onChange={(e) => setSelectedCard({ ...selectedCard, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coluna / Quadro</label>
                      <select 
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                        value={selectedCard.column_id}
                        onChange={(e) => setSelectedCard({ ...selectedCard, column_id: e.target.value as KanbanCard["column_id"] })}
                      >
                        <option value="IDEIAS">Ideias</option>
                        <option value="A FAZER">A Fazer</option>
                        <option value="FAZENDO">Fazendo</option>
                        <option value="CONCLUIDOS">Concluídos</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prazo de Entrega</label>
                      <input 
                        type="date"
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={selectedCard.due_date ? selectedCard.due_date.split("T")[0] : ""}
                        onChange={(e) => setSelectedCard({ ...selectedCard, due_date: e.target.value || undefined })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Tag da Atividade</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {TAG_OPTIONS.map(opt => {
                        const isSelected = selectedCard.tag_name === opt.name;
                        const optStyle = opt.color;

                        return (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() => setSelectedCard({ 
                              ...selectedCard, 
                              tag_name: isSelected ? "" : opt.name,
                              tag_color: isSelected ? "" : opt.color 
                            })}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1.5 ${optStyle} ${
                              isSelected ? "ring-2 ring-primary/40 scale-102 border-transparent font-black" : "opacity-75"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  {selectedCard.id && (
                    <button 
                      type="button"
                      onClick={() => deleteCard(selectedCard.id!)}
                      className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-2xl border border-red-500/20 transition-all flex items-center justify-center gap-1.5"
                      title="Excluir Card"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsCardModalOpen(false);
                      setSelectedCard(null);
                    }}
                    className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs rounded-2xl border border-border transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => saveCard(selectedCard)}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-black text-xs rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL SCHEMA MODAL */}
      <AnimatePresence>
        {isSqlModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSqlModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-primary/10 border-b border-border/40 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-[13px] font-black uppercase tracking-tight">Sincronização Supabase</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Como persistir os quadros na nuvem</p>
                  </div>
                </div>
                <button onClick={() => setIsSqlModalOpen(false)} className="p-1 hover:bg-secondary rounded transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-muted-foreground font-medium">
                    <p className="font-bold text-foreground mb-1 uppercase tracking-tight">Informação de Banco de Dados</p>
                    {isLocalStorageMode ? (
                      <span>Atualmente o quadro está rodando em **Modo Local (LocalStorage)** porque a tabela `marketing_esteira` não foi encontrada no Supabase. Todos os seus dados serão salvos localmente no navegador atual.</span>
                    ) : (
                      <span>A tabela `marketing_esteira` foi encontrada no Supabase! Todos os dados criados estão sendo sincronizados e salvos diretamente na nuvem em tempo real.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Código SQL de Criação</label>
                  <div className="relative font-mono text-[11px] bg-[#09090B] border border-border rounded-xl p-4 overflow-auto max-h-56 leading-relaxed">
                    <pre className="text-slate-300">{SQL_SCRIPT}</pre>
                    <button 
                      onClick={handleCopySql}
                      className="absolute top-3 right-3 p-2 bg-card/80 hover:bg-card border border-border/40 hover:border-border rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                      title="Copiar Código"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium italic">Copie o código acima e execute-o no **SQL Editor** do seu painel do Supabase para habilitar a sincronização na nuvem.</p>
                </div>

                <button 
                  onClick={() => setIsSqlModalOpen(false)}
                  className="w-full mt-4 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.3);
        }
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='C19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1rem;
        }
      `}</style>
    </div>
  );
}
