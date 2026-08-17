"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Employee } from "@/lib/types";
import { EMPLOYEE_COLORS } from "@/lib/constants";
import type { EmployeeInput } from "@/lib/supabase";
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
  employee: Employee | null; // null = 신규
  onSave: (input: EmployeeInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function EmployeeModal({
  open,
  onClose,
  employee,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(EMPLOYEE_COLORS[0].value);
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [team, setTeam] = useState("");
  const [annualAllowance, setAnnualAllowance] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    if (employee) {
      setName(employee.name);
      setColor(employee.color);
      setPosition(employee.position ?? "");
      setDepartment(employee.department ?? "");
      setPhone(employee.phone ?? "");
      setBranch(employee.branch ?? "");
      setTeam(employee.team ?? "");
      setAnnualAllowance(employee.annual_allowance == null ? "" : String(employee.annual_allowance));
      setIsActive(employee.is_active);
    } else {
      setName("");
      setColor(EMPLOYEE_COLORS[0].value);
      setPosition("");
      setDepartment("");
      setPhone("");
      setBranch("");
      setTeam("");
      setAnnualAllowance("");
      setIsActive(true);
    }
  }, [open, employee]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setMsg("이름을 입력해 주세요.");
    if (!/^#[0-9a-fA-F]{6}$/.test(color))
      return setMsg("색상 코드가 올바르지 않습니다.");

    const annual =
      annualAllowance.trim() === "" ? null : Number(annualAllowance);

    setSaving(true);
    setMsg(null);
    try {
      await onSave(
        {
          name: name.trim(),
          color,
          position: position.trim() || null,
          department: department.trim() || null,
          phone: phone.trim() || null,
          branch: branch.trim() || null,
          team: team.trim() || null,
          annual_allowance: Number.isNaN(annual as number) ? null : annual,
          is_active: isActive,
        },
        employee?.id
      );
      onClose();
    } catch (err) {
      console.error(err);
      setMsg("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee || !onDelete) return;
    if (
      !window.confirm(
        "직원을 삭제하면 관련 스케줄과 보고 기록도 함께 삭제됩니다.\n정말 삭제할까요?"
      )
    )
      return;
    await onDelete(employee.id);
    onClose();
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? "직원 수정" : "새 직원 등록"}
      footer={
        <>
          {employee && onDelete && (
            <div className="mr-auto">
              <DangerButton onClick={handleDelete}>삭제</DangerButton>
            </div>
          )}
          <SecondaryButton onClick={onClose}>취소</SecondaryButton>
          <button type="submit" form="employee-form" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "저장 중..." : "저장"}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white shadow"
              style={{ backgroundColor: color }}
            >
              {name.trim() ? name.trim().slice(0, 1) : "?"}
            </div>
            <Field label="이름" className="flex-1">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
              />
            </Field>
          </div>

          <Field label="달력 표시 색상">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {EMPLOYEE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`aspect-square rounded-lg border-2 transition-transform ${
                    color === c.value
                      ? "scale-110 border-zinc-900 ring-2 ring-zinc-300"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-zinc-300"
              />
              <input
                className={`${inputCls} w-32`}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="직급">
              <input
                className={inputCls}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="대리, 과장..."
              />
            </Field>
            <Field label="부서">
              <input
                className={inputCls}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="영업팀..."
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="지점/사업장">
              <input
                className={inputCls}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="본사, 2호점..."
              />
            </Field>
            <Field label="팀">
              <input
                className={inputCls}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="팀명 (선택)"
              />
            </Field>
          </div>

          <Field label="연차 부여일수 (선택, 통계용)">
            <input
              type="number"
              min={0}
              step={0.5}
              className={inputCls}
              value={annualAllowance}
              onChange={(e) => setAnnualAllowance(e.target.value)}
              placeholder="예: 15 또는 15.5"
            />
            <span className="mt-1 block text-[11px] text-zinc-400">
              반차(0.5일) 포함 소수 입력 가능
            </span>
          </Field>

          <Field label="연락처 (선택)">
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            재직 중 (해제하면 퇴사 처리)
          </label>

          {msg && <p className="text-sm font-medium text-rose-600">{msg}</p>}
        </div>
      </form>
    </Modal>
  );
}

