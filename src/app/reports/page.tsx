"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/DataContext";
import type { Report } from "@/lib/types";
import { REPORT_SOURCES } from "@/lib/constants";
import { ReportModal } from "@/components/ReportModal";
import { Spinner, inputCls } from "@/components/ui";
import type { ReportInput } from "@/lib/supabase";

export default function ReportsPage() {
  const { employees, reports, loading, error, saveReport, removeReport } =
    useData();
  const [modal, setModal] = useState<{ open: boolean; report: Report | null }>(
    { open: false, report: null }
  );
  const [empFilter, setEmpFilter] = useState("");
  const [srcFilter, setSrcFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const filtered = useMemo(() => {
    return reports
      .filter((r) => !empFilter || r.employee_id === empFilter)
      .filter((r) => !srcFilter || r.source === srcFilter)
      .filter((r) => !monthFilter || r.report_date.startsWith(monthFilter))
      .sort((a, b) => (a.report_date < b.report_date ? 1 : -1));
  }, [reports, empFilter, srcFilter, monthFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Report[]>();
    for (const r of filtered) {
      const arr = map.get(r.report_date) ?? [];
      arr.push(r);
      map.set(r.report_date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const empName = (id: string) =>
    employees.find((e) => e.id === id)?.name ?? "?";
  const empColor = (id: string) =>
    employees.find((e) => e.id === id)?.color ?? "#3b82f6";

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">📌 보고 기록</h1>
          <p className="text-xs text-zinc-500">
            카톡 단톡방 보고 또는 수기로 기록한 내용을 모아봅니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            ← 달력으로
          </Link>
          <button
            onClick={() => setModal({ open: true, report: null })}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            ＋ 보고 등록
          </button>
        </div>
      </div>
      {/* 필터 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select
          className={inputCls}
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
        >
          <option value="">전체 직원</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={srcFilter}
          onChange={(e) => setSrcFilter(e.target.value)}
        >
          <option value="">전체 원천</option>
          <option value="manual">✍️ 수기</option>
          <option value="kakao">💬 카톡 단톡방</option>
        </select>
        <input
          type="month"
          className={inputCls}
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        />
        <button
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          onClick={() => {
            setEmpFilter("");
            setSrcFilter("");
            setMonthFilter("");
          }}
        >
          필터 초기화
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-400">
          기록된 보고가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, list]) => (
            <section
              key={date}
              className="rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <header className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-700">
                📆 {formatDate(date)}
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {list.length}건
                </span>
              </header>
              <div className="divide-y divide-zinc-100">
                {list.map((r) => {
                  const src = REPORT_SOURCES[r.source];
                  return (
                    <button
                      key={r.id}
                      onClick={() => setModal({ open: true, report: r })}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                    >
                      <span
                        className="mt-1 h-8 w-8 shrink-0 rounded-lg text-center font-bold leading-8 text-white"
                        style={{ backgroundColor: empColor(r.employee_id) }}
                      >
                        {empName(r.employee_id).slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-900">
                            {empName(r.employee_id)}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${src.badge}`}
                          >
                            {src.icon} {src.label}
                          </span>
                          {r.summary && (
                            <span className="text-xs font-medium text-zinc-500">
                              · {r.summary}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                          {r.content}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <ReportModal
        open={modal.open}
        onClose={() => setModal({ open: false, report: null })}
        employees={employees}
        report={modal.report}
        onSave={(input: ReportInput, id?: string) => saveReport(input, id)}
        onDelete={(id: string) => removeReport(id)}
      />
    </div>
  );
}

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

