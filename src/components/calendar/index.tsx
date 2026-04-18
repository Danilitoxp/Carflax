import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
import { Button } from "@/components/ui/button";

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
  const [viewMode, setViewMode] = useState<"events" | "vacations">(activeTab === "Férias" ? "vacations" : "events");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Abril 2026
  const [activeFilters, setActiveFilters] = useState<string[]>(["birthday", "star", "education", "video"]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [vacations, setVacations] = useState<Vacation[]>([]);

  useEffect(() => {
    async function fetchAllData() {
      // 1. Buscar Eventos Manuais
      const { data: evData } = await supabase
        .from("eventos_calendario")
        .select("*");
      
      const manualEvents = (evData || []).map((e, i) => ({
        id: i + 1,
        day: e.day,
        month: e.month - 1,
        year: e.year,
        title: e.title,
        type: e.type as CalendarEvent["type"],
        description: e.description || "",
      }));

      // 2. Buscar Aniversários e Admissões dos Usuários
      const { data: userData } = await supabase
        .from("usuarios")
        .select("name, birth_date, admission_date")
        .or("birth_date.not.is.null,admission_date.not.is.null");

      const birthdayEvents = (userData || [])
        .filter(u => u.birth_date)
        .map((u, i) => {
          const [_, m, d] = u.birth_date.split("-");
          return {
            id: 1000 + i,
            day: parseInt(d),
            month: parseInt(m) - 1,
            year: currentDate.getFullYear(),
            title: `${u.name} 🎂`,
            type: "birthday" as const,
            description: `Aniversário de ${u.name}`,
          };
        });

      const admissionEvents = (userData || [])
        .filter(u => u.admission_date)
        .map((u, i) => {
          const [y, m, d] = u.admission_date.split("-");
          const years = currentDate.getFullYear() - parseInt(y);
          if (years <= 0) return null; // Não mostra "0 anos" no ano de entrada

          return {
            id: 2000 + i,
            day: parseInt(d),
            month: parseInt(m) - 1,
            year: currentDate.getFullYear(),
            title: `${u.name} - ${years} ${years === 1 ? 'ANO' : 'ANOS'} 🏢`,
            type: "star" as const, // Usa o estilo de 'estrela/destaque'
            description: `Aniversário de Empresa: ${years} anos de Carflax!`,
          };
        }).filter(Boolean) as CalendarEvent[];

      setEvents([...manualEvents, ...birthdayEvents, ...admissionEvents]);
    }
    fetchAllData();
  }, [currentDate.getFullYear()]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    description: string;
    type: "birthday" | "star" | "education" | "video";
  }>({
    title: "",
    description: "",
    type: "video"
  });

  const handleSaveVacation = (newVacation: { name: string; start: Date; end: Date; color: string; avatar: string }) => {
    const vacation: Vacation = {
      id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
      ...newVacation
    };
    setVacations([...vacations, vacation]);
  };

  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);

  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setViewMode(activeTab === "Férias" ? "vacations" : "events");
  }

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
  const paddingDaysStart = Array.from({ length: firstDayOfMonth }, () => null);

  // Always fill to 42 slots (6 weeks)
  const totalSlotsNeeded = 42;
  const paddingDaysEnd = Array.from({ length: totalSlotsNeeded - (paddingDaysStart.length + days.length) }, () => null);

  const allSlots = [...paddingDaysStart, ...days, ...paddingDaysEnd];

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
      type: event.type
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
        id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
        day: selectedDay,
        month: month,
        year: year,
        title: newEvent.title,
        description: newEvent.description,
        type: newEvent.type
      };
      setEvents([...events, event]);
    }

    setIsModalOpen(false);
    setEditingEventId(null);
    setNewEvent({ title: "", description: "", type: "video" });
  };

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC]">

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        selectedDay={selectedDay}
        editingEventId={editingEventId}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
      />

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 flex flex-col min-h-0 scrollbar-hide">
        {/* Header Area: Alinhado com Estilo do Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-md transition-all text-slate-400 hover:text-blue-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 text-xs font-black text-slate-900 uppercase tracking-tighter border-x border-slate-100 min-w-[120px] text-center">
                {monthNames[month]} <span className="text-blue-600">{year}</span>
              </div>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-md transition-all text-slate-400 hover:text-blue-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {viewMode === "events" && (
              <div className="flex items-center gap-1">
                {[
                  { id: "birthday", icon: Gift, label: "Aniversários", color: "rose" },
                  { id: "star", icon: Star, label: "Destaques", color: "amber" },
                  { id: "education", icon: GraduationCap, label: "Treinamentos", color: "indigo" },
                  { id: "video", icon: Plus, label: "Outros", color: "blue" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => toggleFilter(f.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
                      activeFilters.length === 1 && activeFilters.includes(f.id)
                        ? "bg-slate-100 text-slate-900 shadow-sm"
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    )}
                  >
                    <f.icon className="w-3.5 h-3.5" />
                    {activeFilters.length === 1 && activeFilters.includes(f.id) && f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {viewMode === "vacations" && (
              <Button
                onClick={() => setIsVacationModalOpen(true)}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wider group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                LANÇAR FÉRIAS
              </Button>
            )}
          </div>
        </div>

        <VacationModal
          isOpen={isVacationModalOpen}
          onClose={() => setIsVacationModalOpen(false)}
          onSave={handleSaveVacation}
        />

        {/* Calendar Grid: Limpado e Corporativo */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0 relative mt-3">
          <div className={cn(
            "grid grid-cols-7 bg-slate-50/50 border-b border-slate-100",
          )}>
            {daysOfWeek.map((day) => (
              <div key={day} className="py-2.5 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
            <div
              className={cn(
                "grid grid-cols-7 min-h-full",
              )}
              style={{
                gridTemplateRows: `repeat(6, 1fr)`
              }}
            >
              {allSlots.map((day, idx) => {
                const isToday = day === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();

                const dayDate = day ? new Date(year, month, day) : null;

                const isLastCol = (idx + 1) % 7 === 0;
                const isLastRow = idx >= 35;
                const isFirstCol = idx % 7 === 0;
                const isFirstRow = idx < 7;

                const neighborLeftHasNoDay = idx > 0 && allSlots[idx - 1] === null;
                const neighborTopHasNoDay = idx >= 7 && allSlots[idx - 7] === null;

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "relative group transition-all duration-300 cursor-pointer flex flex-col p-3",
                      day ? "bg-white" : "bg-transparent",
                      day && !isLastCol && "border-r border-slate-100",
                      day && !isLastRow && "border-b border-slate-100",
                      day && (isFirstCol || neighborLeftHasNoDay) && "border-l border-slate-100",
                      day && (isFirstRow || neighborTopHasNoDay) && "border-t border-slate-100",
                      viewMode === "events" && day && "hover:bg-slate-50/50",
                    )}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-2 relative z-20">
                          <span className={cn(
                            "text-sm font-black transition-all leading-none",
                            isToday ? "text-blue-600" : "text-slate-300 group-hover:text-slate-500"
                          )}>
                            {day}
                          </span>
                          {isToday && (
                            <div className="flex flex-col items-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 mt-1">
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
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
