"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import type { Attendance } from "@/lib/types";
import { toDateOnly } from "@/lib/constants";
import * as api from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import {
  makeCharacter,
  buildPalette,
  PLANT_GRID,
  WINDOW_GRID,
  PixelSprite,
} from "@/components/pixels";
import { OfficeScene, type SceneChar } from "@/components/OfficeScene";

const roomPalette = buildPalette("#3b82f6", "#4a3b3f");

const pad = (n: number) => String(n).padStart(2, "0");

function toMin(hm: string | null | undefined): number {
  if (!hm) return -1;
  const [h, m] = hm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

// 점심시간 12:00 ~ 13:30 (분 단위)
const LUNCH_AM = 720; // 12:00
const LUNCH_PM = 810; // 13:30

// 사무실(책상)에서 근무하는 출근부 상태
const OFFICE_STATUSES = new Set(["present", "half", "duty"]);

export default function OfficePage() {
  const { employees, loading, error } = useData();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  // 현재 시각 (실시간 반영용)
  const [now, setNow] = useState<Date>(() => new Date());

  // 이번 달 출근부 로드
  useEffect(() => {
    let alive = true;
    api
      .fetchAttendance(toDateOnly(new Date()).slice(0, 7))
      .then((rows) => {
        if (alive) setAttendance(rows);
      })
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, []);

  // 현재 시각 30초마다 갱신 (출근/퇴근/점심 구간 반영)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const active = useMemo(() => employees.filter((e) => e.is_active), [employees]);
  const todayStr = toDateOnly(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const lunch = nowMin >= LUNCH_AM && nowMin < LUNCH_PM;

  // 출근부 기준: 출근 시간 이후 ~ 퇴근 시간 이전이면 사무실에 표시
  const present = useMemo<SceneChar[]>(() => {
    const todayAtt = attendance.filter((a) => a.att_date === todayStr);
    return active
      .map((e, i) => {
        const rec = todayAtt.find((a) => a.employee_id === e.id);
        if (!rec || !OFFICE_STATUSES.has(rec.status)) return null;
        const tin = toMin(rec.time_in);
        const tout = toMin(rec.time_out);
        if (tin < 0 || nowMin < tin) return null; // 아직 출근 전
        if (tout >= 0 && nowMin >= tout) return null; // 퇴근 이후
        return {
          id: e.id,
          name: e.name,
          position: e.position,
          color: e.color,
          char: makeCharacter(i, e.color),
        };
      })
      .filter((x): x is SceneChar => x !== null);
  }, [active, attendance, todayStr, nowMin]);

  const lightsOff = present.length === 0;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">🏢 사무실</h1>
          <p className="text-sm text-zinc-500">출근부 기준 · 현재 시각 반영</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-zinc-500">
            {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
          </div>
          <div className="text-2xl font-bold tabular-nums text-zinc-900">
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">사무실 {present.length}명</span>
        {lunch && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">🍚 점심시간 (12:00~13:30)</span>
        )}
        {lightsOff && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-500">💡 형광등 꺼짐</span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-300 shadow-sm">
        <div className="relative flex h-24 items-center justify-center gap-6 border-b-4 border-zinc-400 bg-zinc-300">
          <PixelSprite grid={WINDOW_GRID} palette={roomPalette} size={4} />
          <PixelSprite grid={PLANT_GRID} palette={roomPalette} size={4} />
          <PixelSprite grid={WINDOW_GRID} palette={roomPalette} size={4} />
        </div>

        <OfficeScene present={present} lunch={lunch} />

        {lightsOff && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/80">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-3 text-center text-sm font-semibold text-zinc-200 shadow-lg">
              💡 형광등이 꺼져 있습니다
              <div className="mt-0.5 text-xs font-normal text-zinc-400">지금은 사무실에 아무도 없어요</div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        출근부 기준 출근 시간이 지나면 캐릭터가 책상에서 근무합니다. 12:00~13:30은
        책상에서 점심을 먹고, 퇴근 시간이 지나면 화면에 나타나지 않습니다. 사무실에
        아무도 없으면 형광등이 꺼집니다.
      </p>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {present.map((p) => (
          <span key={p.id} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-600">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}