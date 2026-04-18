import { cn } from "@/lib/utils";
import { Gift, Star, GraduationCap, Plus, Flag, Users, Trophy, DollarSign, AlertCircle, Rocket } from "lucide-react";

interface CalendarEvent {
  id: number;
  day: number;
  title: string;
  type: "birthday" | "star" | "education" | "video" | "holiday" | "meeting" | "celebration" | "finance" | "important" | "launch";
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
      case "birthday": return "bg-rose-50/80 text-rose-600 border-rose-100/50 hover:bg-rose-100 transition-colors";
      case "star": return "bg-amber-50/80 text-amber-600 border-amber-100/50 hover:bg-amber-100";
      case "holiday": return "bg-amber-50 text-amber-600 border-amber-200/60 hover:bg-amber-100 shadow-sm";
      case "education": return "bg-indigo-50/80 text-indigo-600 border-indigo-100/50 hover:bg-indigo-100";
      case "meeting": return "bg-violet-50/80 text-violet-600 border-violet-100/50 hover:bg-violet-100";
      case "celebration": return "bg-pink-50/80 text-pink-600 border-pink-100/50 hover:bg-pink-100";
      case "finance": return "bg-emerald-50/80 text-emerald-600 border-emerald-100/50 hover:bg-emerald-100";
      case "important": return "bg-red-50/80 text-red-600 border-red-200/50 hover:bg-red-100";
      case "launch": return "bg-cyan-50/80 text-cyan-600 border-cyan-100/50 hover:bg-cyan-100";
      case "video": return "bg-blue-50/80 text-blue-600 border-blue-100/50 hover:bg-blue-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "birthday": return <Gift className="w-3 h-3" />;
      case "star": return <Star className="w-2.5 h-2.5" />;
      case "holiday": return <Flag className="w-2.5 h-2.5 fill-amber-400/20" />;
      case "education": return <GraduationCap className="w-3 h-3" />;
      case "meeting": return <Users className="w-3 h-3" />;
      case "celebration": return <Trophy className="w-2.5 h-2.5" />;
      case "finance": return <DollarSign className="w-3 h-3" />;
      case "important": return <AlertCircle className="w-3 h-3" />;
      case "launch": return <Rocket className="w-3 h-3" />;
      case "video": return <Plus className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="w-full space-y-1 relative z-10">
      {dayEvents.map(event => (
        <div 
          key={event.id}
          onClick={(e) => onEventClick(e, event)}
          className={cn(
            "py-1.5 px-2.5 rounded-lg flex items-center gap-2 transition-all active:scale-95 text-left w-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)] group/item",
            getEventStyles(event.type)
          )}
        >
          <div className="shrink-0 opacity-80">{getEventIcon(event.type)}</div>
          <span className="text-[10px] font-bold uppercase tracking-tight leading-tight line-clamp-2">{event.title}</span>
        </div>
      ))}
    </div>
  );
}
