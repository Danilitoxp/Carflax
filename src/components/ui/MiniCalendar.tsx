import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  mode?: "single" | "range";
  onSelectDate?: (date: Date) => void;
  onSelectRange?: (start: Date, end: Date | null) => void;
  selectedDate?: Date;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
}

export function MiniCalendar({ 
  mode = "single", 
  onSelectDate, 
  onSelectRange, 
  selectedDate: externalSelectedDate,
  initialStartDate,
  initialEndDate
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(initialStartDate || null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(initialEndDate || null);

  const daysOfWeek = ["D", "S", "T", "Q", "Q", "S", "S"];
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);

    if (mode === "single") {
      setSelectedDate(clickedDate);
      onSelectDate?.(clickedDate);
    } else {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(clickedDate);
        setRangeEnd(null);
        onSelectRange?.(clickedDate, null);
      } else {
        if (clickedDate < rangeStart) {
          setRangeStart(clickedDate);
          setRangeEnd(null);
          onSelectRange?.(clickedDate, null);
        } else {
          setRangeEnd(clickedDate);
          onSelectRange?.(rangeStart, clickedDate);
        }
      }
    }
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateAt = new Date(year, month, d);
    const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
    
    let isSelected = false;
    let isInRange = false;
    let isStart = false;
    let isEnd = false;

    if (mode === "single") {
      isSelected = d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
    } else {
      isStart = !!rangeStart && dateAt.getTime() === rangeStart.getTime();
      isEnd = !!rangeEnd && dateAt.getTime() === rangeEnd.getTime();
      isSelected = isStart || isEnd;
      if (rangeStart && rangeEnd) {
        isInRange = dateAt > rangeStart && dateAt < rangeEnd;
      }
    }

    days.push(
      <button
        key={d}
        onClick={() => handleDateClick(d)}
        className={cn(
          "h-8 w-8 text-[10px] font-black transition-all flex items-center justify-center relative z-10",
          isSelected ? "bg-primary text-white shadow-lg shadow-primary/30 rounded-xl" : "hover:bg-secondary text-foreground/60 hover:text-foreground rounded-xl",
          isInRange && "bg-primary/10 text-primary rounded-none",
          isStart && rangeEnd && "rounded-r-none",
          isEnd && "rounded-l-none",
          isToday && !isSelected && !isInRange && "text-primary border border-primary/20"
        )}
      >
        {d}
        {isToday && !isSelected && !isInRange && <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />}
      </button>
    );
  }

  return (
    <div className="p-4 bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-[280px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-[11px] font-black uppercase tracking-tighter text-foreground">
          {months[month]} <span className="text-primary">{year}</span>
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handlePrevMonth} className="p-1.5 hover:bg-secondary rounded-lg transition-all active:scale-90">
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-secondary rounded-lg transition-all active:scale-90">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="h-8 w-8 flex items-center justify-center text-[9px] font-black text-muted-foreground/40 uppercase">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
}
