"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/DataContext";
import type { Employee } from "@/lib/types";
import { EmployeeModal } from "@/components/EmployeeModal";
import { Spinner, inputCls } from "@/components/ui";
import type { EmployeeInput } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function EmployeesPage() {
  const { employees, loading, error, saveEmployee, removeEmployee } = useData();
  const { isAdmin } = useAuth();
  const [modal, setModal] = useState<{
    open: boolean;
    employee: Employee | null;
  }>({ open: false, employee: null });
  const [branchFilter, setBranchFilter] = useState("");

  const branches = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => e.branch && s.add(e.branch));
    return Array.from(s).sort();
  }, [employees]);

  const list = useMemo(
    () =>
      employees.filter((e) => !branchFilter || e.branch === branchFilter),
    [employees, branchFilter]
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">👥 직원 관리</h1>
          <p className="text-xs text-zinc-500">
            직원을 등록하고 달력에 표시할 색상을 지정하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            ← 달력으로
          </Link>
          {isAdmin && (
            <button
              onClick={() => setModal({ open: true, employee: null })}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              ＋ 새 직원 등록
            </button>
          )}
        </div>
      </div>

      <div className={inputCls.replace("w-full", "w-auto")}>
        <select
          className="w-auto bg-transparent outline-none"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="">전체 지점</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              🏢 {b}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-400">
          {employees.length === 0
            ? "등록된 직원이 없습니다. 새 직원을 추가해 주세요."
            : "해당 지점에 직원이 없습니다."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">직원</th>
                <th className="px-4 py-3 font-semibold">지점/부서</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  팀/직급
                </th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  연락처
                </th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 text-right font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: e.color }}
                      >
                        {e.name.slice(0, 1)}
                      </span>
                      <div>
                        <div className="font-semibold text-zinc-900">
                          {e.name}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {e.department ?? "부서 미지정"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {e.branch ?? "—"}
                    {e.branch && e.department ? ` / ${e.department}` : ""}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell">
                    {[e.team, e.position].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-zinc-600 md:table-cell">
                    {e.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {e.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        재직
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                        퇴사
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <button
                        onClick={() => setModal({ open: true, employee: e })}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                      >
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeModal
        open={modal.open}
        onClose={() => setModal({ open: false, employee: null })}
        employee={modal.employee}
        onSave={(input: EmployeeInput, id?: string) =>
          saveEmployee(input, id)
        }
        onDelete={(id: string) => removeEmployee(id)}
      />
    </div>
  );
}
