import { useState, useRef, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSelectOption {
  label: string;
  value: string;
  group?: string;
}

interface SearchSelectProps {
  value: string;
  options: SearchSelectOption[];
  onChange: (value: string) => void;
  icon: LucideIcon;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export function SearchSelect({
  value,
  options,
  onChange,
  icon: Icon,
  placeholder = "Buscar...",
  emptyLabel = "Nada encontrado",
  className
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const groups: { name: string; items: SearchSelectOption[] }[] = [];
  for (const opt of filtered) {
    const groupName = opt.group || "";
    let group = groups.find(g => g.name === groupName);
    if (!group) {
      group = { name: groupName, items: [] };
      groups.push(group);
    }
    group.items.push(opt);
  }

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <div
        onClick={() => { setIsOpen(true); setQuery(""); inputRef.current?.focus(); }}
        className={cn(
          "h-10 px-4 rounded-xl border flex items-center gap-2 w-full cursor-text transition-all",
          isOpen ? "border-blue-500/50 ring-4 ring-blue-500/10 bg-card" : "bg-secondary/30 border-border hover:border-slate-300 dark:hover:border-slate-700"
        )}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 opacity-40" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : (selected?.label || "")}
          onFocus={() => { setIsOpen(true); setQuery(""); }}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder={isOpen ? placeholder : selected?.label}
          className="flex-1 min-w-0 bg-transparent outline-none text-[10px] font-black uppercase tracking-tight text-foreground placeholder:text-muted-foreground placeholder:font-black"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[12rem] bg-card border border-border rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
            {groups.map((group) => (
              <div key={group.name || "_root"}>
                {group.name && (
                  <div className="px-4 pt-2 pb-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/20 mb-1 first:mt-0 mt-2">
                    {group.name}
                  </div>
                )}
                {group.items.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <button
                      key={opt.value || `${group.name}-empty`}
                      type="button"
                      onClick={() => { onChange(opt.value); setIsOpen(false); setQuery(""); }}
                      className={cn(
                        "w-full px-4 py-2.5 text-[10px] font-bold text-left transition-all uppercase tracking-tighter flex items-center justify-between",
                        isSelected ? "bg-secondary text-foreground" : "text-muted-foreground",
                        "hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                      )}
                    >
                      {opt.label}
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{emptyLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
