import { useState } from "react";
import { 
  X, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vacation: { name: string; start: Date; end: Date; color: string; avatar: string }) => void;
}

export function VacationModal({ isOpen, onClose, onSave }: VacationModalProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-orange-500");

  const colors = [
    { name: "Laranja", class: "bg-orange-500" },
    { name: "Azul", class: "bg-blue-600" },
    { name: "Verde", class: "bg-emerald-600" },
    { id: "Roxo", class: "bg-violet-600" },
    { id: "Rosa", class: "bg-rose-500" },
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !start || !end) return;

    // Parse dates manually to avoid UTC shift
    const [yrS, moS, dyS] = start.split('-').map(Number);
    const [yrE, moE, dyE] = end.split('-').map(Number);

    onSave({
      name,
      start: new Date(yrS, moS - 1, dyS),
      end: new Date(yrE, moE - 1, dyE),
      color: selectedColor,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    setName("");
    setStart("");
    setEnd("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl p-8 md:p-10 shadow-2xl border border-slate-200 overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Lançar Férias
                </h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Gestão de Ausências</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Employee Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Funcionário
              </label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do colaborador"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-slate-300"
                required
              />
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Início
                </label>
                <input 
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Fim
                </label>
                <input 
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all"
                  required
                />
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
                Identificação Visual
              </label>
              <div className="flex gap-2">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedColor(c.class)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all relative flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100",
                      c.class,
                      selectedColor === c.class ? "ring-2 ring-blue-600 scale-110" : "hover:scale-105"
                    )}
                  >
                    {selectedColor === c.class && <CheckCircle2 className="w-4 h-4 text-white/90" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button"
              variant="ghost" 
              onClick={onClose}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98]"
            >
              Confirmar Lançamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
