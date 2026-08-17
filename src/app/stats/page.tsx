"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/DataContext";
import { SCHEDULE_TYPE_MAP } from "@/lib/constants";
import type { ScheduleType } from "@/lib/types";
import { Spinner } from "@/components/ui";
import { toCsv, downloadFile } from "@/lib/exportCsv";

export default function StatsPage() {
  const { employees, schedules, reports, loading, error } = useData();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const year = Number(month.slice(0, 4));

  // 해당 월 스케줄 (중첩 포함)
  const monthSchedules = useMemo(() => {
    const [y, m] = [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 0, 23, 59, 59).getTime();
    return schedules.filter((s) => {
      const sd = new Date(s.start_at).getTime();
      const ed = (s.all_day ? new Date(s.end_at) : new Date(s.start_at)).getTime();
      return sd <= end && ed >= start;
    });
  }, [schedules, month]);

  const monthReports = useMemo(
    () => reports.filter((r) => r.report_date.startsWith(month)),
    [reports, month]
  );

  const typeDist = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of monthSchedules) map[s.type] = (map[s.type] ?? 0) + 1;
    return map;
  }, [monthSchedules]);

  const perEmployee = useMemo(() => {
    return employees
      .filter((e) => e.is_active)
      .map((emp) => {
        const my = monthSchedules.filter((s) => s.employee_id === emp.id);
        const counts: Record<string, number> = {};
        for (const s of my) counts[s.type] = (counts[s.type] ?? 0) + 1;
        // 연차 사용일수 (연차 1일, 오전/오후 반차 각 0.5일 차감)
        let usedAnnual = 0;
        for (const s of schedules) {
          if (s.employee_id !== emp.id) continue;
          if (new Date(s.start_at).getFullYear() !== year) continue;
          if (s.type === "ANNUAL") usedAnnual += 1;
          else if (s.type === "HALF_AM" || s.type === "HALF_PM") usedAnnual += 0.5;
        }
        return {
          emp,
          counts,
          reports: monthReports.filter((r) => r.employee_id === emp.id).length,
          usedAnnual,
          allowance: emp.annual_allowance ?? null,
        };
      });
  }, [employees, monthSchedules, monthReports, year]);

  async function handleNotify() {
    setNotifyMsg(null);
    try {
      const r = await fetch("/api/notify");
      const j = await r.json();
      setNotifyMsg(j.ok ? "✅ 알림을 발송했습니다." : `⚠️ 발송 실패: ${j.error ?? ""}`);
    } catch (e) {
      setNotifyMsg(`⚠️ 오류: ${String(e)}`);
    }
  }

  function exportCsv() {
    const rows: (string | number | null)[][] = [
      ["직원", "부서", "지점", "휴가", "연차", "오전반차", "오후반차", "출장", "외근", "재택", "근무", "보고건수", "연차사용", "연차부여", "연차잔여"],
    ];
    perEmployee.forEach((p) => {
      const c = p.counts;
      const remain = p.allowance == null ? null : p.allowance - p.usedAnnual;
      rows.push([
        p.emp.name, p.emp.department, p.emp.branch,
        c.LEAVE ?? 0, c.ANNUAL ?? 0, c.HALF_AM ?? 0, c.HALF_PM ?? 0,
        c.TRIP ?? 0, c.FIELD ?? 0, c.REMOTE ?? 0, c.WORK ?? 0,
        p.reports, p.usedAnnual, p.allowance, remain,
      ]);
    });
    downloadFile(`근태통계_${month}.csv`, toCsv(rows));
  }

  if (loading) return <Spinner />;
    return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">📊 근태/보고 통계</h1>
          <p className="text-xs text-zinc-500">월간 근태 현황, 직원별 집계, 연차 잔여</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            ← 달력
          </Link>
          <button onClick={exportCsv} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
            ⬇ 엑셀/CSV
          </button>
          <button onClick={handleNotify} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            🔔 알림 보내기
          </button>
          <input type="month" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {notifyMsg && <p className="text-sm font-medium text-zinc-600">{notifyMsg}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="월 스케줄" value={monthSchedules.length} accent="text-indigo-600" />
        <StatBox label="월 보고" value={monthReports.length} accent="text-amber-600" />
        <StatBox label="재직 인원" value={employees.filter((e) => e.is_active).length} accent="text-emerald-600" />
        <StatBox label="휴가/연차/출장 합계" value={(typeDist.LEAVE ?? 0) + (typeDist.ANNUAL ?? 0) + (typeDist.HALF_AM ?? 0) + (typeDist.HALF_PM ?? 0) + (typeDist.TRIP ?? 0)} accent="text-rose-600" />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-zinc-900">유형별 건수 ({month})</h2>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(SCHEDULE_TYPE_MAP) as [ScheduleType, { label: string; badge: string }][]).map(([t, info]) => (
            <span key={t} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${info.badge}`}>
              {info.label} {(typeDist[t] ?? 0)}
            </span>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-semibold">직원</th>
              <th className="px-3 py-2 font-semibold">휴가/연차</th>
              <th className="px-3 py-2 font-semibold">반차</th>
              <th className="px-3 py-2 font-semibold">출장/외근</th>
              <th className="px-3 py-2 font-semibold">재택</th>
              <th className="px-3 py-2 font-semibold">보고</th>
              <th className="px-3 py-2 font-semibold">연차(사용/잔여)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {perEmployee.map((p) => {
              const c = p.counts;
              const remain = p.allowance == null ? null : p.allowance - p.usedAnnual;
              return (
                <tr key={p.emp.id} className="hover:bg-zinc-50/60">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.emp.color }} />
                      <span className="font-medium text-zinc-800">{p.emp.name}</span>
                      <span className="text-xs text-zinc-400">{p.emp.branch ?? ""}{p.emp.team ? `/${p.emp.team}` : ""}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{(c.LEAVE ?? 0) + (c.ANNUAL ?? 0)}</td>
                  <td className="px-3 py-2">{(c.HALF_AM ?? 0) + (c.HALF_PM ?? 0)}</td>
                  <td className="px-3 py-2">{(c.TRIP ?? 0) + (c.FIELD ?? 0)}</td>
                  <td className="px-3 py-2">{c.REMOTE ?? 0}</td>
                  <td className="px-3 py-2">{p.reports}</td>
                  <td className="px-3 py-2">
                    {p.allowance == null
                      ? `${fmtDay(p.usedAnnual)}일 (부여 미설정)`
                      : `${fmtDay(p.usedAnnual)}일 / ${fmtDay(remain)}일`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function fmtDay(n: number | null | undefined): string {
  if (n == null) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function StatBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
