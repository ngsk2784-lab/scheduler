"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import koLocale from "@fullcalendar/core/locales/ko";
import type { EventInput } from "@fullcalendar/core";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";

interface CalendarViewProps {
  events: EventInput[];
  onDateClick: (date: Date) => void;
  onEventClick: (arg: EventClickArg) => void;
  onDatesSet?: (arg: DatesSetArg) => void;
}

export function CalendarView({
  events,
  onDateClick,
  onEventClick,
  onDatesSet,
}: CalendarViewProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          listPlugin,
        ]}
        initialView="dayGridMonth"
        locale={koLocale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        height="auto"
        dayMaxEvents={5}
        nowIndicator
        events={events}
        dateClick={(arg) => onDateClick(arg.date)}
        eventClick={(arg: EventClickArg) => onEventClick(arg)}
        datesSet={(arg: DatesSetArg) => onDatesSet?.(arg)}
        eventContent={(arg) => {
          const kind = arg.event.extendedProps?.kind;
          if (kind === "report") {
            return (
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded bg-amber-100 px-1.5 text-[11px] font-medium leading-4 text-amber-800 ring-1 ring-amber-300">
                📌 {arg.event.title}
              </span>
            );
          }
          if (kind === "holiday") {
            return (
              <span className="whitespace-nowrap px-0.5 text-[11px] font-bold leading-4 text-rose-600">
                {arg.event.title}
              </span>
            );
          }
          return undefined;
        }}
      />
    </div>
  );
}
