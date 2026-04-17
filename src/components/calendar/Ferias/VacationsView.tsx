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
}

export function VacationsView({ dayDate, vacations }: VacationsViewProps) {
  if (!dayDate) return null;

  const activeVacations = vacations.filter(v => dayDate >= v.start && dayDate <= v.end);

  if (activeVacations.length === 0) return null;

  return (
    <div className="absolute inset-x-0 inset-y-0 flex flex-col pt-10 pb-2 px-0 z-10 pointer-events-none">
      {activeVacations.map((v, i) => {
        const isStart = dayDate.toDateString() === v.start.toDateString();
        const isEnd = dayDate.toDateString() === v.end.toDateString();
        
        // Show indicator if it's the actual start OR if it's the first day of the current visible month
        const showIndicator = isStart || (dayDate.getDate() === 1 && dayDate > v.start);

        return (
          <div 
            key={v.id}
            className={cn(
              "flex-1 relative flex items-center px-4 transition-all animate-in slide-in-from-right-4 duration-500 shadow-none",
              v.color,
              isStart ? "border-l-2 border-white/30" : "",
              isEnd ? "border-r-2 border-white/30" : "",
              !isStart && !isEnd ? "opacity-95" : ""
            )}
          >
            {showIndicator && (
              <div className="flex items-center gap-2 overflow-hidden shrink-0">
                <div className="w-7 h-7 rounded-full border-2 border-white/50 overflow-hidden bg-white/20">
                  <img src={v.avatar} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white uppercase tracking-tighter truncate max-w-[90px] leading-tight text-shadow-none">
                      {v.name.split(' ')[0]}
                    </span>
                    <span className="text-[7px] font-bold text-white/60 tracking-widest leading-none mt-0.5">FÉRIAS</span>
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 inset-y-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}
