"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Employee, Report, ReportSource } from "@/lib/types";
import { toDateOnly } from "@/lib/constants";
import type { ReportInput } from "@/lib/supabase";
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
  report: Report | null;
  defaultDate?: Date;
  onSave: (input: ReportInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ReportModal({
  open,
  onClose,
  employees,
  report,
  defaultDate,
  onSave,
  onDelete,
}: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [source, setSource] = useState<ReportSource>("manual");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [pasteLog, setPasteLog] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setPasteLog("");
    if (report) {
      setEmployeeId(report.employee_id);
      setDate(report.report_date);
      setSource(report.source);
      setSummary(report.summary ?? "");
      setContent(report.content);
      setTags((report.tags ?? []).join(", "));
    } else {
      setEmployeeId(employees[0]?.id ?? "");
      setDate(defaultDate ? toDateOnly(defaultDate) : toDateOnly(new Date()));
      setSource("manual");
      setSummary("");
      setContent("");
      setTags("");
    }
  }, [open, report, defaultDate, employees]);

  // 카톡 로그에서 대화 내용을 추출 (간편 도움 기능)
  function applyPaste() {
    if (!pasteLog.trim()) return;
    setContent(parseKakaoLog(pasteLog));
    if (!summary.trim()) setSummary("단톡방 보고");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId) return setMsg("직원을 선택해 주세요.");
    if (!date) return setMsg("보고 날짜를 선택해 주세요.");
    if (!content.trim()) return setMsg("보고 내용을 입력해 주세요.");

    setSaving(true);
    setMsg(null);
    try {
      await onSave(
        {
          employee_id: employeeId,
          report_date: date,
          source,
          summary: summary.trim() || null,
          content: content.trim(),
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        },
        report?.id
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
    if (!report || !onDelete) return;
    if (!window.confirm("이 보고 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await onDelete(report.id);
    onClose();
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={report ? "보고 수정" : "새 보고 기록"}
      footer={
        <>
          {report && onDelete && (
            <div className="mr-auto">
              <DangerButton onClick={handleDelete}>삭제</DangerButton>
            </div>
          )}
          <SecondaryButton onClick={onClose}>취소</SecondaryButton>
          <button type="submit" form="report-form" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "저장 중..." : "저장"}
          </button>
        </>
      }
    >
      <form id="report-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="보고한 날짜">
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="보고 원천">
              <div className="flex gap-1.5">
                {(
                  [
                    { v: "manual", l: "✍️ 수기" },
                    { v: "kakao", l: "💬 카톡 단톡방" },
                  ] as { v: ReportSource; l: string }[]
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setSource(o.v)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      source === o.v
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="직원">
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
          </Field>

          <Field label="요약 (선택)">
            <input
              className={inputCls}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="예: 오전 현장 보고 / 고객사 미팅 결과"
            />
          </Field>

          <Field label="보고 내용 (무슨 이야기를 했는지)">
            <textarea
              className={`${inputCls} min-h-[120px] resize-y`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="그 날 보고한 내용/논의한 내용을 입력하세요."
            />
          </Field>

          <Field label="태그 (선택, 쉼표로 구분)">
            <input
              className={inputCls}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 미팅, 고객사, 결재"
            />
          </Field>

          {source === "kakao" && (
            <div className="rounded-xl border border-dashed border-yellow-300 bg-yellow-50 p-3">
              <div className="mb-1.5 text-sm font-semibold text-yellow-800">
                💬 카톡 단톡방 로그 간편 붙여넣기
              </div>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y bg-white`}
                value={pasteLog}
                onChange={(e) => setPasteLog(e.target.value)}
                placeholder="단톡방에서 복사한 내용을 붙여 넣고 '적용'을 누르면 보고 내용으로 정리됩니다."
              />
              <button
                type="button"
                onClick={applyPaste}
                className="mt-2 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
              >
                보고 내용으로 적용
              </button>
            </div>
          )}

          {msg && <p className="text-sm font-medium text-rose-600">{msg}</p>}
        </div>
      </form>
    </Modal>
  );
}

// 카톡 로그 문자열을 읽기 좋게 정리
function parseKakaoLog(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // 날짜/시간/구분선 제거
    if (/^-{3,}/.test(line)) continue;
    if (/\d{4}\s*[./년]\s*\d{1,2}/.test(line) && /(월|시|분|\.)/.test(line)) {
      // 헤더 또는 시간줄
      if (/^[가-힣a-z ]*\d{4}/i.test(line) || line.includes("보낸 시간")) continue;
    }
    if (/^\d{1,2}:\d{2}/.test(line)) continue;
    if (/^(오전|오후)\s*\d{1,2}:\d{2}/.test(line)) continue;
    if (/^(입장하셨습니다|나가셨습니다|초대하셨습니다)/.test(line)) continue;
    // "이름 : 내용" 형태 유지
    out.push(line);
  }
  return out.join("\n");
}

