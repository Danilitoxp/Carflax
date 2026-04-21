import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption {
  label: string;
  value: string;
}

interface TinyDropdownProps {
  value: string;
  options: (string | DropdownOption)[];
  onChange: (value: string) => void;
  icon: LucideIcon;
  variant?: "blue" | "amber" | "emerald" | "slate";
  className?: string;
  placeholder?: string;
}

export function TinyDropdown({
  value,
  options,
  onChange,
  icon: Icon,
  variant = "slate",
  className,
  placeholder
}: TinyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variants = {
    blue: {
      active: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400",
      hover: "hover:bg-blue-100/50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400",
      itemHover: "hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400",
      dot: "bg-blue-600 dark:bg-blue-400"
    },
    amber: {
      active: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400",
      hover: "hover:bg-amber-100/50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400",
      itemHover: "hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400",
      dot: "bg-amber-600 dark:bg-amber-400"
    },
    emerald: {
      active: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400",
      hover: "hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400",
      itemHover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400",
      dot: "bg-emerald-600 dark:bg-emerald-400"
    },
    slate: {
      active: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-foreground",
      hover: "hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-foreground",
      itemHover: "hover:bg-secondary hover:text-foreground",
      dot: "bg-slate-600 dark:bg-slate-400"
    }
  };

  const currentVariant = variants[variant];
  
  const getLabel = (val: string) => {
    const opt = options.find(o => typeof o === 'string' ? o === val : o.value === val);
    return opt ? (typeof opt === 'string' ? opt : opt.label) : val;
  };

  const isActive = value !== placeholder && (typeof options[0] === 'string' ? value !== options[0] : value !== options[0].value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      // Se for uma letra ou número
      if (event.key.length === 1) {
        const char = event.key.toLowerCase();
        const found = options.find(o => {
          const label = typeof o === 'string' ? o : o.label;
          return label.toLowerCase().startsWith(char);
        });

        if (found) {
          const val = typeof found === 'string' ? found : found.value;
          onChange(val);
          // Opcional: manter aberto ou fechar. Vou manter aberto para o usuário ver o que selecionou.
        }
      }

      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "Enter") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, options, onChange]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 transition-all outline-none w-full",
          isActive ? currentVariant.active : "bg-card border-border text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 shadow-sm",
          isOpen && "ring-4 ring-blue-500/10 border-blue-500/50"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "opacity-100" : "opacity-40")} />
        <span className="truncate flex-1 text-left">{value ? getLabel(value) : placeholder}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300 opacity-40 shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[12rem] bg-card border border-border rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
            {options.map((option) => {
              const optLabel = typeof option === 'string' ? option : option.label;
              const optValue = typeof option === 'string' ? option : option.value;
              const isSelected = value === optValue;

              return (
                <button
                  key={optValue}
                  type="button"
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-[10px] font-bold text-left transition-all uppercase tracking-tighter flex items-center justify-between",
                    isSelected ? "bg-secondary text-foreground" : "text-muted-foreground",
                    currentVariant.itemHover
                  )}
                >
                  {optLabel}
                  {isSelected && (
                    <div className={cn("w-1.5 h-1.5 rounded-full", currentVariant.dot)} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
