import { useState } from "react";
import { 
  X, 
  Plane, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2, 
  XCircle 
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-card border border-border/50 rounded-[2.5rem] p-8 md:p-10 animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 text-muted-foreground/60 hover:text-foreground hover:bg-secondary rounded-2xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
              <Plane className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Lançar Férias
            </h3>
          </div>

          <div className="space-y-6">
            {/* Employee Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Funcionário
              </label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do colaborador"
                className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-6 py-4 text-sm font-bold focus:border-orange-500/40 outline-none transition-all"
                required
              />
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Início
                </label>
                <input 
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-6 py-4 text-sm font-bold focus:border-orange-500/40 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Fim
                </label>
                <input 
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-6 py-4 text-sm font-bold focus:border-orange-500/40 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Identificação Visual
              </label>
              <div className="flex gap-3">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedColor(c.class)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-all relative flex items-center justify-center",
                      c.class,
                      selectedColor === c.class ? "ring-4 ring-offset-4 ring-orange-500/20 scale-110" : "hover:scale-105"
                    )}
                  >
                    {selectedColor === c.class && <CheckCircle2 className="w-5 h-5 text-white/80" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="button"
              variant="ghost" 
              onClick={onClose}
              className="flex-1 py-7 bg-secondary/50 hover:bg-secondary text-foreground rounded-2xl font-black text-xs uppercase tracking-widest gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="flex-1 py-7 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-none transition-all active:scale-[0.98]"
            >
              <Plane className="w-4 h-4" />
              Confirmar Férias
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
