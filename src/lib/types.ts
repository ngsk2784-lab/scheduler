// 공통 데이터 타입 정의

export type ScheduleType =
  | "WORK" // 출근/근무
  | "LEAVE" // 휴가
  | "ANNUAL" // 연차
  | "HALF" // 반차
  | "TRIP" // 출장
  | "FIELD" // 외근
  | "REMOTE" // 재택
  | "OTHER"; // 기타

export type ReportSource = "kakao" | "manual";

export interface Employee {
  id: string;
  name: string;
  color: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  employee_id: string;
  title: string;
  type: ScheduleType;
  start_at: string;
  end_at: string;
  all_day: boolean;
  description: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  employee_id: string;
  report_date: string; // YYYY-MM-DD
  source: ReportSource;
  summary: string | null;
  content: string;
  created_at: string;
}

// 직원 관련 함수 헬퍼
export function employeeOf(
  employees: Employee[],
  id: string | null | undefined
): Employee | undefined {
  if (!id) return undefined;
  return employees.find((e) => e.id === id);
}
