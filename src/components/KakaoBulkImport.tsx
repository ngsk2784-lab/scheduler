"use client";

import { useMemo, useRef, useState } from "react";
import type { Employee } from "@/lib/types";
import { parseKakaoExport, type ParsedKakaoEntry } from "@/lib/parseKakao";
import { Modal, PrimaryButton, SecondaryButton, inputCls } from "@/components/ui";

export interface BulkReport {
  employeeId: string;
  date: string;
  summary: string;
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onRegister: (reports: BulkReport[]) => Promise<void>;
}

export function KakaoBulkImport({ open, onClose, employees, onRegister }: Props) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [entries, setEntries] = useState<ParsedKakaoEntry[] | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const empByName = useMemo(
    () => new Map(employees.map((e) => [e.name.trim(), e])),
    [employees]
  );

  // 이름 ↔ 직원 매칭 결과
  const matched = useMemo(() => {
    if (!entries) return [];
    return entries.map((e) => ({
      entry: e,
      emp: empByName.get(e.name.trim()),
      key: `${e.date}|${e.name}`,
    }));
  }, [entries, empByName]);

  const unmatched = matched.filter((m) => !m.emp);
  const summaryStats = useMemo(() => {
    if (!entries) return null;
    const dates = new Set(entries.map((e) => e.date));
    const people = new Set(entries.map((e) => e.name));
    return {
      days: dates.size,
      msgs: entries.reduce((a, e) => a + e.lines.length, 0),
      people: people.size,
    };
  }, [entries]);

  function runParse() {
    setMsg(null);
    if (!text.trim() && !fileName) {
      setMsg("내보낸 로그(텍스트/CSV)를 붙여넣거나 파일을 선택해 주세요.");
      return;
    }
    const parsed = parseKakaoExport(text.trim());
    setEntries(parsed);
    const c: Record<string, boolean> = {};
    const seen = new Set<string>();
    parsed.forEach((e) => {
      const key = `${e.date}|${e.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      c[key] = true;
    });
    setChecked(c);
    if (parsed.length === 0) setMsg("파싱된 항목이 없습니다. 형식을 확인해 주세요.");
  }

  function handleFile(f: File) {
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
    };
    reader.readAsText(f, "utf-8");
  }

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  }

  async function handleRegister() {
    if (!entries) return;
    const selected = matched.filter((m) => m.emp && checked[m.key]);
    if (selected.length === 0) {
      setMsg("등록할 항목을 선택하세요. (매칭된 직원만 등록 가능)");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const reports: BulkReport[] = selected.map((m) => ({
        employeeId: m.emp!.id,
        date: m.entry.date,
        summary: m.entry.summary,
        content: m.entry.content,
      }));
      await onRegister(reports);
      setMsg(`✅ ${reports.length}건의 보고를 등록했습니다.`);
      setEntries(null);
      setText("");
      setFileName("");
    } catch (err) {
      console.error(err);
      setMsg("등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="💬 카톡 단톡방 로그 자동 등록"
      wide
      footer={
        <>
          <SecondaryButton onClick={() => { setEntries(null); onClose(); }}>
            닫기
          </SecondaryButton>
          {entries && (
            <PrimaryButton onClick={handleRegister} disabled={saving}>
              {saving ? "등록 중..." : "선택 보고 등록"}
            </PrimaryButton>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          카카오톡 PC에서 단톡방 <b>메뉴 → 대화 내용 내보내기</b>(txt 또는 csv)로 저장한 로그를
          붙여넣거나 파일을 선택하세요. 이름과 날짜가 자동으로 매칭되어 보고로 등록됩니다.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            📂 파일 선택
          </button>
          <span className="text-xs text-zinc-400">
            {fileName ? `선택됨: ${fileName}` : "(선택) txt / csv 파일"}
          </span>
        </div>

        <textarea
          className={`${inputCls} min-h-[120px] resize-y font-mono text-xs`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"예)\n---------- 2026년 5월 1일 금요일 ----------\n[오후 3:04] 홍길동 : 고객사 미팅 완료했습니다\n[오후 3:05] 김철수 : 확인했습니다"}
        />

        <div className="flex items-center gap-2">
          <PrimaryButton onClick={runParse}>🔎 분석하기</PrimaryButton>
          {summaryStats && (
            <span className="text-xs text-zinc-500">
              {summaryStats.days}일 · {summaryStats.people}명 · {summaryStats.msgs}개 메시지
            </span>
          )}
        </div>
                {msg && (
          <p
            className={`text-sm font-medium ${
              msg.startsWith("✅") ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {msg}
          </p>
        )}

        {entries && (
          <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-2 py-2 font-semibold">✓</th>
                  <th className="px-2 py-2 font-semibold">날짜</th>
                  <th className="px-2 py-2 font-semibold">직원</th>
                  <th className="px-2 py-2 font-semibold">요약</th>
                  <th className="px-2 py-2 font-semibold">메시지</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {matched.map((m) => (
                  <tr
                    key={m.key}
                    className={!m.emp ? "bg-zinc-50 text-zinc-400" : "hover:bg-zinc-50"}
                  >
                    <td className="px-2 py-2">
                      {m.emp ? (
                        <input
                          type="checkbox"
                          checked={!!checked[m.key]}
                          onChange={() => toggle(m.key)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-400">미매칭</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{m.entry.date}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span
                        className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: m.emp?.color ?? "#ccc" }}
                      />
                      {m.entry.name}
                      {m.emp ? "" : " (등록 안 됨)"}
                    </td>
                    <td className="max-w-[220px] truncate px-2 py-2">{m.entry.summary}</td>
                    <td className="px-2 py-2">{m.entry.lines.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {unmatched.length > 0 && (
          <p className="text-xs text-amber-600">
            ⚠️ 매칭 안 된 이름:{" "}
            {Array.from(new Set(unmatched.map((m) => m.entry.name))).join(", ")} — 먼저 직원으로
            등록하세요.
          </p>
        )}
      </div>
    </Modal>
  );
}

