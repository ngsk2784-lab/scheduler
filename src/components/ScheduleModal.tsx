"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Employee, Schedule, ScheduleType, ConfirmationResponse } from "@/lib/types";
import { SCHEDULE_TYPES, toDateOnly } from "@/lib/constants";
import type { ScheduleInput } from "@/lib/supabase";
import * as api from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import {
  Modal,
  Field,
  DangerButton,
  SecondaryButton,
  inputCls,
} from "@/components/ui";

interface Props {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  schedule: Schedule | null; // null = 신규 등록
  defaultDate?: Date;
  defaultEmployeeId?: string;
  onSave: (input: ScheduleInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ScheduleModal({
  open,
  onClose,
  employees,
  schedule,
  defaultDate,
  defaultEmployeeId,
  onSave,
  onDelete,
}: Props) {
  const { user, isAdmin } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ScheduleType>("WORK");
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("18:00");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const effectiveEmployeeId = isAdmin ? employeeId : user?.id ?? "";
  const [confirms, setConfirms] = useState<Record<string, ConfirmationResponse>>({});
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  // 편집 모드일 때 이 일정의 참석 확인 로드
  useEffect(() => {
    if (!open || !schedule) return;
    let alive = true;
    api
      .fetchConfirmations()
      .then((list) => {
        if (!alive) return;
        const m: Record<string, ConfirmationResponse> = {};
        list
          .filter((c) => c.schedule_id === schedule.id)
          .forEach((c) => (m[c.employee_id] = c.response));
        setConfirms(m);
      })
      .catch(() => setConfirmMsg("확인 정보를 불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, [open, schedule]);

  async function saveConfirmations() {
    if (!schedule) return;
    setConfirmMsg(null);
    try {
      const active = employees.filter((e) => e.is_active);
      for (const e of active) {
        await api.saveConfirmation({
          schedule_id: schedule.id,
          employee_id: e.id,
          response: confirms[e.id] ?? "pending",
        });
      }
      setConfirmMsg("✅ 참석 확인을 저장했습니다.");
    } catch (err) {
      console.error(err);
      setConfirmMsg("저장에 실패했습니다.");
    }
  }

  // 열릴 때마다 폼 초기화
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    const base = defaultDate ?? new Date();
    const baseStr = toDateOnly(base);
    const defaultEmp =
      defaultEmployeeId && employees.some((e) => e.id === defaultEmployeeId)
        ? defaultEmployeeId
        : employees[0]?.id ?? "";

    if (schedule) {
      setEmployeeId(schedule.employee_id);
      setTitle(schedule.title);
      setType(schedule.type);
      setAllDay(schedule.all_day);
      const s = new Date(schedule.start_at);
      const e = new Date(schedule.end_at);
      setStartDate(toDateOnly(s));
      setStartTime(schedule.all_day ? "09:00" : toLocalTime(s));
      setEndDate(toDateOnly(e));
      setEndTime(schedule.all_day ? "18:00" : toLocalTime(e));
      setDescription(schedule.description ?? "");
    } else {
      setEmployeeId(defaultEmp);
      setTitle("");
      setType("WORK");
      setAllDay(true);
      setStartDate(baseStr);
      setEndDate(baseStr);
      setStartTime("09:00");
      setEndTime("18:00");
      setDescription("");
    }
  }, [open, schedule, defaultDate, defaultEmployeeId, employees]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return setMsg("로그인 후 이용해 주세요. (우측 상단 🔐)");
    if (schedule && !isAdmin && schedule.employee_id !== user.id)
      return setMsg("본인 일정만 수정할 수 있습니다.");
    if (!effectiveEmployeeId) return setMsg("직원을 선택해 주세요.");
    if (!title.trim()) return setMsg("일정명을 입력해 주세요.");
    if (!startDate || !endDate) return setMsg("날짜를 선택해 주세요.");

    const startAt = allDay
      ? new Date(`${startDate}T00:00`)
      : new Date(`${startDate}T${startTime || "09:00"}`);
    const endAt = allDay
      ? new Date(`${endDate}T23:59`)
      : new Date(`${endDate}T${endTime || "18:00"}`);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()))
      return setMsg("날짜 형식이 올바르지 않습니다.");
    if (endAt.getTime() < startAt.getTime())
      return setMsg("종료 일시는 시작 일시보다 이전일 수 없습니다.");

    // 종일 체크가 유형과 어긋나면 반차 구간은 종일이 아닌 것으로 보정
    const finalAllDay = type === "HALF_AM" || type === "HALF_PM" ? false : allDay;

    setSaving(true);
    setMsg(null);
    try {
      await onSave(
        {
          employee_id: effectiveEmployeeId,
          title: title.trim(),
          type,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          all_day: finalAllDay,
          description: description.trim() || null,
        },
        schedule?.id
      );
      onClose();
    } catch (err) {
      console.error(err);
      setMsg("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function pickType(t: ScheduleType) {
    setType(t);
    if (t === "HALF_AM") {
      setAllDay(false);
      setStartTime("09:00");
      setEndTime("13:00");
    } else if (t === "HALF_PM") {
      setAllDay(false);
      setStartTime("13:00");
      setEndTime("18:00");
    }
  }

  async function handleDelete() {
    if (!schedule || !onDelete) return;
    if (!window.confirm("이 스케줄을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await onDelete(schedule.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={schedule ? "스케줄 수정" : "새 스케줄 등록"}
      footer={
        <>
          {schedule && onDelete && (
            <div className="mr-auto">
              <DangerButton onClick={handleDelete}>삭제</DangerButton>
            </div>
          )}
          <SecondaryButton onClick={onClose}>취소</SecondaryButton>
          <button
            type="submit"
            form="schedule-form"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Field label="직원">
            {isAdmin ? (
              <select
                className={inputCls}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">-- 직원 선택 --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.is_active ? "" : " (퇴사)"}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-600">
                {user?.name ?? "로그인 필요"} {isAdmin ? "" : " (본인)"}
              </div>
            )}
          </Field>

          <Field label="일정명">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 고객사 미팅, 본사 출장"
            />
          </Field>

          <Field label="유형">
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => pickType(t.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    type === t.value ? "bg-indigo-600 text-white" : t.badge
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            종일 일정
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일">
              <input
                type="date"
                className={inputCls}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="종료일">
              <input
                type="date"
                className={inputCls}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
            {!allDay && (
              <>
                <Field label="시작 시간">
                  <input
                    type="time"
                    className={inputCls}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Field>
                <Field label="종료 시간">
                  <input
                    type="time"
                    className={inputCls}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>

          <Field label="메모 (선택)">
            <textarea
              className={`${inputCls} min-h-[70px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="세부 내용이나 준비물 메모"
            />
          </Field>

          {msg && <p className="text-sm font-medium text-rose-600">{msg}</p>}
          {schedule && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-700">
                  🙋 참석 확인
                </span>
                <button
                  type="button"
                  onClick={saveConfirmations}
                  className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700"
                >
                  확인 저장
                </button>
              </div>
              <div className="space-y-1">
                {employees
                  .filter((e) => e.is_active)
                  .map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-16 truncate">{e.name}</span>
                      <select
                        className="flex-1 rounded border border-zinc-300 bg-white px-1.5 py-1"
                        value={confirms[e.id] ?? "pending"}
                        onChange={(ev) =>
                          setConfirms((prev) => ({
                            ...prev,
                            [e.id]: ev.target.value as ConfirmationResponse,
                          }))
                        }
                      >
                        <option value="pending">미정</option>
                        <option value="yes">✅ 참석</option>
                        <option value="maybe">🤔 보류</option>
                        <option value="no">❌ 불참</option>
                      </select>
                    </label>
                  ))}
              </div>
              {confirmMsg && (
                <p className="mt-1 text-xs font-medium text-violet-700">{confirmMsg}</p>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function toLocalTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
