"use client";

import type { CalendarEvent } from "@/types/calendar";

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDayClick: (dateStr: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pillClass: Record<string, string> = {
  task: "bg-accent/[.18] text-accent",
  cron: "bg-purple/[.18] text-purple",
  reminder: "bg-yellow/[.18] text-yellow",
  deadline: "bg-red/[.18] text-red",
};

function getEventsForDate(dateStr: string, events: CalendarEvent[]): CalendarEvent[] {
  const target = new Date(dateStr + "T00:00:00");
  const result: CalendarEvent[] = [];

  events.forEach((ev) => {
    const evDate = new Date(ev.date + "T00:00:00");
    if (ev.date === dateStr) {
      result.push(ev);
    } else if (ev.recurrence !== "none" && evDate <= target) {
      if (ev.recurrence === "daily") {
        result.push(ev);
      } else if (ev.recurrence === "weekly" && evDate.getDay() === target.getDay()) {
        result.push(ev);
      } else if (ev.recurrence === "monthly" && evDate.getDate() === target.getDate()) {
        result.push(ev);
      }
    }
  });

  return result;
}

function formatDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarGrid({ year, month, events, onDayClick, onEventClick }: CalendarGridProps) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    let day: number, cellMonth: number, cellYear: number, isOther = false;

    if (i < firstDay) {
      day = prevDays - firstDay + i + 1;
      cellMonth = month - 1;
      cellYear = year;
      if (cellMonth < 0) { cellMonth = 11; cellYear--; }
      isOther = true;
    } else if (i - firstDay >= daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      cellMonth = month + 1;
      cellYear = year;
      if (cellMonth > 11) { cellMonth = 0; cellYear++; }
      isOther = true;
    } else {
      day = i - firstDay + 1;
      cellMonth = month;
      cellYear = year;
    }

    const dateStr = formatDateStr(cellYear, cellMonth, day);
    const isToday = day === today.getDate() && cellMonth === today.getMonth() && cellYear === today.getFullYear();
    const dayEvents = getEventsForDate(dateStr, events);

    cells.push({ day, dateStr, isOther, isToday, dayEvents });
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 border border-border rounded-[10px] overflow-hidden bg-surface">
        {/* Header */}
        {DAY_NAMES.map((d) => (
          <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-text-muted uppercase tracking-wide bg-surface border-b border-border">
            {d}
          </div>
        ))}

        {/* Cells */}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`min-h-[110px] p-1.5 border-b border-r border-border bg-bg cursor-pointer transition-colors hover:bg-[#1a2030] relative ${
              i % 7 === 6 ? "border-r-0" : ""
            } ${cell.isOther ? "opacity-35" : ""} ${cell.isToday ? "bg-accent/[.06]" : ""}`}
            onClick={() => onDayClick(cell.dateStr)}
          >
            <div className={`text-[13px] font-medium mb-1 w-7 h-7 flex items-center justify-center ${
              cell.isToday ? "bg-accent text-white rounded-full" : ""
            }`}>
              {cell.day}
            </div>
            <div className="flex flex-col gap-0.5">
              {cell.dayEvents.slice(0, 3).map((ev) => (
                <div
                  key={`${ev.id}-${cell.dateStr}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate cursor-pointer flex items-center gap-0.5 ${pillClass[ev.type] || pillClass.task}`}
                  onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                >
                  {ev.recurrence !== "none" && <span className="text-[9px]">&#x21bb;</span>}
                  {ev.title}
                </div>
              ))}
              {cell.dayEvents.length > 3 && (
                <div className="text-[10px] text-text-muted px-1.5">+{cell.dayEvents.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
