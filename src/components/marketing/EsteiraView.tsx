import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Calendar, Tag,
  User, Check, X, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  column_id: "A FAZER" | "FAZENDO" | "CONCLUIDOS";
  order_index: number;
  tag_name?: string;
  tag_color?: string;
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

const COLUMNS: { id: KanbanCard["column_id"]; title: string; bgClass: string; borderClass: string; textClass: string }[] = [
  {
    id: "A FAZER",
    title: "A Fazer",
    bgClass: "bg-sky-500/5 dark:bg-sky-500/10",
    borderClass: "border-sky-500/20",
    textClass: "text-sky-500"
  },
  {
    id: "FAZENDO",
    title: "Fazendo",
    bgClass: "bg-amber-500/5 dark:bg-amber-500/10",
    borderClass: "border-amber-500/20",
    textClass: "text-amber-500"
  },
  {
    id: "CONCLUIDOS",
    title: "Concluídos",
    bgClass: "bg-emerald-500/5 dark:bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    textClass: "text-emerald-500"
  }
];

const TAG_OPTIONS = [
  { name: "Baixa",    color: "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20" },
  { name: "Média",    color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" },
  { name: "Alta",     color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20" },
  { name: "Urgente",  color: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" },
];

const getCardCreator = (createdByField?: string) => {
  if (!createdByField) return "Marketing";
  return createdByField.split(" | ")[0] || "Marketing";
};

const getCardResponsible = (createdByField?: string) => {
  if (!createdByField) return "Marketing";
  const parts = createdByField.split(" | ");
  return parts[1] || parts[0] || "Marketing";
};

export function EsteiraView({ userProfile }: EsteiraViewProps) {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [usersList, setUsersList] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Partial<KanbanCard> | null>(null);
  const [draggedOverCardId, setDraggedOverCardId] = useState<string | null>(null);
  const [draggedOverCardPart, setDraggedOverCardPart] = useState<"top" | "bottom" | null>(null);

  const creatorName = userProfile?.name || "Marketing";

  const getResponsibleUser = (createdByField?: string) => {
    const responsibleName = getCardResponsible(createdByField);
    if (!responsibleName) return null;
    const rNameLower = responsibleName.trim().toLowerCase();
    
    // 1. Try exact match (case insensitive)
    let found = usersList.find(u => u.name.trim().toLowerCase() === rNameLower);
    if (found) return found;
    
    // 2. Try prefix match
    found = usersList.find(u => {
      const uNameLower = u.name.trim().toLowerCase();
      return uNameLower.startsWith(rNameLower) || rNameLower.startsWith(uNameLower);
    });
    if (found) return found;
    
    // 3. Try first name match
    const rFirstName = rNameLower.split(" ")[0];
    found = usersList.find(u => u.name.trim().toLowerCase().split(" ")[0] === rFirstName);
    return found || null;
  };

  // ── Load cards and users ──────────────────────────────────────────────────
  useEffect(() => {
    loadCards();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, name, avatar")
        .eq("status", "ativo")
        .order("name");

      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error("[EsteiraView] Erro ao carregar usuários do hub:", err);
      try {
        const { data } = await supabase.from("usuarios").select("id, name, avatar").order("name");
        setUsersList(data || []);
      } catch (fallbackErr) {
        console.error("[EsteiraView] Falha no fallback de usuários:", fallbackErr);
      }
    }
  };

  const loadCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("marketing_esteira")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      console.error("[EsteiraView] Erro ao carregar cards:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Save (Insert or Update) ───────────────────────────────────────────────
  const saveCard = async (cardData: Partial<KanbanCard>) => {
    if (!cardData.title?.trim()) return;
    setSaving(true);

    try {
      if (!cardData.id) {
        // INSERT
        const selectedResp = cardData.created_by_name || creatorName;
        const respName = getCardResponsible(selectedResp);
        const compositeCreatedBy = `${creatorName} | ${respName}`;

        const payload = {
          title: cardData.title.trim(),
          description: cardData.description?.trim() || "",
          column_id: cardData.column_id || "A FAZER",
          order_index: cards.filter(c => c.column_id === (cardData.column_id || "A FAZER")).length,
          tag_name: cardData.tag_name || null,
          tag_color: cardData.tag_color || null,
          due_date: cardData.due_date || null,
          created_by_name: compositeCreatedBy,
        };

        const { data, error } = await supabase
          .from("marketing_esteira")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (data) setCards(prev => [...prev, data]);
      } else {
        // UPDATE
        const origCard = cards.find(c => c.id === cardData.id);
        const origCreator = getCardCreator(origCard?.created_by_name);
        const selectedResp = cardData.created_by_name || creatorName;
        const respName = getCardResponsible(selectedResp);
        const compositeCreatedBy = `${origCreator} | ${respName}`;

        const payload = {
          title: cardData.title.trim(),
          description: cardData.description?.trim() || "",
          column_id: cardData.column_id,
          tag_name: cardData.tag_name || null,
          tag_color: cardData.tag_color || null,
          due_date: cardData.due_date || null,
          created_by_name: compositeCreatedBy,
        };

        const { error } = await supabase
          .from("marketing_esteira")
          .update(payload)
          .eq("id", cardData.id);

        if (error) throw error;
        setCards(prev => prev.map(c => c.id === cardData.id ? { ...c, ...payload } as KanbanCard : c));
      }
    } catch (err) {
      console.error("[EsteiraView] Erro ao salvar card:", err);
    } finally {
      setSaving(false);
      setIsCardModalOpen(false);
      setSelectedCard(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteCard = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const creator = getCardCreator(card.created_by_name);
    if (creator !== creatorName) {
      alert("Apenas o criador da tarefa pode excluí-la.");
      return;
    }

    if (!confirm("Deseja realmente excluir este card?")) return;

    try {
      const { error } = await supabase
        .from("marketing_esteira")
        .delete()
        .eq("id", cardId);

      if (error) throw error;
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (err) {
      console.error("[EsteiraView] Erro ao excluir card:", err);
    }

    if (selectedCard?.id === cardId) {
      setIsCardModalOpen(false);
      setSelectedCard(null);
    }
  };

  // ── Drag and Drop ─────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: KanbanCard["column_id"]) => {
    e.preventDefault();
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => setDraggedOverColumn(null);

  const handleDrop = async (e: React.DragEvent, targetColumnId: KanbanCard["column_id"]) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId) return;

    const targetCard = cards.find(c => c.id === cardId);
    if (!targetCard || targetCard.column_id === targetColumnId) return;

    const sourceColumnId = targetCard.column_id;
    const newOrderIndex = cards.filter(x => x.column_id === targetColumnId).length;

    // Move card to target column at the end
    const movedCard = { ...targetCard, column_id: targetColumnId, order_index: newOrderIndex };

    // Re-index source column
    const sourceColCards = cards
      .filter(c => c.column_id === sourceColumnId && c.id !== cardId)
      .sort((a, b) => a.order_index - b.order_index);

    const reindexedSourceCards = sourceColCards.map((c, idx) => ({
      ...c,
      order_index: idx
    }));

    const updatedCardsMap = new Map<string, KanbanCard>();
    reindexedSourceCards.forEach(c => updatedCardsMap.set(c.id, c));

    const newCards = cards.map(c => {
      if (c.id === cardId) return movedCard;
      return updatedCardsMap.get(c.id) || c;
    });

    newCards.sort((a, b) => a.order_index - b.order_index);
    setCards(newCards);

    try {
      const changedCards = newCards.filter(c => {
        const orig = cards.find(oc => oc.id === c.id);
        return !orig || orig.column_id !== c.column_id || orig.order_index !== c.order_index;
      });

      for (const card of changedCards) {
        await supabase
          .from("marketing_esteira")
          .update({ column_id: card.column_id, order_index: card.order_index })
          .eq("id", card.id);
      }
    } catch (err) {
      console.error("[EsteiraView] Erro ao mover card:", err);
      loadCards();
    }
  };

  const handleCardDrop = async (e: React.DragEvent, targetCardId: string, position: "top" | "bottom") => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverColumn(null);
    setDraggedOverCardId(null);
    setDraggedOverCardPart(null);

    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId || cardId === targetCardId) return;

    const draggedCard = cards.find(c => c.id === cardId);
    const targetCard = cards.find(c => c.id === targetCardId);
    if (!draggedCard || !targetCard) return;

    const targetColumnId = targetCard.column_id;
    const sourceColumnId = draggedCard.column_id;

    // Get all other cards in the target column
    const targetColCards = cards
      .filter(c => c.column_id === targetColumnId && c.id !== cardId)
      .sort((a, b) => a.order_index - b.order_index);

    const targetCardIndex = targetColCards.findIndex(c => c.id === targetCardId);
    
    // Determine the exact insertion index based on whether we dropped on the top or bottom half
    const targetIndex = position === "bottom" ? targetCardIndex + 1 : targetCardIndex;
    
    // Insert the dragged card
    const movedCard = { ...draggedCard, column_id: targetColumnId, order_index: targetIndex };
    targetColCards.splice(targetIndex, 0, movedCard);

    // Re-index target column
    const reindexedTargetCards = targetColCards.map((c, idx) => ({
      ...c,
      order_index: idx
    }));

    // Re-index source column if it's different
    let reindexedSourceCards: KanbanCard[] = [];
    if (sourceColumnId !== targetColumnId) {
      const sourceColCards = cards
        .filter(c => c.column_id === sourceColumnId && c.id !== cardId)
        .sort((a, b) => a.order_index - b.order_index);
      
      reindexedSourceCards = sourceColCards.map((c, idx) => ({
        ...c,
        order_index: idx
      }));
    }

    // Combine updates
    const updatedCardsMap = new Map<string, KanbanCard>();
    reindexedTargetCards.forEach(c => updatedCardsMap.set(c.id, c));
    reindexedSourceCards.forEach(c => updatedCardsMap.set(c.id, c));

    const newCards = cards.map(c => {
      if (c.id === cardId) {
        return { ...draggedCard, column_id: targetColumnId, order_index: targetIndex };
      }
      return updatedCardsMap.get(c.id) || c;
    });

    newCards.sort((a, b) => a.order_index - b.order_index);
    setCards(newCards);

    try {
      const changedCards = newCards.filter(c => {
        const orig = cards.find(oc => oc.id === c.id);
        return !orig || orig.column_id !== c.column_id || orig.order_index !== c.order_index;
      });

      for (const card of changedCards) {
        await supabase
          .from("marketing_esteira")
          .update({ column_id: card.column_id, order_index: card.order_index })
          .eq("id", card.id);
      }
    } catch (err) {
      console.error("[EsteiraView] Erro ao reordenar card:", err);
      loadCards();
    }
  };



  const isOverdue = (dateStr?: string, columnId?: KanbanCard["column_id"]) => {
    if (!dateStr || columnId === "CONCLUIDOS") return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  const openNewCard = (columnId: KanbanCard["column_id"] = "A FAZER") => {
    setSelectedCard({ column_id: columnId, created_by_name: `${creatorName} | ${creatorName}` });
    setIsViewOnly(false);
    setIsCardModalOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground p-6 overflow-hidden relative font-sans">



      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto min-h-0 flex gap-4 pr-1 pb-4 select-none custom-scrollbar">
        {COLUMNS.map(col => {
          const colCards = cards.filter(c => c.column_id === col.id);
          const isOver = draggedOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-80 shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${col.bgClass} ${col.borderClass} ${
                isOver ? "ring-2 ring-primary/20 scale-[0.99] border-primary/40" : ""
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.textClass} bg-current`} />
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">{col.title}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border/50 text-[10px] font-black text-muted-foreground uppercase">
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar min-h-[150px]">
                {loading ? (
                  Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="bg-card border border-border/50 p-4 rounded-xl animate-pulse relative h-[145px] shrink-0">
                      <div className="space-y-3">
                        <div className="h-4 bg-secondary rounded w-3/4" />
                        <div className="h-3 bg-secondary rounded w-5/6" />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pt-2 border-t border-border/30">
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
                        onDragOver={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const relativeY = e.clientY - rect.top;
                          const isBottom = relativeY > rect.height / 2;
                          setDraggedOverCardId(card.id);
                          setDraggedOverCardPart(isBottom ? "bottom" : "top");
                        }}
                        onDragLeave={() => {
                          setDraggedOverCardId(null);
                          setDraggedOverCardPart(null);
                        }}
                        onDrop={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const relativeY = e.clientY - rect.top;
                          const isBottom = relativeY > rect.height / 2;
                          setDraggedOverCardId(null);
                          setDraggedOverCardPart(null);
                          handleCardDrop(e, card.id, isBottom ? "bottom" : "top");
                        }}
                        className={`bg-card hover:shadow-md border border-border hover:border-border/80 transition-all duration-150 hover:-translate-y-0.5 rounded-xl p-4 pb-14 cursor-grab active:cursor-grabbing relative overflow-hidden group h-[145px] shrink-0 ${
                          draggedOverCardId === card.id && draggedOverCardPart === "top" ? "border-t-primary border-t-2 scale-[1.01] shadow-md" : 
                          draggedOverCardId === card.id && draggedOverCardPart === "bottom" ? "border-b-primary border-b-2 scale-[1.01] shadow-md" : ""
                        }`}
                      >
                        {/* Card top row */}
                        <div className="flex items-start justify-between gap-2 mb-1.5 shrink-0">
                          {card.tag_name ? (
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${tagStyle}`}>
                              {card.tag_name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30 font-bold italic">Sem tag</span>
                          )}

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {getCardCreator(card.created_by_name) === creatorName ? (
                              <>
                                <button
                                  onClick={() => { setSelectedCard(card); setIsViewOnly(false); setIsCardModalOpen(true); }}
                                  className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteCard(card.id)}
                                  className="p-1 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => { setSelectedCard(card); setIsViewOnly(true); setIsCardModalOpen(true); }}
                                className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors"
                                  title="Visualizar Detalhes"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-foreground mb-1 leading-snug break-words line-clamp-2" title={card.title}>
                          {card.title}
                        </h4>

                        {/* Description */}
                        {card.description && (
                          <p 
                            className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed break-words whitespace-pre-line"
                            title={card.description}
                          >
                            {card.description}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="absolute bottom-4 left-4 right-4 pt-2 border-t border-border/30 flex items-center justify-between gap-2 text-[10px] font-bold text-muted-foreground">
                          {card.due_date ? (
                            <div className={`flex items-center gap-1.5 ${expired ? "text-red-500 bg-red-500/5 px-2 py-0.5 rounded-lg border border-red-500/10 animate-pulse" : ""}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(card.due_date)}</span>
                            </div>
                          ) : <div className="w-1" />}

                           {(() => {
                             const responsibleUser = getResponsibleUser(card.created_by_name);
                             const userAvatar = responsibleUser?.avatar;
                             const displayName = responsibleUser?.name || getCardResponsible(card.created_by_name);
                             
                             return (
                               <div 
                                 className="flex items-center gap-1.5 bg-secondary/50 pl-1 pr-2 py-0.5 rounded-md border border-border/40 shrink-0"
                                 title={displayName || "Sem responsável"}
                               >
                                 {userAvatar ? (
                                   <img 
                                     src={userAvatar} 
                                     alt={displayName} 
                                     className="w-4 h-4 rounded-full object-cover shrink-0 border border-border/40" 
                                     onError={(e) => {
                                       // Fallback para caso o link da imagem quebre
                                       (e.currentTarget as HTMLImageElement).style.display = 'none';
                                     }}
                                   />
                                 ) : (
                                   <User className="w-3 h-3 text-muted-foreground/70" />
                                 )}
                                 <span className="truncate max-w-[60px] text-[9px] uppercase tracking-wider">
                                   {displayName.split(" ")[0]}
                                 </span>
                               </div>
                             );
                           })()}
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

              {/* Column footer */}
              <div className="p-3 border-t border-border/40 shrink-0">
                <button
                  onClick={() => openNewCard(col.id)}
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

      {/* CARD MODAL */}
      <AnimatePresence>
        {isCardModalOpen && selectedCard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsCardModalOpen(false); setSelectedCard(null); }}
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
                      {isViewOnly ? "Detalhes da Atividade" : selectedCard.id ? "Editar Card" : "Novo Card"}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setIsCardModalOpen(false); setSelectedCard(null); }}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título *</label>
                    <input
                      required
                      disabled={isViewOnly}
                      type="text"
                      placeholder="Ex: Criar banner de Dia dos Pais"
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
                      value={selectedCard.title || ""}
                      onChange={(e) => setSelectedCard({ ...selectedCard, title: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição / Tarefas</label>
                    <textarea
                      rows={3}
                      disabled={isViewOnly}
                      placeholder="Detalhes, links de referências ou roteiros..."
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                      value={selectedCard.description || ""}
                      onChange={(e) => setSelectedCard({ ...selectedCard, description: e.target.value })}
                    />
                  </div>

                  {/* Responsável */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsável</label>
                    <select
                      disabled={isViewOnly}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none disabled:opacity-75 disabled:cursor-not-allowed"
                      value={getCardResponsible(selectedCard.created_by_name)}
                      onChange={(e) => setSelectedCard({ ...selectedCard, created_by_name: e.target.value })}
                    >
                      <option value="">Selecione o responsável...</option>
                      {usersList.map((user) => (
                        <option key={user.id} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prazo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prazo</label>
                    <input
                      type="date"
                      disabled={isViewOnly}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                      value={selectedCard.due_date ? selectedCard.due_date.split("T")[0] : ""}
                      onChange={(e) => setSelectedCard({ ...selectedCard, due_date: e.target.value || undefined })}
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Prioridade</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {TAG_OPTIONS.map(opt => {
                        const isSelected = selectedCard.tag_name === opt.name;
                        return (
                          <button
                            key={opt.name}
                            type="button"
                            disabled={isViewOnly}
                            onClick={() => {
                              if (isViewOnly) return;
                              setSelectedCard({
                                ...selectedCard,
                                tag_name: isSelected ? "" : opt.name,
                                tag_color: isSelected ? "" : opt.color
                              });
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1.5 ${opt.color} ${
                              isSelected ? "ring-2 ring-primary/40 font-black" : "opacity-75"
                            } disabled:cursor-not-allowed`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex gap-3">
                  {isViewOnly ? (
                    <button
                      onClick={() => { setIsCardModalOpen(false); setSelectedCard(null); }}
                      className="w-full py-3 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs rounded-2xl border border-border transition-all flex items-center justify-center"
                    >
                      Fechar
                    </button>
                  ) : (
                    <>
                      {selectedCard.id && (
                        <button
                          type="button"
                          onClick={() => deleteCard(selectedCard.id!)}
                          className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-2xl border border-red-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      )}
                      <button
                        onClick={() => { setIsCardModalOpen(false); setSelectedCard(null); }}
                        className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs rounded-2xl border border-border transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveCard(selectedCard)}
                        disabled={saving || !selectedCard.title?.trim()}
                        className="flex-1 py-3 bg-primary text-primary-foreground font-black text-xs rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "Salvando..." : "Salvar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.3); }
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1rem;
        }
      `}</style>
    </div>
  );
}
