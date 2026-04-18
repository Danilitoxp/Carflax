import { useState, useEffect } from "react";
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
import { TinyLoader } from "@/components/ui/TinyLoader";

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
}

export function CalendarSection({ activeTab }: CalendarSectionProps) {
  const [viewMode, setViewMode] = useState<"events" | "vacations">(activeTab === "Férias" ? "vacations" : "events");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Abril 2026
  const [activeFilters, setActiveFilters] = useState<string[]>(["birthday", "star", "education", "video", "holiday", "meeting", "celebration", "finance", "important", "launch"]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
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

  const fetchAllData = async () => {
    // Carregamento sutil: não bloqueia a UI totalmente se for rápido
    setLoading(true);
    try {
      const [evResp, vacResp, userResp, holidayResp] = await Promise.all([
        supabase.from("eventos_calendario").select("*").eq("month", month + 1).eq("year", year),
        supabase.from("ferias").select("*"),
        supabase.from("usuarios").select("name, birth_date, admission_date").or("birth_date.not.is.null,admission_date.not.is.null"),
        fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`).then(r => r.ok ? r.json() : [])
      ]);

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
      const loadedVacations = (vacResp.data || []).map(v => ({
        id: v.id,
        name: v.name,
        start: new Date(v.start_date),
        end: new Date(v.end_date),
        color: v.color || "blue",
        avatar: v.avatar || ""
      }));
      setVacations(loadedVacations);

      // Processar Usuários
      const birthdayEvents = (userResp.data || [])
        .filter(u => u.birth_date)
        .map((u, i) => {
          const [_, m, d] = u.birth_date.split("-");
          return {
            id: 1000 + i,
            day: parseInt(d),
            month: parseInt(m) - 1,
            year: year,
            title: `${u.name} 🎂`,
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
            title: `${u.name} - ${years} ${years === 1 ? 'ANO' : 'ANOS'} 🏢`,
            type: "star" as const,
            description: `Aniversário de Empresa: ${years} anos de Carflax!`,
          };
        }).filter(Boolean) as CalendarEvent[];

      // Processar Feriados
      const holidayEvents = (holidayResp || []).map((h: any, i: number) => {
        const [y, m, d] = h.date.split("-");
        return {
          id: 3000 + i,
          day: parseInt(d),
          month: parseInt(m) - 1,
          year: parseInt(y),
          title: h.name.toUpperCase(),
          type: "holiday" as const,
          description: "Feriado Nacional",
        };
      });

      setEvents([...manualEvents, ...birthdayEvents, ...admissionEvents, ...holidayEvents]);
    } catch (e) {
      console.error("[Calendar] Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [year, month]);

  const handleSaveVacation = async (vData: { name: string; start: Date; end: Date; color: string; avatar: string }) => {
    try {
      const payload = {
        name: vData.name,
        start_date: vData.start.toISOString().split('T')[0],
        end_date: vData.end.toISOString().split('T')[0],
        color: vData.color,
        avatar: vData.avatar
      };
      await supabase.from("ferias").insert([payload]);
      fetchAllData();
      setIsVacationModalOpen(false);
    } catch (err) {
      console.error("[Calendar] Erro férias:", err);
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
    setEditingEventId(null);
    setSelectedDay(day);
    setNewEvent({ title: "", description: "", type: "video" });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setSelectedDay(event.day);
    setNewEvent({ title: event.title, description: event.description || "", type: event.type });
    setIsModalOpen(true);
  };

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveEvent} 
        onDelete={handleDeleteEvent}
        selectedDay={selectedDay} 
        editingEventId={editingEventId} 
        newEvent={newEvent} 
        setNewEvent={setNewEvent} 
      />
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 flex flex-col min-h-0 scrollbar-hide">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-md transition-all text-slate-400 hover:text-blue-600"><ChevronLeft className="w-4 h-4" /></button>
              <div className="px-3 py-1 text-xs font-black text-slate-900 uppercase tracking-tighter border-x border-slate-100 min-w-[120px] text-center">{monthNames[month]} <span className="text-blue-600">{year}</span></div>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-md transition-all text-slate-400 hover:text-blue-600"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {viewMode === "events" && (
              <div className="flex items-center gap-1">
                {[
                  { id: "holiday", icon: Flag, label: "Feriados", color: "amber" },
                  { id: "meeting", icon: Users, label: "Reuniões", color: "violet" },
                  { id: "finance", icon: DollarSign, label: "Contas", color: "emerald" },
                  { id: "important", icon: AlertCircle, label: "Urgente", color: "red" },
                  { id: "celebration", icon: Trophy, label: "Metas", color: "pink" },
                  { id: "birthday", icon: Gift, label: "Níver", color: "rose" },
                  { id: "star", icon: Star, label: "Jubileu", color: "amber" },
                ].map(f => (
                  <button key={f.id} onClick={() => toggleFilter(f.id)} className={cn("px-3 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2", activeFilters.length === 1 && activeFilters.includes(f.id) ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600")}>
                    <f.icon className="w-3.5 h-3.5" />
                    {activeFilters.length === 1 && activeFilters.includes(f.id) && f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {viewMode === "vacations" && (
              <Button onClick={() => setIsVacationModalOpen(true)} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wider group">
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> LANÇAR FÉRIAS
              </Button>
            )}
          </div>
        </div>
        <VacationModal isOpen={isVacationModalOpen} onClose={() => setIsVacationModalOpen(false)} onSave={handleSaveVacation} />
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-0 relative mt-3">
          {loading && (
            <div className="absolute inset-0 z-[30] bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
              <TinyLoader size="sm" />
            </div>
          )}
          
          <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-2.5 text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span></div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
            <div className="grid grid-cols-7 min-h-full" style={{ gridTemplateRows: `repeat(6, 1fr)` }}>
              {allSlots.map((day, idx) => {
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                const dayDate = day ? new Date(year, month, day) : null;
                const isLastCol = (idx + 1) % 7 === 0;
                const isLastRow = idx >= 35;
                const isFirstCol = idx % 7 === 0;
                const neighborLeftHasNoDay = idx > 0 && allSlots[idx - 1] === null;
                const neighborTopHasNoDay = idx >= 7 && allSlots[idx - 7] === null;
                return (
                  <div key={idx} onClick={() => handleDayClick(day)} className={cn("relative group transition-all duration-300 cursor-pointer flex flex-col p-3", day ? (isToday ? "bg-blue-300 shadow-lg shadow-blue-500/20 z-10" : "bg-white") : "bg-transparent", day && !isLastCol && "border-r border-slate-100", day && !isLastRow && "border-b border-slate-100", day && (isFirstCol || neighborLeftHasNoDay) && "border-l border-slate-100", day && (idx < 7 || neighborTopHasNoDay) && "border-t border-slate-100", viewMode === "events" && day && "hover:bg-slate-50/50")}>
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-2 relative z-20"><span className={cn("text-sm font-black transition-all leading-none", isToday ? "text-white" : "text-slate-300 group-hover:text-slate-500")}>{day}</span>{isToday && <div className="flex flex-col items-center"><div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" /></div>}</div>
                        <div className="flex-1 mt-1">{viewMode === "events" ? <EventsView day={day} month={month} year={year} events={events} activeFilters={activeFilters} onEventClick={handleEventClick} /> : <VacationsView dayDate={dayDate} vacations={vacations} />}</div>
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
