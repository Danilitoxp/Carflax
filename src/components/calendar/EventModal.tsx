import { X, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDay: number | null;
  editingEventId: number | null;
  newEvent: {
    title: string;
    description: string;
    type: "birthday" | "star" | "education" | "video";
  };
  setNewEvent: (event: EventModalProps["newEvent"]) => void;
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  selectedDay,
  editingEventId,
  newEvent,
  setNewEvent
}: EventModalProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <div 
            className="relative w-full max-w-lg bg-card/90 backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/10 overflow-hidden"
          >
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative">
              <div className="flex flex-col items-center mb-10">
                  <div className="w-16 h-16 bg-[#0053FC]/10 rounded-2xl flex items-center justify-center mb-4">
                      <CalendarIcon className="w-8 h-8 text-[#0053FC]" />
                  </div>
                  <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">
                      {editingEventId ? "Editar Evento" : "Novo Evento"}
                  </h2>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.3em] mt-1 opacity-60">
                      Abril {selectedDay}, 2026
                  </p>
              </div>

              <div className="space-y-6">
                  <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Título do Evento</label>
                  <input 
                      type="text" 
                      placeholder="Ex: Entrega de Veículo..."
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                  />
                  </div>

                  <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Descrição Detalhada</label>
                  <textarea 
                      placeholder="Descreva os detalhes importantes..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      rows={3}
                      className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
                  />
                  </div>

                  <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Categoria</label>
                  <div className="relative">
                      <select 
                          value={newEvent.type}
                          onChange={(e) => setNewEvent({...newEvent, type: e.target.value as EventModalProps["newEvent"]["type"]})}
                          className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-6 py-4 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
                      >
                          <option value="video">📹 Gravar Vídeo</option>
                          <option value="birthday">🎂 Aniversário</option>
                          <option value="star">⭐ Destaque Especial</option>
                          <option value="education">🎓 Treinamento Técnico</option>
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  </div>

                  <Button 
                  onClick={onSave}
                  className="w-full bg-gradient-to-r from-[#032D9C] to-[#0053FC] hover:shadow-xl hover:shadow-primary/20 text-white rounded-[1.2rem] py-8 font-black text-sm uppercase tracking-widest transition-all mt-6 shadow-lg shadow-primary/10"
                  >
                  {editingEventId ? "Salvar Alterações" : "Salvar Evento no Calendário"}
                  </Button>
              </div>
            </div>
            </div>
        </div>
      )}
    </>
  );
}
