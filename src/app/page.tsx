"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  EventInput,
  EventClickArg,
  DatesSetArg,
} from "@fullcalendar/core";
import { useData } from "@/lib/DataContext";
import type { Employee, Report, Schedule, ScheduleType } from "@/lib/types";
import { SCHEDULE_TYPE_MAP, toDateOnly } from "@/lib/constants";
import { loadHolidays } from "@/lib/holidays";
import { CalendarView } from "@/components/CalendarView";
import { ScheduleModal } from "@/components/ScheduleModal";
import { ReportModal } from "@/components/ReportModal";
import { Spinner } from "@/components/ui";
import { toCsv, downloadFile, buildIcs } from "@/lib/exportCsv";
import { useAuth } from "@/lib/AuthContext";

interface ModalState {
  open: boolean;
  schedule: Schedule | null;
  defaultDate?: Date;
  defaultEmployeeId?: string;
}

interface ReportModalState {
  open: boolean;
  report: Report | null;
  defaultDate?: Date;
}

export default function HomePage() {
  const {
    employees,
    schedules,
    reports,
    loading,
    error,
    saveSchedule,
    removeSchedule,
    saveReport,
    removeReport,
  } = useData();
  const { user: authUser, openLogin } = useAuth();

  const [empOn, setEmpOn] = useState<Record<string, boolean>>({});
  const [typeOn, setTypeOn] = useState<Record<ScheduleType, boolean>>({
    WORK: true,
    LEAVE: true,
    ANNUAL: true,
    HALF: true,
    HALF_AM: true,
    HALF_PM: true,
    TRIP: true,
    FIELD: true,
    REMOTE: true,
    OTHER: true,
  });
  const [showReports, setShowReports] = useState(true);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [viewTitle, setViewTitle] = useState("");

  const [scheduleModal, setScheduleModal] = useState<ModalState>({
    open: false,
    schedule: null,
  });
  const [reportModal, setReportModal] = useState<ReportModalState>({
    open: false,
    report: null,
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [today] = useState(() => new Date());

  useEffect(() => {
    setEmpOn((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const e of employees) {
        if (!(e.id in next)) {
          next[e.id] = e.is_active;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [employees]);

  const year = useMemo(() => {
    const m = viewTitle.match(/(\d{4})/);
    return m ? Number(m[1]) : new Date().getFullYear();
  }, [viewTitle]);

  useEffect(() => {
    let alive = true;
    loadHolidays(year).then((items) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      items.forEach((h) => (map[h.date] = h.name));
      setHolidays((prev) => ({ ...prev, ...map }));
    });
    return () => {
      alive = false;
    };
  }, [year]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sch = schedules.filter((s) => s.start_at.startsWith(key)).length;
    const rep = reports.filter((r) => r.report_date.startsWith(key)).length;
    return {
      month: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
      sch,
      rep,
    };
  }, [schedules, reports]);

  const events: EventInput[] = useMemo(() => {
    const empById = new Map(employees.map((e) => [e.id, e]));
    const list: EventInput[] = [];

    Object.entries(holidays).forEach(([date, name]) => {
      list.push({
        id: `h-${date}`,
        title: name,
        start: `${date}T00:00:00`,
        allDay: true,
        display: "auto",
        backgroundColor: "transparent",
        borderColor: "transparent",
        classNames: ["holiday-event"],
        extendedProps: { kind: "holiday" },
      });
    });

    for (const s of schedules) {
      if (empOn[s.employee_id] === false) continue;
      if (!typeOn[s.type]) continue;
      const emp = empById.get(s.employee_id);
      const start = new Date(s.start_at);
      let end = new Date(s.end_at);
      if (s.all_day) end = addDays(end, 1);
      list.push({
        id: `s-${s.id}`,
        title: s.title,
        start,
        end,
        allDay: s.all_day,
        backgroundColor: emp?.color ?? "#3b82f6",
        borderColor: emp?.color ?? "#3b82f6",
        textColor: "#ffffff",
        classNames: ["schedule-event"],
        extendedProps: {
          kind: "schedule",
          id: s.id,
          employeeId: s.employee_id,
          type: s.type,
        },
      });
    }

    if (showReports) {
      for (const r of reports) {
        if (empOn[r.employee_id] === false) continue;
        list.push({
          id: `r-${r.id}`,
          title: trimTitle(r.summary ?? r.content),
          start: `${r.report_date}T00:00:00`,
          allDay: true,
          display: "auto",
          backgroundColor: "transparent",
          borderColor: "transparent",
          classNames: ["report-event"],
          extendedProps: { kind: "report", id: r.id },
        });
      }
    }

    return list;
  }, [employees, schedules, reports, holidays, empOn, typeOn, showReports]);

    function handleEventClick(arg: EventClickArg) {
    const ep = arg.event.extendedProps as { kind?: string; id?: string };
    if (ep?.kind === "schedule") {
      const s = schedules.find((x) => x.id === ep.id);
      if (s) setScheduleModal({ open: true, schedule: s });
    } else if (ep?.kind === "report") {
      const r = reports.find((x) => x.id === ep.id);
      if (r) setReportModal({ open: true, report: r });
    }
  }

  function handleDateClick(date: Date) {
    setSelectedDay(date);
  }

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    setViewTitle(arg.view.title);
  }, []);

  const selectedDayStr = useMemo(
    () => (selectedDay ? toDateOnly(selectedDay) : null),
    [selectedDay]
  );
  const daySchedules = useMemo(() => {
    if (!selectedDayStr) return [] as Schedule[];
    return schedules.filter((s) => {
      const sd = toDateOnly(new Date(s.start_at));
      const ed = toDateOnly(new Date(s.all_day ? s.end_at : s.start_at));
      return sd <= selectedDayStr && ed >= selectedDayStr;
    });
  }, [schedules, selectedDayStr]);
  const dayReports = useMemo(() => {
    if (!selectedDayStr) return [] as Report[];
    return reports.filter((r) => r.report_date === selectedDayStr);
  }, [reports, selectedDayStr]);

  // 사이드패널 직원 상태 기준일 (선택일 없으면 오늘)
  const statusDate = selectedDay ?? today;
  const office = useMemo(
    () => officeStaff(employees, schedules, statusDate),
    [employees, schedules, statusDate]
  );

  function toggleEmp(id: string) {
    setEmpOn((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }
  function toggleType(t: ScheduleType) {
    setTypeOn((prev) => ({ ...prev, [t]: !prev[t] }));
  }
  function allOrClear(on: boolean) {
    setEmpOn(Object.fromEntries(employees.map((e) => [e.id, on])));
  }

  const nameOf = useCallback(
    (id: string) => employees.find((e) => e.id === id)?.name ?? "?",
    [employees]
  );

  function exportSchedulesCsv() {
    const rows: (string | number | null)[][] = [
      ["직원", "제목", "유형", "시작", "종료", "종일", "메모"],
    ];
    schedules.forEach((s) =>
      rows.push([
        nameOf(s.employee_id),
        s.title,
        s.type,
        new Date(s.start_at).toLocaleString("ko-KR"),
        s.all_day ? "종일" : new Date(s.end_at).toLocaleString("ko-KR"),
        s.all_day ? "Y" : "N",
        s.description ?? "",
      ])
    );
    downloadFile("스케줄.csv", toCsv(rows));
  }

  function exportIcs() {
    const evs = schedules
      .filter((s) => !s.all_day)
      .map((s) => ({
        title: `${s.title} (${nameOf(s.employee_id)})`,
        start: new Date(s.start_at),
        end: new Date(s.end_at),
        desc: s.description ?? undefined,
      }));
    downloadFile("스케줄.ics", buildIcs(evs, "회사 스케줄"), "text/calendar;charset=utf-8");
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">전체 스케줄</h1>
          <p className="text-xs text-zinc-500">
            직원별 색상으로 일정과 보고(📌)를 한눈에
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/employees" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
            👥 직원 관리
          </Link>
          <button onClick={() => (authUser ? setReportModal({ open: true, report: null, defaultDate: new Date() }) : openLogin())} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100">
            ＋ 📌 보고 등록
          </button>
          <button onClick={exportSchedulesCsv} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
            ⬇ CSV
          </button>
          <button onClick={exportIcs} className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100" title="구글/아이캘린더 구독용">
            🗓 icloud
          </button>
          <button onClick={() => (authUser ? setScheduleModal({ open: true, schedule: null, defaultDate: new Date() }) : openLogin())} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
            ＋ 스케줄 등록
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={`${thisMonth.month} 스케줄`} value={thisMonth.sch} accent="text-indigo-600" />
        <StatCard label={`${thisMonth.month} 보고`} value={thisMonth.rep} accent="text-amber-600" />
        <StatCard label="재직 직원" value={employees.filter((e) => e.is_active).length} accent="text-emerald-600" />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            <CalendarView
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onDatesSet={onDatesSet}
            />

            {selectedDay && (
              <DayDetail
                day={selectedDay}
                schedules={daySchedules}
                reports={dayReports}
                employees={employees}
                onAddSchedule={() => setScheduleModal({ open: true, schedule: null, defaultDate: selectedDay })}
                onAddReport={() => setReportModal({ open: true, report: null, defaultDate: selectedDay })}
                onEditSchedule={(s) => setScheduleModal({ open: true, schedule: s })}
                onEditReport={(r) => setReportModal({ open: true, report: r })}
              />
            )}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-[64px] lg:self-start">
            {/* 직원 상태 (상시 표시) */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900">👥 직원 상태</h2>
                <span className="text-[11px] text-zinc-400">
                  {statusDate.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                  })}
                  {selectedDay ? "" : " (오늘)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2">
                  <div className="text-2xl font-bold text-emerald-700">
                    {office.am.length}
                  </div>
                  <div className="text-emerald-700">🌅 오전 사무실</div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-2">
                  <div className="text-2xl font-bold text-sky-700">
                    {office.pm.length}
                  </div>
                  <div className="text-sky-700">🌇 오후 사무실</div>
                </div>
              </div>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="font-semibold text-zinc-500">🌅 오전</div>
                {office.am.length ? (
                  <div className="flex flex-wrap gap-1">
                    {office.am.map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-700 ring-1 ring-zinc-200">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400">(없음)</span>
                )}
                <div className="mt-1.5 font-semibold text-zinc-500">🌇 오후</div>
                {office.pm.length ? (
                  <div className="flex flex-wrap gap-1">
                    {office.pm.map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-700 ring-1 ring-zinc-200">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400">(없음)</span>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900">👥 직원 필터</h2>
                <div className="flex gap-1 text-xs">
                  <button className="rounded px-2 py-0.5 font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => allOrClear(true)}>
                    전체
                  </button>
                  <button className="rounded px-2 py-0.5 font-medium text-zinc-400 hover:bg-zinc-100" onClick={() => allOrClear(false)}>
                    해제
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {employees.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                    <input type="checkbox" checked={empOn[e.id] ?? true} onChange={() => toggleEmp(e.id)} className="h-4 w-4 accent-indigo-600" />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="flex-1 text-zinc-700">
                      {e.name}
                      {!e.is_active && <span className="text-zinc-400"> (퇴사)</span>}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-zinc-900">🏷️ 유형 필터</h2>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(typeOn).map(([t, on]) => {
                  const info = SCHEDULE_TYPE_MAP[t as ScheduleType];
                  return (
                    <button key={t} onClick={() => toggleType(t as ScheduleType)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${on ? info.badge : "bg-zinc-100 text-zinc-400 line-through"}`}>
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-zinc-900">📌 보고 표시</h2>
              <label className="flex cursor-pointer items-center justify-between text-sm font-semibold text-zinc-700">
                보고 꼬리표
                <button type="button" onClick={() => setShowReports((v) => !v)} className={`relative h-6 w-11 rounded-full transition-colors ${showReports ? "bg-amber-500" : "bg-zinc-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${showReports ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </label>
              <p className="mt-2 text-xs text-zinc-500">달력에 보고한 날을 📌 태그로 표시합니다.</p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-zinc-900">🎨 범례</h2>
              <div className="space-y-1 text-xs text-zinc-600">
                {Object.entries(SCHEDULE_TYPE_MAP).map(([t, info]) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${info.badge}`}>{info.label}</span>
                    <span className="text-zinc-400">{t}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <ScheduleModal
        open={scheduleModal.open}
        onClose={() => setScheduleModal({ open: false, schedule: null })}
        employees={employees}
        schedule={scheduleModal.schedule}
        defaultDate={scheduleModal.defaultDate}
        defaultEmployeeId={scheduleModal.defaultEmployeeId}
        onSave={saveSchedule}
        onDelete={removeSchedule}
      />

      <ReportModal
        open={reportModal.open}
        onClose={() => setReportModal({ open: false, report: null })}
        employees={employees}
        report={reportModal.report}
        defaultDate={reportModal.defaultDate}
        onSave={saveReport}
        onDelete={removeReport}
      />
    </div>
  );
}
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function DayDetail({
  day,
  schedules,
  reports,
  employees,
  onAddSchedule,
  onAddReport,
  onEditSchedule,
  onEditReport,
}: {
  day: Date;
  schedules: Schedule[];
  reports: Report[];
  employees: Employee[];
  onAddSchedule: () => void;
  onAddReport: () => void;
  onEditSchedule: (s: Schedule) => void;
  onEditReport: (r: Report) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-zinc-900">
          📆{" "}
          {day.toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </h3>
        <div className="flex gap-1.5">
          <button onClick={onAddReport} className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200">
            ＋ 보고
          </button>
          <button onClick={onAddSchedule} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700">
            ＋ 스케줄
          </button>
        </div>
      </div>

      {schedules.length === 0 && reports.length === 0 ? (
        <p className="text-sm text-zinc-400">등록된 일정과 보고가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {schedules.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-zinc-500">
                일정 ({schedules.length})
              </div>
              <div className="space-y-1.5">
                {schedules.map((s) => {
                  const emp = employees.find((e) => e.id === s.employee_id);
                  const tinfo = SCHEDULE_TYPE_MAP[s.type];
                  return (
                    <button key={s.id} onClick={() => onEditSchedule(s)} className="flex w-full items-center gap-2 rounded-lg border border-zinc-100 px-2.5 py-2 text-left text-sm hover:bg-zinc-50">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: emp?.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-zinc-800">{s.title}</span>
                        <span className="text-xs text-zinc-400">
                          {emp?.name}
                          {s.all_day ? "" : ` · ${timeOf(s.start_at)}`}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${tinfo.badge}`}>
                        {tinfo.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {reports.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-zinc-500">
                보고 ({reports.length})
              </div>
              <div className="space-y-1.5">
                {reports.map((r) => {
                  const emp = employees.find((e) => e.id === r.employee_id);
                  return (
                    <button key={r.id} onClick={() => onEditReport(r)} className="flex w-full items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-2 text-left text-sm hover:bg-amber-50">
                      <span>{r.source === "kakao" ? "💬" : "✍️"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-amber-900">
                          {emp?.name}
                          {r.summary ? ` · ${r.summary}` : ""}
                        </span>
                        <span className="line-clamp-2 mt-0.5 block text-xs text-amber-800/80">{r.content}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function trimTitle(s: string, max = 18): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

// 유형별 오전/오후 사무실 여부
const TYPE_OFFICE: Record<ScheduleType, { am: boolean; pm: boolean }> = {
  WORK: { am: true, pm: true },
  LEAVE: { am: false, pm: false },
  ANNUAL: { am: false, pm: false },
  HALF: { am: false, pm: false },
  HALF_AM: { am: false, pm: true }, // 오전 반차 → 오후는 사무실
  HALF_PM: { am: true, pm: false }, // 오후 반차 → 오전은 사무실
  TRIP: { am: false, pm: false },
  FIELD: { am: false, pm: false },
  REMOTE: { am: false, pm: false },
  OTHER: { am: false, pm: false },
};
const OFFICE_PRIORITY: ScheduleType[] = [
  "LEAVE",
  "ANNUAL",
  "HALF",
  "HALF_AM",
  "HALF_PM",
  "TRIP",
  "FIELD",
  "REMOTE",
  "WORK",
  "OTHER",
];

function coveringSchedules(schedules: Schedule[], dateStr: string): Schedule[] {
  return schedules.filter((s) => {
    const sd = toDateOnly(new Date(s.start_at));
    const ed = toDateOnly(new Date(s.all_day ? s.end_at : s.start_at));
    return sd <= dateStr && ed >= dateStr;
  });
}

// 특정 날짜의 오전/오후 사무실 출근자 목록
function officeStaff(
  employees: Employee[],
  schedules: Schedule[],
  referenceDate: Date
): { am: Employee[]; pm: Employee[] } {
  const ds = toDateOnly(referenceDate);
  const cov = coveringSchedules(schedules, ds);
  const am: Employee[] = [];
  const pm: Employee[] = [];
  for (const emp of employees.filter((e) => e.is_active)) {
    let type: ScheduleType = "WORK";
    for (const p of OFFICE_PRIORITY) {
      if (cov.some((s) => s.employee_id === emp.id && s.type === p)) {
        type = p;
        break;
      }
    }
    const o = TYPE_OFFICE[type];
    if (o.am) am.push(emp);
    if (o.pm) pm.push(emp);
  }
  am.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  pm.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { am, pm };
}





