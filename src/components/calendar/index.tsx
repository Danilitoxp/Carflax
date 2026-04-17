import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Gift, 
  Star, 
  GraduationCap,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventModal } from "./EventModal";
import { EventsView } from "./Eventos/EventsView";
import { VacationsView } from "./Ferias/VacationsView";
import { VacationModal } from "./Ferias/VacationModal";

interface CalendarEvent {
  id: number;
  day: number;
  title: string;
  type: "birthday" | "star" | "education" | "video";
  description?: string;
  month?: number;
  year?: number;
}

interface Vacation {
  id: number;
  name: string;
  start: Date;
  end: Date;
  color: string;
  avatar: string;
}

interface CalendarSectionProps {
  activeTab?: string;
}

export function CalendarSection({ activeTab }: CalendarSectionProps) {
  const [viewMode, setViewMode] = useState<"events" | "vacations">("events");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Abril 2026
  const [activeFilters, setActiveFilters] = useState<string[]>(["birthday", "star", "education", "video"]);
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: 1, day: 1, month: 3, year: 2026, title: "Daniel Duarte 2 anos...", type: "star" },
    { id: 2, day: 7, month: 3, year: 2026, title: "João Pedro", type: "birthday" },
    { id: 3, day: 10, month: 3, year: 2026, title: "Mateus Ronald", type: "birthday" },
    { id: 4, day: 22, month: 3, year: 2026, title: "BLUKIT", type: "education" },
    { id: 5, day: 23, month: 3, year: 2026, title: "Alan Henrique 1 ano d...", type: "star" },
  ]);

  const [vacations, setVacations] = useState<Vacation[]>([
    { id: 1, name: "Mateus Ronald", start: new Date(2026, 3, 5), end: new Date(2026, 3, 18), color: "bg-orange-500", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mateus" },
    { id: 2, name: "Guilherme Santana", start: new Date(2026, 3, 1), end: new Date(2026, 3, 4), color: "bg-blue-600", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guilherme" },
    { id: 3, name: "Tatiane Maria", start: new Date(2026, 3, 20), end: new Date(2026, 3, 26), color: "bg-emerald-600", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tatiane" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    type: "video" as const
  });

  const handleSaveVacation = (newVacation: { name: string; start: Date; end: Date; color: string; avatar: string }) => {
    const vacation: Vacation = {
      id: Date.now(),
      ...newVacation
    };
    setVacations([...vacations, vacation]);
  };

  useEffect(() => {
    if (activeTab === "Férias") {
      setViewMode("vacations");
    } else {
      setViewMode("events");
    }
  }, [activeTab]);

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
      if (prev.length === 1 && prev.includes(filter)) {
        return ["birthday", "star", "education", "video"];
      }
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
    if (!day || viewMode === "vacations") return;
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

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

      {/* Header Area */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-card border border-border/50 rounded-2xl px-6 py-3 shadow-none">
            <span className="text-xl font-black text-foreground uppercase tracking-tighter">
                {monthNames[month]} <span className="text-primary">{year}</span>
            </span>
            <div className="flex items-center gap-1.5 ml-6 pl-6 border-l border-border/50">
               <button onClick={handlePrevMonth} className="p-2 hover:bg-secondary rounded-xl transition-all text-muted-foreground/60 hover:text-foreground active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
               <button onClick={handleNextMonth} className="p-2 hover:bg-secondary rounded-xl transition-all text-muted-foreground/60 hover:text-foreground active:scale-90"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          
          {viewMode === "events" && (
            <div className="flex items-center gap-1.5 bg-card border border-border/50 p-1.5 rounded-2xl shadow-none">
              {[
                { id: "birthday", icon: Gift, color: "text-rose-500", bg: "bg-rose-500/10" },
                { id: "star", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
                { id: "education", icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                { id: "video", icon: Plus, color: "text-primary", bg: "bg-primary/10" },
              ].map(f => (
                <button 
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  className={cn(
                      "p-2.5 rounded-xl transition-all",
                      activeFilters.length === 1 && activeFilters.includes(f.id) ? cn(f.bg, f.color) : "text-muted-foreground/60 hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <f.icon className="w-4.5 h-4.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {viewMode === "vacations" && (
              <button 
                onClick={() => setIsVacationModalOpen(true)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all border border-white/10"
              >
                <Plus className="w-4 h-4" />
                Lançar Férias
              </button>
          )}
        </div>
      </div>

      <VacationModal 
        isOpen={isVacationModalOpen} 
        onClose={() => setIsVacationModalOpen(false)}
        onSave={handleSaveVacation}
      />

      {/* Calendar Grid */}
      <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] overflow-hidden flex flex-col shadow-none min-h-0 relative">
        <div className="grid grid-cols-7 border-b border-border/10 bg-secondary/5">
          {daysOfWeek.map((day) => (
            <div key={day} className={cn(
              "py-6 text-center last:border-r-0",
              viewMode === "events" ? "border-r border-border/10" : "border-transparent"
            )}>
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em]">{day}</span>
            </div>
          ))}
        </div>

        <div 
          className={cn(
            "flex-1 grid grid-cols-7 transition-all duration-700 min-h-0",
            viewMode === "events" ? "divide-x divide-y divide-border/5" : "divide-transparent"
          )}
          style={{ 
            gridTemplateRows: `repeat(${Math.ceil(allSlots.length / 7)}, 1fr)` 
          }}
        >
          {allSlots.map((day, idx) => {
            const isToday = day === new Date().getDate() && 
                            month === new Date().getMonth() && 
                            year === new Date().getFullYear();
            
            const dayDate = day ? new Date(year, month, day) : null;
            
            return (
              <div 
                key={idx} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative group transition-all duration-500 cursor-pointer flex flex-col p-4 overflow-hidden",
                  viewMode === "events" && "hover:bg-primary/[0.02]",
                  viewMode === "events" && isToday && "bg-primary/[0.04]",
                  !day && "bg-secondary/[0.03] opacity-40 shadow-inner"
                )}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-start mb-3 relative z-20">
                      <span className={cn(
                        "text-xs md:text-base font-black transition-all duration-500 leading-none",
                        isToday ? "text-[#0053FC] scale-125 origin-left" : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
                      )}>
                        {day < 10 ? `0${day}` : day}
                      </span>
                      {isToday && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    
                    {viewMode === "events" ? (
                      <EventsView 
                        day={day}
                        month={month}
                        year={year}
                        events={events}
                        activeFilters={activeFilters}
                        onEventClick={handleEventClick}
                      />
                    ) : (
                      <VacationsView 
                        dayDate={dayDate}
                        vacations={vacations}
                      />
                    )}
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
