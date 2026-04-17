import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Gift, 
  Star, 
  GraduationCap,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventModal } from "./EventModal";

interface CalendarEvent {
  id: number;
  day: number;
  title: string;
  type: "birthday" | "star" | "education" | "video";
  description?: string;
  month?: number;
  year?: number;
}

export function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Abril 2026
  const [activeFilters, setActiveFilters] = useState<string[]>(["birthday", "star", "education", "video"]);
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: 1, day: 1, month: 3, year: 2026, title: "Daniel Duarte 2 anos...", type: "star" },
    { id: 2, day: 7, month: 3, year: 2026, title: "João Pedro", type: "birthday" },
    { id: 3, day: 10, month: 3, year: 2026, title: "Mateus Ronald", type: "birthday" },
    { id: 4, day: 22, month: 3, year: 2026, title: "BLUKIT", type: "education" },
    { id: 5, day: 23, month: 3, year: 2026, title: "Alan Henrique 1 ano d...", type: "star" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "video" as const
  });

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => {
      // Se clicar no mesmo filtro que já é o único ativo, volta a mostrar todos
      if (prev.length === 1 && prev.includes(filter)) {
        return ["birthday", "star", "education", "video"];
      }
      // Caso contrário, ativa apenas o filtro clicado (Exclusivo)
      return [filter];
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, () => null); 
  const allSlots = [...paddingDays, ...days];

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    setEditingEventId(null);
    setSelectedDay(day);
    setNewEvent({ title: "", description: "", type: "video" });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setSelectedDay(event.day);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      type: event.type as any
    });
    setIsModalOpen(true);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !selectedDay) return;

    if (editingEventId) {
      setEvents(events.map(e => 
        e.id === editingEventId 
          ? { ...e, ...newEvent } 
          : e
      ));
    } else {
      const event: CalendarEvent = {
          id: Date.now(),
          day: selectedDay,
          month: month,
          year: year,
          title: newEvent.title,
          description: newEvent.description,
          type: newEvent.type as any
      };
      setEvents([...events, event]);
    }

    setIsModalOpen(false);
    setEditingEventId(null);
    setNewEvent({ title: "", description: "", type: "video" });
  };

  const getEventStyles = (type: string) => {
    switch (type) {
      case "birthday": 
        return "bg-gradient-to-r from-rose-500/80 to-pink-600/80 shadow-rose-500/10 text-white backdrop-blur-sm";
      case "star": 
        return "bg-gradient-to-r from-amber-400/80 to-orange-500/80 shadow-orange-500/10 text-white backdrop-blur-sm";
      case "education": 
        return "bg-gradient-to-r from-blue-600/80 to-indigo-700/80 shadow-blue-500/10 text-white backdrop-blur-sm";
      case "video": 
        return "bg-gradient-to-r from-[#032D9C]/80 to-[#0053FC]/80 shadow-primary/10 text-white backdrop-blur-sm";
      default: 
        return "bg-secondary/80 text-foreground shadow-sm backdrop-blur-sm";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "birthday": return <Gift className="w-2.5 h-2.5" />;
      case "star": return <Star className="w-2.5 h-2.5" />;
      case "education": return <GraduationCap className="w-2.5 h-2.5" />;
      case "video": return <Plus className="w-2.5 h-2.5" />;
      default: return null;
    }
  };

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const shortDaysOfWeek = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="flex flex-col h-full bg-background p-3 md:p-6 overflow-hidden">
      
      <EventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        selectedDay={selectedDay}
        editingEventId={editingEventId}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 md:mb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-card border border-border rounded-2xl px-6 py-3 shadow-sm w-full sm:w-auto justify-center sm:justify-start min-h-[52px]">
            <span className="text-base md:text-lg font-black text-foreground uppercase tracking-tighter whitespace-nowrap">
                {monthNames[month]} {year}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-card border border-border p-1 rounded-2xl shadow-sm">
            <button 
                onClick={handlePrevMonth}
                className="p-2 md:p-2.5 hover:text-foreground text-muted-foreground hover:bg-secondary rounded-xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
                onClick={handleNextMonth}
                className="p-2 md:p-2.5 hover:text-foreground text-muted-foreground hover:bg-secondary rounded-xl transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-2xl shadow-sm">
            <button 
                onClick={() => toggleFilter("birthday")}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    activeFilters.length === 1 && activeFilters.includes("birthday") ? "bg-rose-500/20 text-rose-500" : "text-muted-foreground hover:bg-secondary"
                )}
            >
                <Gift className="w-4 h-4" />
            </button>
            <button 
                onClick={() => toggleFilter("star")}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    activeFilters.length === 1 && activeFilters.includes("star") ? "bg-amber-500/20 text-amber-500" : "text-muted-foreground hover:bg-secondary"
                )}
            >
                <Star className="w-4 h-4" />
            </button>
            <button 
                onClick={() => toggleFilter("education")}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    activeFilters.length === 1 && activeFilters.includes("education") ? "bg-indigo-500/20 text-indigo-500" : "text-muted-foreground hover:bg-secondary"
                )}
            >
                <GraduationCap className="w-4 h-4" />
            </button>
            <button 
                onClick={() => toggleFilter("video")}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    activeFilters.length === 1 && activeFilters.includes("video") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
                )}
            >
                <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 bg-card border border-border rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden flex flex-col shadow-xl min-h-0">
        <div className="grid grid-cols-7 bg-[#0053FC]">
          {daysOfWeek.map((day, i) => (
            <div key={day} className="py-2 md:py-4 text-center">
              <span className="hidden sm:inline text-[10px] md:text-[11px] font-black text-white uppercase tracking-[0.2em]">{day}</span>
              <span className="sm:hidden text-[10px] font-black text-white uppercase">{shortDaysOfWeek[i]}</span>
            </div>
          ))}
        </div>

        <div 
          className="flex-1 grid grid-cols-7 transition-all duration-500 min-h-0"
          style={{ 
            gridTemplateRows: `repeat(${Math.ceil(allSlots.length / 7)}, 1fr)` 
          }}
        >
          {allSlots.map((day, idx) => {
            const isToday = day === new Date().getDate() && 
                            month === new Date().getMonth() && 
                            year === new Date().getFullYear();
            
            const dayEvents = events.filter(e => 
                e.day === day && 
                e.month === month && 
                e.year === year &&
                activeFilters.includes(e.type)
            );
            
            return (
              <div 
                key={idx} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "p-1.5 md:p-3 relative group transition-all duration-300 cursor-pointer flex flex-col items-start gap-1 border-r border-b border-border/10 last:border-r-0 overflow-hidden",
                  "hover:bg-secondary/10",
                  isToday ? "bg-primary/5 dark:bg-primary/10" : "bg-transparent"
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      "text-[10px] md:text-sm font-black transition-colors leading-none",
                      isToday ? "text-[#0053FC]" : "text-muted-foreground/30 dark:text-muted-foreground/50"
                    )}>
                      {day < 10 ? `0${day}` : day}
                    </span>
                    
                    <div className="w-full space-y-0.5 md:space-y-1 overflow-hidden">
                      {dayEvents.map(event => (
                        <div 
                          key={event.id}
                          onClick={(e) => handleEventClick(e, event)}
                          className={cn(
                            "py-0.5 md:py-1 px-1 md:px-2 rounded-sm md:rounded-md flex items-center gap-1 shadow-sm transform group-hover:translate-x-0.5 transition-all text-left w-full",
                            getEventStyles(event.type)
                          )}
                        >
                          <div className="shrink-0 opacity-90 scale-75 md:scale-100">{getEventIcon(event.type)}</div>
                          <span className="text-[7px] md:text-[10px] font-bold truncate tracking-tight">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
