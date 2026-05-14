import React from "react";
import { Calendar, Video, BookOpen, Clock, CheckCircle2, ChevronRight, Plus, Filter, Pencil, Trash2, X, Link, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleItem {
  id: string;
  type: "story" | "video";
  title: string;
  description: string;
  time?: string;
  completed?: boolean;
  instructions?: {
    image?: string;
    title?: string;
    subtitle?: string;
    script?: string;
    postTitle?: string;
    tags?: string[];
  };
}

interface DaySchedule {
  day: string;
  date: string;
  items: ScheduleItem[];
}

const WHATSAPP_LINK = "https://wa.me/5511949470025?text=Ol%C3%A1%2C%20vim%20do%20instagram";

const getWeekDates = () => {
  const start = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 0); // Segunda-feira
  return Array.from({ length: 5 }, (_, i) => {
    const d = addDays(start, i);
    return {
      day: format(d, "eeee", { locale: ptBR }),
      date: format(d, "dd 'de' MMM", { locale: ptBR }),
      isoDate: format(d, "yyyy-MM-dd")
    };
  });
};

const weekDates = getWeekDates();

const initialScheduleData: DaySchedule[] = weekDates.map(d => ({
  day: d.day.charAt(0).toUpperCase() + d.day.slice(1),
  date: d.date,
  items: []
}));

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_IA || "");

