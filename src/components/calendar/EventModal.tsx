import { X, Calendar as CalendarIcon, Tag } from "lucide-react";
import { Button } from "../ui/button";
import { TinyDropdown } from "../ui/TinyDropdown";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: (id: number) => void;
  selectedDay: number | null;
  editingEventId: number | null;
  newEvent: {
    title: string;
    description: string;
    type: "birthday" | "star" | "education" | "video" | "holiday" | "meeting" | "celebration" | "finance" | "important" | "launch";
  };
  setNewEvent: (event: EventModalProps["newEvent"]) => void;
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedDay,
  editingEventId,
  newEvent,
  setNewEvent
}: EventModalProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div 
            onClick={onClose}
            className="absolute inset-0"
          />
          <div 
            className="relative w-full max-w-lg bg-white rounded-2xl p-8 shadow-2xl border border-slate-200 overflow-visible"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative">
              <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                      <CalendarIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        {editingEventId ? "Editar Evento" : "Novo Evento"}
                    </h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        {selectedDay} de Abril, 2026
                    </p>
                  </div>
              </div>

              <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Título do Evento</label>
                    <input 
                        type="text" 
                        placeholder="Ex: Entrega de Veículo..."
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Descrição Detalhada</label>
                    <textarea 
                        placeholder="Descreva os detalhes importantes..."
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all resize-none placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Categoria</label>
                    <TinyDropdown 
                        value={newEvent.type}
                        options={[
                            { value: "meeting", label: "Reunião Geral" },
                            { value: "celebration", label: "Meta Batida / Festa" },
                            { value: "finance", label: "Pagamento / Financeiro" },
                            { value: "important", label: "Urgente / Importante" },
                            { value: "launch", label: "Lançamento / Novidade" },
                            { value: "education", label: "Treinamento Técnico" },
                            { value: "birthday", label: "Aniversário" },
                            { value: "star", label: "Destaque Especial" },
                            { value: "holiday", label: "Feriado Nacional/Local" },
                            { value: "video", label: "Gravar Vídeo" }
                        ]}
                        onChange={(val) => setNewEvent({...newEvent, type: val as EventModalProps["newEvent"]["type"]})}
                        icon={Tag}
                        variant="blue"
                        className="w-full"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {editingEventId && (
                      <Button 
                        onClick={() => onDelete(editingEventId)}
                        variant="ghost"
                        className="h-12 px-6 border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                      >
                        Excluir
                      </Button>
                    )}
                    <Button 
                      onClick={onSave}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                    >
                      {editingEventId ? "Salvar Alterações" : "Adicionar ao Calendário"}
                    </Button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
