"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import type { Employee, Schedule, ScheduleType } from "@/lib/types";
import { toDateInput, toDateOnly } from "@/lib/constants";
import { Spinner } from "@/components/ui";
import { makeCharacter, buildPalette, PLANT_GRID, WINDOW_GRID, PixelSprite } from "@/components/pixels";
import { OfficeScene, type SceneChar } from "@/components/OfficeScene";

// ─────────────────────────────────────────────────────────────
// 날짜 기준 근태 상태 판정 (page.tsx 의 로직과 동일)
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

const roomPalette = buildPalette("#3b82f6", "#4a3b3f");

export default function OfficePage() {
  const { employees, schedules, loading, error } = useData();
  const [selDate, setSelDate] = useState<string>(() => toDateInput(new Date()));
  const dateStr = toDateOnly(new Date(selDate));

  const active = useMemo(
    () => employees.filter((e) => e.is_active),
    [employees]
  );

  const statuses = useMemo(() => {
    const map = new Map<string, EmpStatus>();
    for (const e of active) map.set(e.id, statusOf(e, schedules, dateStr));
    return map;
  }, [active, schedules, dateStr]);

  // 사무실에 있는 직원 (출근/오전·오후 출근 가능)
  const present = useMemo((): SceneChar[] => {
    return active
      .map((e, i) => {
        const st = statuses.get(e.id);
        const atOffice = !!st && (st.atOfficeAm || st.atOfficePm);
        return atOffice
          ? { id: e.id, name: e.name, color: e.color, char: makeCharacter(i, e.color) }
          : null;
      })
      .filter((x): x is SceneChar => x !== null);
  }, [active, statuses]);

  // 외근/출장 직원 (전화 이벤트용)
  const outCall = useMemo((): SceneChar[] => {
    return active
      .map((e, i) => {
        const st = statuses.get(e.id);
        return st && (st.type === "FIELD" || st.type === "TRIP")
          ? { id: e.id, name: e.name, color: e.color, char: makeCharacter(i, e.color) }
          : null;
      })
      .filter((x): x is SceneChar => x !== null);
  }, [active, statuses]);

  const counts = useMemo(() => {
    const c = { office: 0, field: 0, trip: 0, remote: 0, off: 0 };
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
            도트 생활 시뮬레이션 — 선택한 날짜의 사무실
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
        {/* 바닥 + 시뮬레이션 */}
        <OfficeScene present={present} out={outCall} />
      </div>

      <p className="text-xs text-zinc-400">
        💡 외근/출장 직원에게 전화가 걸려오면 사무실 안에서 받는 연출이 나옵니다.
      </p>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {present.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-600"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}