export function CronogramaView() {
  const [data, setData] = React.useState<DaySchedule[]>(initialScheduleData);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<{ dayIdx: number; item: Partial<ScheduleItem> } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data: dbData, error } = await supabase
      .from("marketing_schedule")
      .select("*")
      .order("post_time", { ascending: true });

    if (error) {
      console.error("Erro ao buscar cronograma:", error);
      return;
    }

    if (dbData) {
      const newData = initialScheduleData.map(day => {
        const matchingDay = weekDates.find(wd => wd.day.toLowerCase() === day.day.toLowerCase());
        const dayItems = dbData
          .filter(item => item.post_date === matchingDay?.isoDate)
          .map(item => ({
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            time: item.post_time,
            completed: item.completed,
            instructions: item.instructions
          }));
        return { ...day, items: dayItems };
      });
      setData(newData);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(WHATSAPP_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateWithIA = async () => {
    if (confirm("Isso irá limpar o cronograma atual e gerar um novo com IA real. Deseja continuar?")) {
      setIsGenerating(true);
      
      try {
        // Limpar no Supabase primeiro
        const dates = weekDates.map(w => w.isoDate);
        await supabase.from("marketing_schedule").delete().in("post_date", dates);
        setData(initialScheduleData); 
        
        // Buscar eventos do calendário para as datas da semana atual
        const monthFilter = new Date().getMonth() + 1;
        const yearFilter = new Date().getFullYear();
        const { data: eventsData } = await supabase
          .from("eventos_calendario")
          .select("*")
          .eq("month", monthFilter)
          .eq("year", yearFilter)
          .neq("type", "birthday");

        let eventsContext = "";
        if (eventsData && eventsData.length > 0) {
          const weekDays = weekDates.map(w => parseInt(w.isoDate.split('-')[2], 10));
          const weekEvents = eventsData.filter(e => weekDays.includes(e.day));
          
          if (weekEvents.length > 0) {
            eventsContext = `\nEVENTOS DA SEMANA NO CALENDÁRIO DA EMPRESA (Tente incluir na temática de algum post):\n` + 
              weekEvents.map(e => `- Dia ${e.day}: ${e.title} (${e.description || e.type})`).join("\n");
          }
        }

        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash-lite",
          generationConfig: { responseMimeType: "application/json" }
        });
        const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
        
        const prompt = `
          Atue como um Social Media Manager Sênior focado em empresas de varejo técnico (hidráulica e elétrica).
          Gere um cronograma semanal de conteúdo para a Carflax focado na ROTINA real da empresa.
          MÊS ATUAL: ${currentMonthName.toUpperCase()}. O clima e as necessidades dos clientes refletem esse período do ano no Brasil.
          ${eventsContext}
          
          REGRAS DE TEMAS (DIVERSIFIQUE OBRIGATORIAMENTE):
          - NÃO fale apenas de logística/expedição. A semana deve ser muito variada.
          - Inclua pelo menos 2 posts sobre: Vendedores atendendo no balcão (consultoria, tirando dúvidas técnicas).
          - Inclua pelo menos 2 posts focados em: Um produto específico e estratégico considerando a sazonalidade.
          - Inclua também: Logística, organização de estoque e frota de entregas.
          
          DISTRIBUIÇÃO OBRIGATÓRIA (EXATAMENTE 12 ITENS, um objeto para cada post):
          - dayIdx: 0 (Segunda-feira): 2 itens (ambos "type": "story", 10h e 15h)
          - dayIdx: 1 (Terça-feira): 3 itens (2 "type": "story" às 10h/15h e 1 "type": "video" às 12h)
          - dayIdx: 2 (Quarta-feira): 2 itens (ambos "type": "story", 10h e 15h)
          - dayIdx: 3 (Quinta-feira): 3 itens (2 "type": "story" às 10h/15h e 1 "type": "video" às 13h)
          - dayIdx: 4 (Sexta-feira): 2 itens (ambos "type": "story", 10h e 15h)
          
          REQUISITOS PARA VÍDEOS:
          - O "script" deve ser um roteiro detalhado dividido por cenas (ex: Cena 1: 0-5s...).
          
          FORMATO DE SAÍDA:
          Retorne um array JSON com exatamente 12 objetos, neste exato formato:
          [{
            "dayIdx": number,
            "item": {
              "type": "story" | "video",
              "title": "Título do Card",
              "description": "Breve descrição do post",
              "post_time": "HH:MM",
              "instructions": {
                "image": "Descrição da foto (story)",
                "title": "Título visual (story)",
                "subtitle": "Frase de efeito (story)",
                "script": "ROTEIRO DETALHADO POR CENAS (vídeo)"
              }
            }
          }]

        `;


        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Limpa possíveis marcações de markdown do JSON
        const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const generatedItems = JSON.parse(cleanedJson);

        for (const gen of generatedItems) {
          await new Promise(resolve => setTimeout(resolve, 400));
          
          let targetDayIdx = parseInt(gen.dayIdx, 10);
          if (isNaN(targetDayIdx) || targetDayIdx < 0 || targetDayIdx > 4) targetDayIdx = 0; // Fallback seguro
          
          const postDate = weekDates[targetDayIdx].isoDate;
          const { data: inserted, error } = await supabase
            .from("marketing_schedule")
            .insert([{ ...gen.item, post_date: postDate }])
            .select()
            .single();

          if (error) continue;

          const newItem: ScheduleItem = {
            id: inserted.id,
            type: inserted.type,
            title: inserted.title,
            description: inserted.description,
            time: inserted.post_time,
            completed: inserted.completed,
            instructions: inserted.instructions
          };

          setData(prev => prev.map((day, dIdx) => {
            if (dIdx !== targetDayIdx) return day;
            return { ...day, items: [...day.items, newItem] };
          }));
        }
      } catch (err) {
        console.error("Erro na geração IA:", err);
        alert("Houve um erro ao gerar com IA. Verifique sua chave API.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const toggleComplete = async (dayIdx: number, itemId: string) => {
    const item = data[dayIdx].items.find(i => i.id === itemId);
    if (!item) return;

    const { error } = await supabase
      .from("marketing_schedule")
      .update({ completed: !item.completed })
      .eq("id", itemId);

    if (!error) {
      setData(prev => prev.map((day, dIdx) => {
        if (dIdx !== dayIdx) return day;
        return {
          ...day,
          items: day.items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
        };
      }));
    }
  };

  const handleDelete = async (dayIdx: number, itemId: string) => {
    if (confirm("Deseja realmente excluir este post?")) {
      const { error } = await supabase
        .from("marketing_schedule")
        .delete()
        .eq("id", itemId);

      if (!error) {
        setData(prev => prev.map((day, dIdx) => {
          if (dIdx !== dayIdx) return day;
          return {
            ...day,
            items: day.items.filter(item => item.id !== itemId)
          };
        }));
      }
    }
  };

  const openAddModal = (dayIdx: number) => {
    setEditingItem({ 
      dayIdx, 
      item: { type: "story", time: "10:00", completed: false } 
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (dayIdx: number, item: ScheduleItem) => {
    setEditingItem({ dayIdx, item });
    setIsEditModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { dayIdx, item } = editingItem;
    const postDate = weekDates[dayIdx].isoDate;
    
    const dbItem = {
      type: item.type,
      title: item.title,
      description: item.description,
      post_time: item.time,
      post_date: postDate,
      completed: item.completed || false,
      instructions: item.instructions || {}
    };

    let result;
    if (item.id) {
      result = await supabase.from("marketing_schedule").update(dbItem).eq("id", item.id).select().single();
    } else {
      result = await supabase.from("marketing_schedule").insert([dbItem]).select().single();
    }

    if (!result.error && result.data) {
      const savedItem: ScheduleItem = {
        id: result.data.id,
        type: result.data.type,
        title: result.data.title,
        description: result.data.description,
        time: result.data.post_time,
        completed: result.data.completed,
        instructions: result.data.instructions
      };

      setData(prev => prev.map((day, dIdx) => {
        if (dIdx !== dayIdx) return day;
        if (item.id) {
          return { ...day, items: day.items.map(i => i.id === item.id ? savedItem : i) };
        } else {
          return { ...day, items: [...day.items, savedItem] };
        }
      }));
    }
    
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground p-6 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Cronograma de Conteúdo
          </h2>
          <p className="text-muted-foreground font-medium">Estratégia semanal para Hidráulica & Elétrica</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-all border border-border text-sm font-semibold text-foreground">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Filtros
          </button>
          <button 
            onClick={handleGenerateWithIA}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl transition-all text-sm font-bold shadow-lg shadow-primary/20 ${isGenerating ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-pulse" : ""}`} />
            {isGenerating ? "Gerando..." : "Criar com IA"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {data.map((day, dayIdx) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIdx * 0.1 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="font-bold text-foreground">{day.day}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{day.date}</p>
                </div>
                {dayIdx === 0 && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded-full border border-primary/30 uppercase">Hoje</span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {day.items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-2xl border ${
                      item.type === "video" 
                        ? "bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-500/5" 
                        : "bg-card border-border hover:border-primary/30"
                    } transition-all relative group`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${
                        item.type === "video" ? "bg-indigo-500/20 text-indigo-500" : "bg-primary/20 text-primary"
                      }`}>
                        {item.type === "video" ? <Video className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openEditModal(dayIdx, item)}
                          className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDelete(dayIdx, item.id)}
                          className="p-1 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground ml-1">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </div>
                      </div>
                    </div>

                    <h4 className={`text-sm font-bold mb-1 leading-tight ${item.completed ? "text-muted-foreground line-through opacity-50" : "text-foreground"}`}>
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedItem(item)}
                          className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          Ver detalhes <ChevronRight className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={handleCopyLink}
                          title="Copiar Link WhatsApp"
                          className="p-1 hover:bg-green-500/10 rounded-md text-muted-foreground hover:text-green-500 transition-colors"
                        >
                          <Link className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => toggleComplete(dayIdx, item.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          item.completed ? "bg-green-500 border-green-500 text-white" : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        {item.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    
                    {item.completed && (
                      <div className="absolute inset-0 bg-background/40 rounded-2xl pointer-events-none" />
                    )}
                  </motion.div>
                ))}

                <button 
                  onClick={() => openAddModal(dayIdx)}
                  className="w-full py-3 rounded-2xl border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary flex items-center justify-center transition-all group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
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
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedItem.type === "video" ? "bg-indigo-500/20 text-indigo-500" : "bg-primary/20 text-primary"
                  }`}>
                    {selectedItem.type === "story" ? "Instruções do Story" : "Detalhes do Vídeo"}
                  </div>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-muted-foreground" />
                  </button>
                </div>

                <h3 className="text-xl font-black mb-1 uppercase tracking-tight">{selectedItem.title}</h3>
                <p className="text-sm text-muted-foreground mb-8">{selectedItem.description}</p>
                
                <div className="space-y-6">
                  {selectedItem.type === "story" ? (
                    <>
                      <div className="p-4 bg-secondary/50 rounded-2xl border border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Imagem</span>
                        <p className="text-sm font-medium leading-relaxed">{selectedItem.instructions?.image}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-secondary/50 rounded-2xl border border-border/50">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Título</span>
                          <p className="text-sm font-bold leading-tight">"{selectedItem.instructions?.title}"</p>
                        </div>
                        <div className="p-4 bg-secondary/50 rounded-2xl border border-border/50">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Subtítulo</span>
                          <p className="text-xs font-medium text-muted-foreground leading-snug">"{selectedItem.instructions?.subtitle}"</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-5 bg-secondary/50 rounded-2xl border border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-3">🎬 Roteiro Detalhado</span>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{selectedItem.instructions?.script || "Roteiro padrão de rotina Carflax."}</p>
                      </div>
                    </>
                  )}

                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 flex items-center gap-3">
                    <div className="flex-1 overflow-hidden">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Link WhatsApp</span>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">{WHATSAPP_LINK}</p>
                    </div>
                    <button 
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-card text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl border border-border hover:bg-secondary transition-all flex items-center gap-2"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Link className="w-3 h-3" />}
                      {copied ? "Copiado" : "Copiar Link"}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-full mt-8 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSaveItem} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">
                    {editingItem.item.id ? "Editar Post" : "Novo Post"}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Conteúdo</label>
                      <select 
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                        value={editingItem.item.type}
                        onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, type: e.target.value as any } })}
                      >
                        <option value="story">Story</option>
                        <option value="video">Vídeo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Horário</label>
                      <input 
                        type="time"
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        value={editingItem.item.time}
                        onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, time: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título Principal</label>
                    <input 
                      required
                      placeholder="Ex: Dica de Manutenção"
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={editingItem.item.title || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, title: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição / Objetivo</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Descreva o que deve ser abordado..."
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      value={editingItem.item.description || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, description: e.target.value } })}
                    />
                  </div>

                  {editingItem.item.type === "story" && (
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Instruções Visuais</span>
                      <div className="space-y-3">
                        <input 
                          placeholder="Instrução da Imagem/Foto"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                          value={editingItem.item.instructions?.image || ""}
                          onChange={(e) => setEditingItem({ 
                            ...editingItem, 
                            item: { 
                              ...editingItem.item, 
                              instructions: { ...(editingItem.item.instructions || { title: "", subtitle: "" }), image: e.target.value } 
                            } 
                          })}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            placeholder="Texto Título"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            value={editingItem.item.instructions?.title || ""}
                            onChange={(e) => setEditingItem({ 
                              ...editingItem, 
                              item: { 
                                ...editingItem.item, 
                                instructions: { ...(editingItem.item.instructions || { image: "", subtitle: "" }), title: e.target.value } 
                              } 
                            })}
                          />
                          <input 
                            placeholder="Texto Subtítulo"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            value={editingItem.item.instructions?.subtitle || ""}
                            onChange={(e) => setEditingItem({ 
                              ...editingItem, 
                              item: { 
                                ...editingItem.item, 
                                instructions: { ...(editingItem.item.instructions || { image: "", title: "" }), subtitle: e.target.value } 
                              } 
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-10 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-secondary text-foreground font-black uppercase tracking-widest rounded-2xl hover:bg-secondary/80 transition-all border border-border"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    Salvar Post
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.4);
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
