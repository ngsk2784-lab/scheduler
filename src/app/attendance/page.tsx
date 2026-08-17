"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/DataContext";
import { toDateOnly } from "@/lib/constants";
import type { Attendance, AttendanceStatus } from "@/lib/types";
import * as api from "@/lib/supabase";
import { Spinner, inputCls } from "@/components/ui";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "출근",
  absent: "결근",
  half: "반차",
  vacation: "휴가",
  duty: "당직",
};
const STATUS_BADGE: Record<AttendanceStatus, string> = {
  present: "bg-sky-100 text-sky-700",
  absent: "bg-rose-100 text-rose-700",
  half: "bg-orange-100 text-orange-700",
  vacation: "bg-fuchsia-100 text-fuchsia-700",
  duty: "bg-violet-100 text-violet-700",
};

export default function AttendancePage() {
  const { employees, loading, error } = useData();
  const [date, setDate] = useState("");
  const [records, setRecords] = useState<Attendance[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Attendance>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setDate(toDateOnly(new Date()));
    api
      .fetchAttendance()
      .then(setRecords)
      .catch((e) => console.error(e));
  }, []);

  const active = useMemo(() => employees.filter((e) => e.is_active), [employees]);

  function draftFor(empId: string): Partial<Attendance> {
    const existing = records.find((r) => r.employee_id === empId && r.att_date === date);
    return drafts[empId] ?? {
      status: existing?.status ?? "present",
      time_in: existing?.time_in ?? "",
      time_out: existing?.time_out ?? "",
      note: existing?.note ?? "",
    };
  }

  function setDraft(empId: string, patch: Partial<Attendance>) {
    setDrafts((prev) => ({ ...prev, [empId]: { ...draftFor(empId), ...patch } }));
  }

  async function saveRow(empId: string, name: string) {
    setBusy(empId);
    const d = draftFor(empId);
    try {
      await api.saveAttendance({
        employee_id: empId,
        att_date: date,
        status: (d.status as AttendanceStatus) ?? "present",
        time_in: (d.time_in as string) || null,
        time_out: (d.time_out as string) || null,
        note: (d.note as string) || null,
      });
      const all = await api.fetchAttendance();
      setRecords(all);
      setDrafts((prev) => {
        const n = { ...prev };
        delete n[empId];
        return n;
      });
      alert(`${name} 기록 저장 완료`);
    } catch {
      alert("저장 실패");
    } finally {
      setBusy(null);
    }
  }

  const daySummary = records.filter((r) => r.att_date === date);

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
          <h1 className="text-lg font-bold text-zinc-900">🗓️ 출근부</h1>
          <p className="text-xs text-zinc-500">일별 출근/결근/반차/당직 기록</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            ← 달력
          </Link>
          <input type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
        {(["present", "absent", "half", "vacation", "duty"] as AttendanceStatus[]).map((s) => (
          <span key={s} className={`rounded-full px-2 py-1 font-semibold ${STATUS_BADGE[s]}`}>
            {STATUS_LABELS[s]} {daySummary.filter((r) => r.status === s).length}
          </span>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-semibold">직원</th>
              <th className="px-3 py-2 font-semibold">상태</th>
              <th className="px-3 py-2 font-semibold">출근</th>
              <th className="px-3 py-2 font-semibold">퇴근</th>
              <th className="px-3 py-2 font-semibold">메모</th>
              <th className="px-3 py-2 font-semibold">저장</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {active.map((emp) => {
              const d = draftFor(emp.id);
              return (
                <tr key={emp.id} className="hover:bg-zinc-50/60">
                  <td className="px-3 py-2">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: emp.color }} />
                    <span className="font-medium">{emp.name}</span>
                    <span className="ml-1 text-xs text-zinc-400">{emp.branch ?? ""}</span>
                  </td>
                  <td className="px-3 py-2">
                    <select className={inputCls} value={d.status as string} onChange={(e) => setDraft(emp.id, { status: e.target.value as AttendanceStatus })}>
                      {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="time" className={inputCls} value={(d.time_in as string) ?? ""} onChange={(e) => setDraft(emp.id, { time_in: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="time" className={inputCls} value={(d.time_out as string) ?? ""} onChange={(e) => setDraft(emp.id, { time_out: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={(d.note as string) ?? ""} onChange={(e) => setDraft(emp.id, { note: e.target.value })} placeholder="메모" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => saveRow(emp.id, emp.name)} disabled={busy === emp.id} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                      {busy === emp.id ? "저장 중..." : "저장"}
                    </button>
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
