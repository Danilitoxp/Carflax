import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Star,
  Plus,
  Flag,
  Users,
  Trophy,
  DollarSign,
  AlertCircle
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
  type: "birthday" | "star" | "education" | "video" | "holiday" | "meeting" | "celebration" | "finance" | "important" | "launch";
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
  userProfile?: any;
}

// Cache global para evitar delays entre trocas de meses
const calendarCache: {
  events: Record<string, CalendarEvent[]>;
  vacations: Vacation[] | null;
  employees: { name: string; avatar?: string }[] | null;
  holidays: Record<number, { date: string; name: string }[]>;
} = {
  events: {},
  vacations: null,
  employees: null,
  holidays: {}
};

export function CalendarSection({ activeTab, userProfile }: CalendarSectionProps) {
  const [viewMode, setViewMode] = useState<"events" | "vacations">(activeTab === "Férias" ? "vacations" : "events");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Abril 2026
  
  const canManageFerias = userProfile?.permissions?.includes("Gerenciar Férias") || userProfile?.role === "admin";
  const canManageEvents = userProfile?.permissions?.includes("Gerenciar Calendário") || userProfile?.role === "admin";
  const [activeFilters, setActiveFilters] = useState<string[]>(["birthday", "star", "education", "video", "holiday", "meeting", "celebration", "finance", "important", "launch"]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [employees, setEmployees] = useState<{ name: string; avatar?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Sincronizar aba ativa vinda do componente pai
  useEffect(() => {
    if (activeTab === "Férias") setViewMode("vacations");
    else setViewMode("events");
  }, [activeTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    description: string;
    type: "birthday" | "star" | "education" | "video" | "holiday" | "meeting" | "celebration" | "finance" | "important" | "launch";
  }>({
    title: "",
    description: "",
    type: "video"
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchAllData = useCallback(async () => {
    const cacheKey = `${year}-${month}`;
    const hasCache = calendarCache.events[cacheKey] || calendarCache.vacations;

    if (!hasCache) {
      setLoading(true);
    } else {
      // Usar cache imediatamente para ser instantâneo
      if (calendarCache.events[cacheKey]) setEvents(calendarCache.events[cacheKey]);
      if (calendarCache.vacations) setVacations(calendarCache.vacations);
      if (calendarCache.employees) setEmployees(calendarCache.employees);
    }

    try {
      const [evResp, vacResp, userResp, holidayResp] = await Promise.all([
        supabase.from("eventos_calendario").select("*").eq("month", month + 1).eq("year", year),
        supabase.from("ferias").select("*"),
        supabase.from("usuarios").select("name, avatar, birth_date, admission_date"),
        calendarCache.holidays[year] 
          ? Promise.resolve(calendarCache.holidays[year]) 
          : fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`).then(r => r.ok ? r.json() : [])
      ]);

      // Guardar feriados no cache
      if (!calendarCache.holidays[year]) {
        calendarCache.holidays[year] = holidayResp;
      }

      // Processar Eventos
      const manualEvents = (evResp.data || []).map((e) => ({
        id: e.id,
        day: e.day,
        month: e.month - 1,
        year: e.year,
        title: e.title,
        type: e.type as CalendarEvent["type"],
        description: e.description || "",
      }));

      // Processar Férias
      const loadedVacations = (vacResp.data || []).map(v => {
        const [yrS, moS, dyS] = v.start_date.split('-').map(Number);
        const [yrE, moE, dyE] = v.end_date.split('-').map(Number);
        return {
          id: v.id,
          name: v.name,
          start: new Date(yrS, moS - 1, dyS),
          end: new Date(yrE, moE - 1, dyE),
          color: v.color || "blue",
          avatar: v.avatar || ""
        };
      });

      // Processar Usuários
      const emps = (userResp.data || []).map(u => ({ name: u.name, avatar: u.avatar }));

      const birthdayEvents = (userResp.data || [])
        .filter(u => u.birth_date)
        .map((u, i) => {
          const parts = u.birth_date.split("-");
          const m = parts[1];
          const d = parts[2];
          return {
            id: 1000 + i,
            day: parseInt(d),
            month: parseInt(m) - 1,
            year: year,
            title: u.name,
            type: "birthday" as const,
            description: `Aniversário de ${u.name}`,
          };
        });

      const admissionEvents = (userResp.data || [])
        .filter(u => u.admission_date)
        .map((u, i) => {
          const [y, m, d] = u.admission_date.split("-");
          const years = year - parseInt(y);
          if (years <= 0) return null;
          return {
            id: 2000 + i,
            day: parseInt(d),
            month: parseInt(m) - 1,
            year: year,
            title: `${u.name} - ${years} ${years === 1 ? 'ANO' : 'ANOS'}`,
            type: "star" as const,
            description: `Aniversário de Empresa: ${years} anos de Carflax!`,
          };
        }).filter(Boolean) as CalendarEvent[];

      // Processar Feriados
      const currentHolidayEvents = (holidayResp || []).map((h: { date: string; name: string }, i: number) => {
        const [hY, hM, hD] = h.date.split("-");
        return {
          id: 3000 + i,
          day: parseInt(hD),
          month: parseInt(hM) - 1,
          year: parseInt(hY),
          title: h.name.toUpperCase(),
          type: "holiday" as const,
          description: "Feriado Nacional",
        };
      });

      const finalEvents = [...manualEvents, ...birthdayEvents, ...admissionEvents, ...currentHolidayEvents];

      // Atualizar cache
      calendarCache.events[cacheKey] = finalEvents;
      calendarCache.vacations = loadedVacations;
      calendarCache.employees = emps;

      // Atualizar estado
      setEvents(finalEvents);
      setVacations(loadedVacations);
      setEmployees(emps);
    } catch (e) {
      console.error("[Calendar] Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSaveVacation = async (vData: { name: string; start: Date; end: Date; color: string; avatar: string; id?: number }) => {
    try {
      const payload = {
        name: vData.name,
        start_date: vData.start.toISOString().split('T')[0],
        end_date: vData.end.toISOString().split('T')[0],
        color: vData.color,
        avatar: vData.avatar
      };
      
      if (vData.id) {
        await supabase.from("ferias").update(payload).eq("id", vData.id);
      } else {
        await supabase.from("ferias").insert([payload]);
      }
      
      fetchAllData();
      setIsVacationModalOpen(false);
      setEditingVacation(null);
    } catch (err) {
      console.error("[Calendar] Erro férias:", err);
    }
  };

  const handleDeleteVacation = async (id: number) => {
    try {
      await supabase.from("ferias").delete().eq("id", id);
      fetchAllData();
    } catch (err) {
      console.error("[Calendar] Erro deletar férias:", err);
    }
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !selectedDay) return;
    try {
      const payload = {
        title: newEvent.title,
        description: newEvent.description || "",
        type: newEvent.type,
        day: Number(selectedDay),
        month: Number(month + 1),
        year: Number(year)
      };
      if (editingEventId) {
        await supabase.from("eventos_calendario").update(payload).eq("id", editingEventId);
      } else {
        await supabase.from("eventos_calendario").insert([payload]);
      }
      fetchAllData();
      setIsModalOpen(false);
      setEditingEventId(null);
      setNewEvent({ title: "", description: "", type: "video" });
    } catch (err) {
      console.error("[Calendar] Erro evento:", err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await supabase.from("eventos_calendario").delete().eq("id", id);
      fetchAllData();
      setIsModalOpen(false);
      setEditingEventId(null);
    } catch (err) {
      console.error("[Calendar] Erro ao deletar:", err);
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => (prev.length === 1 && prev.includes(filter)) ? ["birthday", "star", "education", "video", "holiday", "meeting", "celebration", "finance", "important", "launch"] : [filter]);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDaysStart = Array.from({ length: firstDayOfMonth }, () => null);
  const totalSlotsNeeded = 42;
  const paddingDaysEnd = Array.from({ length: totalSlotsNeeded - (paddingDaysStart.length + days.length) }, () => null);
  const allSlots = [...paddingDaysStart, ...days, ...paddingDaysEnd];

  const handleDayClick = (day: number | null) => {
    if (!day || viewMode === "vacations") return;
    if (!canManageEvents) return;
    setEditingEventId(null);
    setSelectedDay(day);
    setNewEvent({ title: "", description: "", type: "video" });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (!canManageEvents) return;
    setEditingEventId(event.id);
    setSelectedDay(event.day);
    setNewEvent({ title: event.title, description: event.description || "", type: event.type });
    setIsModalOpen(true);
  };

  const handleVacationClick = (vac: Vacation) => {
    if (!canManageFerias) return;
    setEditingVacation(vac);
    setIsVacationModalOpen(true);
  };

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveEvent} 
        onDelete={handleDeleteEvent}
        selectedDay={selectedDay} 
        editingEventId={editingEventId} 
        newEvent={newEvent} 
        setNewEvent={setNewEvent} 
        canManage={canManageEvents}
      />
      <div className="flex-1 overflow-hidden px-6 pt-4 pb-2 flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-9 w-48 bg-secondary rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 shadow-sm">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-secondary rounded-md transition-all text-muted-foreground hover:text-blue-600"><ChevronLeft className="w-4 h-4" /></button>
                <div className="px-3 py-1 text-xs font-black text-foreground uppercase tracking-tighter border-x border-border min-w-[120px] text-center">{monthNames[month]} <span className="text-blue-600 dark:text-blue-500">{year}</span></div>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-secondary rounded-md transition-all text-muted-foreground hover:text-blue-600"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
            
            {viewMode === "events" && (
              <div className="flex items-center gap-1">
                {loading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-8 w-12 bg-secondary rounded-md animate-pulse" />
                  ))
                ) : (
                  [
                    { id: "holiday", icon: Flag, label: "Feriados", color: "amber" },
                    { id: "meeting", icon: Users, label: "Reuniões", color: "violet" },
                    { id: "finance", icon: DollarSign, label: "Contas", color: "emerald" },
                    { id: "important", icon: AlertCircle, label: "Urgente", color: "red" },
                    { id: "celebration", icon: Trophy, label: "Metas", color: "pink" },
                    { id: "birthday", icon: Gift, label: "Níver", color: "rose" },
                    { id: "star", icon: Star, label: "Jubileu", color: "amber" },
                  ].map(f => (
                    <button 
                      key={f.id} 
                      onClick={() => toggleFilter(f.id)} 
                      className={cn(
                        "px-3 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border", 
                        activeFilters.length === 1 && activeFilters.includes(f.id) 
                          ? "bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-600/20 shadow-sm" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground border-transparent"
                      )}
                    >
                      <f.icon className={cn("w-3.5 h-3.5", activeFilters.length === 1 && activeFilters.includes(f.id) ? "opacity-100" : "opacity-40")} />
                      {activeFilters.length === 1 && activeFilters.includes(f.id) && f.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {loading ? (
               <div className="h-9 w-32 bg-secondary rounded-md animate-pulse" />
            ) : (
              viewMode === "vacations" && canManageFerias && (
                <Button onClick={() => { setEditingVacation(null); setIsVacationModalOpen(true); }} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wider group">
                  <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> LANÇAR FÉRIAS
                </Button>
              )
            )}
          </div>
        </div>
        <VacationModal 
          isOpen={isVacationModalOpen} 
          onClose={() => { setIsVacationModalOpen(false); setEditingVacation(null); }} 
          onSave={handleSaveVacation} 
          onDelete={handleDeleteVacation}
          editingVacation={editingVacation}
          employees={employees}
          vacations={vacations}
          canManage={canManageFerias}
        />
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0 relative mt-3 h-full">
          <div className="grid grid-cols-7 bg-secondary/30 border-b border-border">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-2.5 text-center"><span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{day}</span></div>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden h-full">
            <div className="grid grid-cols-7 h-full w-full" style={{ gridTemplateRows: `repeat(6, 1fr)` }}>
              {allSlots.map((day, idx) => {
                if (loading) {
                  return (
                    <div key={idx} className="border-r border-b border-border p-2 animate-pulse space-y-1.5 opacity-60 bg-transparent">
                      <div className="h-2 w-3 bg-secondary rounded" />
                      <div className="space-y-1">
                        {idx % 3 === 0 && <div className="h-3 w-full bg-secondary/50 rounded" />}
                        {idx % 5 === 0 && <div className="h-3 w-3/4 bg-secondary/50 rounded" />}
                      </div>
                    </div>
                  );
                }

                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                const dayDate = day ? new Date(year, month, day) : null;
                const isLastCol = (idx + 1) % 7 === 0;
                const isLastRow = idx >= 35;
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleDayClick(day)} 
                    className={cn(
                      "relative group transition-all duration-300 cursor-pointer flex flex-col p-2 min-h-0 overflow-hidden bg-transparent",
                      !isLastCol && "border-r border-border", 
                      !isLastRow && "border-b border-border", 
                      viewMode === "events" && day && "hover:bg-secondary/40",
                      day && isToday && "bg-blue-600/10 dark:bg-blue-500/20 z-10"
                    )}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-1 relative z-20">
                          <span className={cn(
                            "text-xs font-black transition-all leading-none", 
                            isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600"
                          )}>
                            {day}
                          </span>
                          {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />}
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">{viewMode === "events" ? <EventsView day={day} month={month} year={year} events={events} activeFilters={activeFilters} onEventClick={handleEventClick} /> : <VacationsView dayDate={dayDate} vacations={vacations} onVacationClick={handleVacationClick} />}</div>
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
