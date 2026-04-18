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
    days.push(<div key={`empty-${i}`} className="h-7 w-7" />);
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
          "h-7 w-7 text-[10px] font-bold transition-all flex items-center justify-center relative z-10",
          isSelected ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 rounded-lg" : "hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg",
          isInRange && "bg-blue-50 text-blue-600 rounded-none",
          isStart && rangeEnd && "rounded-r-none",
          isEnd && "rounded-l-none",
          isToday && !isSelected && !isInRange && "text-blue-600 border border-blue-600/20"
        )}
      >
        {d}
        {isToday && !isSelected && !isInRange && <div className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />}
      </button>
    );
  }

  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-[240px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-black uppercase tracking-tight text-slate-800">
          {months[month]} <span className="text-blue-600">{year}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={handlePrevMonth} className="p-1 px-1.5 hover:bg-slate-50 rounded-md transition-all text-slate-400 hover:text-blue-600 active:scale-90">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleNextMonth} className="p-1 px-1.5 hover:bg-slate-50 rounded-md transition-all text-slate-400 hover:text-blue-600 active:scale-90">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1.5">
        {daysOfWeek.map((day, i) => (
          <div key={i} className="h-7 w-7 flex items-center justify-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days}
      </div>
    </div>
  );
}
