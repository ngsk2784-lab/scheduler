"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import type { Employee, Schedule, ScheduleType } from "@/lib/types";
import { toDateInput, toDateOnly } from "@/lib/constants";
import { Spinner } from "@/components/ui";
import {
  PixelSprite,
  makeCharacter,
  makeDesk,
  buildPalette,
  PLANT_GRID,
  WINDOW_GRID,
} from "@/components/pixels";

// ─────────────────────────────────────────────────────────────
// 날짜 기준 근태 상태 판정 (page.tsx 의 TYPE_OFFICE / OFFICE_PRIORITY 와 동일)
// ─────────────────────────────────────────────────────────────
const TYPE_OFFICE: Record<ScheduleType, { am: boolean; pm: boolean }> = {
  WORK: { am: true, pm: true },
  LEAVE: { am: false, pm: false },
  ANNUAL: { am: false, pm: false },
  HALF: { am: false, pm: false },
  HALF_AM: { am: false, pm: true },
  HALF_PM: { am: true, pm: false },
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

interface EmpStatus {
  type: ScheduleType;
  atOfficeAm: boolean;
  atOfficePm: boolean;
}

function statusOf(
  emp: Employee,
  schedules: Schedule[],
  dateStr: string
): EmpStatus {
  const cov = coveringSchedules(schedules, dateStr);
  let type: ScheduleType = "WORK";
  for (const p of OFFICE_PRIORITY) {
    if (cov.some((s) => s.employee_id === emp.id && s.type === p)) {
      type = p;
      break;
    }
  }
  const o = TYPE_OFFICE[type];
  return { type, atOfficeAm: o.am, atOfficePm: o.pm };
}

// 상태 → 라벨/색
const STATUS_LABEL: Record<ScheduleType, string> = {
  WORK: "출근",
  LEAVE: "휴가·연차",
  ANNUAL: "휴가·연차",
  HALF: "반차",
  HALF_AM: "반차",
  HALF_PM: "반차",
  TRIP: "출장중",
  FIELD: "외근중",
  REMOTE: "재택중",
  OTHER: "자리비움",
};
const STATUS_CLS: Record<ScheduleType, string> = {
  WORK: "bg-sky-500 text-white",
  LEAVE: "bg-rose-500 text-white",
  ANNUAL: "bg-rose-500 text-white",
  HALF: "bg-orange-500 text-white",
  HALF_AM: "bg-orange-500 text-white",
  HALF_PM: "bg-orange-500 text-white",
  TRIP: "bg-violet-500 text-white",
  FIELD: "bg-amber-500 text-white",
  REMOTE: "bg-green-600 text-white",
  OTHER: "bg-zinc-400 text-white",
};

const roomPalette = buildPalette("#3b82f6", "#4a3b3f");

export default function OfficePage() {
  const { employees, schedules, loading, error } = useData();
  const [selDate, setSelDate] = useState<string>(() => toDateInput(new Date()));

  const dateStr = toDateOnly(new Date(selDate));

  const active = useMemo(
    () => employees.filter((e) => e.is_active),
    [employees]
  );
  const inactive = useMemo(
    () => employees.filter((e) => !e.is_active),
    [employees]
  );

  const statuses = useMemo(() => {
    const map = new Map<string, EmpStatus>();
    for (const e of active) map.set(e.id, statusOf(e, schedules, dateStr));
    return map;
  }, [active, schedules, dateStr]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      office: 0,
      field: 0,
      trip: 0,
      remote: 0,
      off: 0,
    };
    for (const st of statuses.values()) {
      if (st.atOfficePm || st.atOfficeAm) c.office += 1;
      else if (st.type === "FIELD") c.field += 1;
      else if (st.type === "TRIP") c.trip += 1;
      else if (st.type === "REMOTE") c.remote += 1;
      else c.off += 1;
    }
    return c;
  }, [statuses]);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        데이터를 불러오지 못했습니다. 서버 연결을 확인해 주세요.
      </div>
    );
  }
return (
    <div className="space-y-4">
      {/* 상단 툴바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">🏢 사무실</h1>
          <p className="text-sm text-zinc-500">
            도트맵으로 보는 선택한 날짜의 사무실 출근 현황
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm">
          <span className="font-medium text-zinc-600">날짜</span>
          <input
            type="date"
            value={selDate}
            onChange={(e) => e.target.value && setSelDate(e.target.value)}
            className="bg-transparent outline-none"
          />
        </label>
      </div>

      {/* 요약 배지 */}
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
          사무실 {counts.office}명
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
          외근 {counts.field}명
        </span>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
          출장 {counts.trip}명
        </span>
        <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
          재택 {counts.remote}명
        </span>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
          휴가·연차 {counts.off}명
        </span>
      </div>

      {/* 사무실 도트맵 */}
      <div className="overflow-hidden rounded-2xl border border-zinc-300 shadow-sm">
        {/* 벽 (창문/화분) */}
        <div className="relative flex h-24 items-center justify-center gap-6 border-b-4 border-zinc-400 bg-zinc-300">
          <PixelSprite grid={WINDOW_GRID} palette={roomPalette} size={4} />
          <PixelSprite grid={PLANT_GRID} palette={roomPalette} size={4} />
          <PixelSprite grid={WINDOW_GRID} palette={roomPalette} size={4} />
        </div>
        {/* 바닥 타일 */}
        <div
          className="bg-[#d8d2c4]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {active.map((emp, i) => {
                const st =
                  statuses.get(emp.id) ?? statusOf(emp, schedules, dateStr);
                const char = makeCharacter(i, emp.color);
                const desk = makeDesk(emp.color);
                return (
                  <div
                    key={emp.id}
                    className="flex flex-col items-center rounded-xl border-2 border-zinc-200/80 bg-white/70 px-2 py-3 shadow-sm backdrop-blur-sm"
                  >
                    <span
                      className={`mb-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CLS[st.type]}`}
                    >
                      {STATUS_LABEL[st.type]}
                    </span>

                    {/* 책상 + 캐릭터 */}
                    <div className="relative flex flex-col items-center">
                      <div className="z-10 -mb-2">
                        <PixelSprite
                          grid={char.grid}
                          palette={char.palette}
                          size={4}
                          title={emp.name}
                          className="drop-shadow-sm"
                        />
                      </div>
                      <PixelSprite
                        grid={desk.grid}
                        palette={desk.palette}
                        size={4}
                      />
                    </div>

                    {/* 이름 카드 */}
                    <div className="mt-2 w-full border-t border-zinc-200 pt-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-zinc-800">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: emp.color }}
                        />
                        {emp.name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {[emp.team, emp.position].filter(Boolean).join(" · ") ||
                          "직원"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 비활성 직원 안내 */}
      {inactive.length > 0 && (
        <p className="text-xs text-zinc-400">
          표시 제외 (비활성): {inactive.map((e) => e.name).join(", ")}
        </p>
      )}
    </div>
  );
}