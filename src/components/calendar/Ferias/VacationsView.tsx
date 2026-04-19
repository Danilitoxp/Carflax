import { cn } from "@/lib/utils";

interface Vacation {
  id: number;
  name: string;
  start: Date;
  end: Date;
  color: string;
  avatar: string;
}

interface VacationsViewProps {
  dayDate: Date | null;
  vacations: Vacation[];
  onVacationClick: (v: Vacation) => void;
}

export function VacationsView({ dayDate, vacations, onVacationClick }: VacationsViewProps) {
  if (!dayDate) return null;

  const activeVacations = vacations.filter(v => dayDate >= v.start && dayDate <= v.end);
  if (activeVacations.length === 0) return null;

  const isSingle = activeVacations.length === 1;

  return (
    <div className={cn(
      "absolute inset-x-0 bottom-0 flex flex-col gap-0.5 z-10 justify-start pt-1",
      isSingle ? "top-[1.5rem]" : "top-[2.2rem]"
    )}>
      {activeVacations.map((v) => {
        const isStart = dayDate.toDateString() === v.start.toDateString();
        const isEnd = dayDate.toDateString() === v.end.toDateString();
        const showIndicator = isStart || isEnd;

        return (
          <div 
            key={v.id}
            onClick={(e) => { e.stopPropagation(); onVacationClick(v); }}
            className={cn(
              "relative flex items-center px-3 transition-all cursor-pointer hover:brightness-110 active:scale-[0.99]",
              isSingle ? "h-10" : "h-7",
              v.color === 'bg-blue-600' ? (isSingle ? 'bg-blue-600/70' : 'bg-blue-600/90') : 
              v.color === 'bg-orange-500' ? (isSingle ? 'bg-amber-500/70' : 'bg-amber-500/90') : 
              v.color === 'bg-emerald-600' ? (isSingle ? 'bg-emerald-600/70' : 'bg-emerald-600/90') : v.color,
              isStart ? "rounded-l-md ml-1" : "",
              isEnd ? "rounded-r-md mr-1" : "",
              !isStart && !isEnd ? "mx-0" : ""
            )}
          >
            {showIndicator && (
              <div className="flex items-center gap-2 overflow-hidden shrink-0 z-20">
                <div className={cn(
                  "rounded-full border border-white/40 overflow-hidden bg-white/20 transition-all",
                  isSingle ? "w-6 h-6" : "w-5 h-5"
                )}>
                  <img src={v.avatar} className="w-full h-full object-cover" />
                </div>
                <span className={cn(
                  "font-black text-white uppercase tracking-tight truncate max-w-[120px] leading-none transition-all",
                  isSingle ? "text-[10px]" : "text-[9px]"
                )}>
                  {v.name}
                </span>
                <span className={cn(
                  "font-bold text-white/50 tracking-widest leading-none ml-1 transition-all",
                  isSingle ? "text-[8px]" : "text-[7px]"
                )}>
                  {isStart ? "INÍCIO" : isEnd ? "FIM" : "FÉRIAS"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
