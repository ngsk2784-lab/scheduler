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
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        height="auto"
        dayMaxEvents={5}
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        slotDuration="01:00:00"
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          meridiem: false,
        }}
        events={events}
        dateClick={(arg) => onDateClick(arg.date)}
        eventClick={(arg: EventClickArg) => onEventClick(arg)}
        datesSet={(arg: DatesSetArg) => onDatesSet?.(arg)}
        eventContent={(arg) => {
          const kind = arg.event.extendedProps?.kind;
          if (kind === "report") {
            return (
              <span className="inline-flex max-w-full items-center gap-0.5 overflow-hidden rounded bg-amber-100 px-1.5 text-[11px] font-medium leading-4 text-amber-800 ring-1 ring-amber-300" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📌 {arg.event.title}
              </span>
            );
          }
          if (kind === "holiday") {
            return (
              <span className="block max-w-full overflow-hidden px-0.5 text-[11px] font-bold leading-4 text-rose-600" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
