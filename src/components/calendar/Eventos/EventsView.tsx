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
      case "birthday": return "bg-rose-50/80 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors";
      case "star": return "bg-amber-50/80 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20";
      case "holiday": return "bg-orange-100/80 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 hover:bg-orange-200 dark:hover:bg-orange-500/20 shadow-sm";
      case "education": return "bg-indigo-50/80 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20";
      case "meeting": return "bg-violet-50/80 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-500/20";
      case "celebration": return "bg-pink-50/80 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-200/50 dark:border-pink-500/30 hover:bg-pink-100 dark:hover:bg-pink-500/20";
      case "finance": return "bg-emerald-50/80 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20";
      case "important": return "bg-red-50/80 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20";
      case "launch": return "bg-cyan-50/80 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-500/30 hover:bg-cyan-100 dark:hover:bg-cyan-500/20";
      case "video": return "bg-blue-50/80 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20";
      default: return "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "birthday": return <Gift className="w-3 h-3" />;
      case "star": return <Star className="w-2.5 h-2.5" />;
      case "holiday": return <Flag className="w-2.5 h-2.5 fill-orange-400/20" />;
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
    <div className="w-full h-full flex flex-col gap-0.5 relative z-10 overflow-hidden">
      {dayEvents.map(event => (
        <div 
          key={event.id}
          onClick={(e) => onEventClick(e, event)}
          className={cn(
            "flex-1 min-h-[18px] max-h-[32px] px-2 rounded-md flex items-center gap-2 transition-all active:scale-95 text-left w-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)] group/item overflow-hidden",
            getEventStyles(event.type)
          )}
        >
          <div className="shrink-0 opacity-80 scale-75 origin-left">
            {getEventIcon(event.type)}
          </div>
          <span className="text-[9px] font-black uppercase tracking-tight leading-none truncate flex-1">
            {event.title}
          </span>
        </div>
      ))}
    </div>
  );
}
