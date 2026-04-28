import { useState } from "react";
import { 
  X, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Vacation {
  id?: number;
  name: string;
  start: Date;
  end: Date;
  color: string;
  avatar: string;
}

interface VacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vacation: Vacation) => void;
  onDelete?: (id: number) => void;
  editingVacation?: Vacation | null;
  employees: { name: string; avatar?: string }[];
  vacations: Vacation[];
  canManage?: boolean;
}

export function VacationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  editingVacation, 
  employees,
  vacations,
  canManage = true
}: VacationModalProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-orange-500");

  const [prevEditingVacation, setPrevEditingVacation] = useState(editingVacation);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (editingVacation !== prevEditingVacation || isOpen !== prevIsOpen) {
    setPrevEditingVacation(editingVacation);
    setPrevIsOpen(isOpen);

    if (isOpen) {
      if (editingVacation) {
        setName(editingVacation.name);
        setSelectedColor(editingVacation.color);
        const s = editingVacation.start;
        const e = editingVacation.end;
        if (s instanceof Date && !isNaN(s.getTime())) {
          setStart(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`);
        }
        if (e instanceof Date && !isNaN(e.getTime())) {
          setEnd(`${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`);
        }
      } else {
        setName("");
        setStart("");
        setEnd("");
        setSelectedColor("bg-orange-500");
      }
    }
  }

  const colors = [
    { name: "Laranja", class: "bg-orange-500" },
    { name: "Azul", class: "bg-blue-600" },
    { name: "Verde", class: "bg-emerald-600" },
    { name: "Roxo", class: "bg-violet-600" },
    { name: "Rosa", class: "bg-rose-500" },
    { name: "Ciano", class: "bg-cyan-500" },
    { name: "Âmbar", class: "bg-amber-500" },
    { name: "Slate", class: "bg-slate-600" },
    { name: "Indigo", class: "bg-indigo-600" },
    { name: "Teal", class: "bg-teal-600" },
  ];

  if (!isOpen) return null;

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!editingVacation) {
      // Tenta encontrar uma cor já usada por este funcionário em outros lançamentos
      const existingColor = vacations.find(v => v.name === newName)?.color;
      if (existingColor) {
        setSelectedColor(existingColor);
      } else {
        // Se não encontrar, pega uma cor que esteja sendo "menos usada" no momento
        const colorUsage: Record<string, number> = {};
        colors.forEach(c => colorUsage[c.class] = 0);
        vacations.forEach(v => {
          if (colorUsage[v.color] !== undefined) colorUsage[v.color]++;
        });
        
        const sortedColors = [...colors].sort((a, b) => colorUsage[a.class] - colorUsage[b.class]);
        setSelectedColor(sortedColors[0].class);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !start || !end) return;

    const [yrS, moS, dyS] = start.split('-').map(Number);
    const [yrE, moE, dyE] = end.split('-').map(Number);

    const emp = employees.find(e => e.name === name);

    onSave({
      id: editingVacation?.id,
      name,
      start: new Date(yrS, moS - 1, dyS),
      end: new Date(yrE, moE - 1, dyE),
      color: selectedColor,
      avatar: emp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-card rounded-2xl p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-border overflow-hidden text-left">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-foreground uppercase tracking-tight">
                  {editingVacation ? "Editar Férias" : "Lançar Férias"}
                </h3>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Gestão de Ausências</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Funcionário
              </label>
              <select 
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all"
                required
              >
                <option value="" className="dark:bg-slate-900">Selecione um colaborador</option>
                {employees.map((emp, i) => (
                  <option key={i} value={emp.name} className="dark:bg-slate-900">{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Início
                </label>
                <input 
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all font-sans"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Fim
                </label>
                <input 
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all font-sans"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
                Identificação Visual
              </label>
              <div className="flex flex-wrap gap-2.5 gap-y-3">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedColor(c.class)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all relative flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800",
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

          <div className="flex flex-col gap-3 pt-4">
            <div className="flex gap-3">
              <Button 
                type="button"
                variant="ghost" 
                onClick={onClose}
                className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
              >
                {canManage ? "Cancelar" : "Fechar"}
              </Button>
              {canManage && (
                <Button 
                  type="submit"
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98]"
                >
                  {editingVacation ? "Salvar Alterações" : "Confirmar Lançamento"}
                </Button>
              )}
            </div>
            
            {editingVacation && onDelete && canManage && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Tem certeza que deseja excluir este lançamento de férias?")) {
                    if (editingVacation.id !== undefined) {
                      onDelete(editingVacation.id);
                    }
                    onClose();
                  }
                }}
                className="text-[9px] font-bold text-rose-500 uppercase tracking-[0.2em] hover:text-rose-600 transition-colors p-2"
              >
                Excluir Lançamento
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
