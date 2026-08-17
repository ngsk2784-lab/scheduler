import type { ReportSource, ScheduleType } from "./types";

// 근태/스케줄 유형 정의 (등록 화면에 노출되는 항목)
export const SCHEDULE_TYPES: {
  value: ScheduleType;
  label: string;
  badge: string; // 배경색 클래스
}[] = [
  { value: "WORK", label: "출근/근무", badge: "bg-sky-100 text-sky-700" },
  { value: "LEAVE", label: "휴가", badge: "bg-rose-100 text-rose-700" },
  { value: "ANNUAL", label: "연차", badge: "bg-fuchsia-100 text-fuchsia-700" },
  { value: "HALF_AM", label: "오전 반차", badge: "bg-orange-100 text-orange-700" },
  { value: "HALF_PM", label: "오후 반차", badge: "bg-amber-100 text-amber-700" },
  { value: "TRIP", label: "출장", badge: "bg-violet-100 text-violet-700" },
  { value: "FIELD", label: "외근", badge: "bg-amber-100 text-amber-700" },
  { value: "REMOTE", label: "재택", badge: "bg-green-100 text-green-700" },
  { value: "OTHER", label: "기타", badge: "bg-gray-100 text-gray-600" },
];

// 표시용 맵 (구형 "HALF"도 포함)
export const SCHEDULE_TYPE_MAP: Record<
  ScheduleType,
  { label: string; badge: string }
> = {
  WORK: { label: "근무", badge: "bg-sky-100 text-sky-700" },
  LEAVE: { label: "휴가", badge: "bg-rose-100 text-rose-700" },
  ANNUAL: { label: "연차", badge: "bg-fuchsia-100 text-fuchsia-700" },
  HALF: { label: "반차", badge: "bg-orange-100 text-orange-700" },
  HALF_AM: { label: "오전반차", badge: "bg-orange-100 text-orange-700" },
  HALF_PM: { label: "오후반차", badge: "bg-amber-100 text-amber-700" },
  TRIP: { label: "출장", badge: "bg-violet-100 text-violet-700" },
  FIELD: { label: "외근", badge: "bg-amber-100 text-amber-700" },
  REMOTE: { label: "재택", badge: "bg-green-100 text-green-700" },
  OTHER: { label: "기타", badge: "bg-gray-100 text-gray-600" },
};

// 직원 지정용 기본 색상 팔레트 (고해상도에서도 구분 잘 되도록)
export const EMPLOYEE_COLORS: { value: string; label: string }[] = [
  { value: "#ef4444", label: "빨강" },
  { value: "#f97316", label: "주황" },
  { value: "#eab308", label: "노랑" },
  { value: "#22c55e", label: "초록" },
  { value: "#14b8a6", label: "청록" },
  { value: "#3b82f6", label: "파랑" },
  { value: "#6366f1", label: "남색" },
  { value: "#a855f7", label: "보라" },
  { value: "#ec4899", label: "분홍" },
  { value: "#78716c", label: "회갈" },
];

export const REPORT_SOURCES: Record<
  ReportSource,
  { label: string; icon: string; badge: string }
> = {
  kakao: { label: "카톡 단톡방", icon: "💬", badge: "bg-yellow-100 text-yellow-800" },
  manual: { label: "수기 기록", icon: "✍️", badge: "bg-blue-100 text-blue-800" },
};

// 날짜 포맷 헬퍼
export function toDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function toDateOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
