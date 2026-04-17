import { cn } from "@/lib/utils";
import { Gift, Star, GraduationCap, Plus } from "lucide-react";

interface CalendarEvent {
  id: number;
  day: number;
  title: string;
  type: "birthday" | "star" | "education" | "video";
  month?: number;
  year?: number;
}

interface EventsViewProps {
  day: number | null;
  month: number;
  year: number;
  events: CalendarEvent[];
  activeFilters: string[];
  onEventClick: (e: React.MouseEvent, event: CalendarEvent) => void;
}

export function EventsView({ day, month, year, events, activeFilters, onEventClick }: EventsViewProps) {
  if (!day) return null;

  const dayEvents = events.filter(e => 
    e.day === day && 
    (e.month === undefined || e.month === month) && 
    (e.year === undefined || e.year === year) &&
    activeFilters.includes(e.type)
  );

  const getEventStyles = (type: string) => {
    switch (type) {
      case "birthday": return "bg-gradient-to-r from-rose-500/80 to-pink-600/80 text-white backdrop-blur-sm";
      case "star": return "bg-gradient-to-r from-amber-400/80 to-orange-500/80 text-white backdrop-blur-sm";
      case "education": return "bg-gradient-to-r from-blue-600/80 to-indigo-700/80 text-white backdrop-blur-sm";
      case "video": return "bg-gradient-to-r from-[#032D9C]/80 to-[#0053FC]/80 text-white backdrop-blur-sm";
      default: return "bg-secondary/80 text-foreground backdrop-blur-sm";
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

  return (
    <div className="w-full space-y-1.5 relative z-10">
      {dayEvents.map(event => (
        <div 
          key={event.id}
          onClick={(e) => onEventClick(e, event)}
          className={cn(
            "py-2 px-3 rounded-xl flex items-center gap-2 transform transition-all hover:scale-[1.03] hover:translate-x-1 active:scale-95 text-left w-full min-h-[36px] shadow-sm",
            getEventStyles(event.type)
          )}
        >
          <div className="shrink-0 opacity-90">{getEventIcon(event.type)}</div>
          <span className="text-[10px] font-black uppercase tracking-tighter leading-tight break-words line-clamp-2">{event.title}</span>
        </div>
      ))}
    </div>
  );
}
