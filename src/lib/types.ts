// 공통 데이터 타입 정의

export type ScheduleType =
  | "WORK" // 출근/근무
  | "LEAVE" // 휴가
  | "ANNUAL" // 연차
  | "HALF" // 반차 (구형/호환용)
  | "HALF_AM" // 오전 반차
  | "HALF_PM" // 오후 반차
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
  branch: string | null; // 조직구조: 지점/사업장
  team: string | null; // 조직구조: 팀
  annual_allowance: number | null; // 연간 연차 부여일수
  password_hash: string | null; // 로그인 핀 해시
  is_admin: boolean; // 관리자 권한
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
  tags: string[]; // 보고 태그
  created_at: string;
}

// 출근부 (당직/출퇴근)
export type AttendanceStatus =
  | "present"
  | "absent"
  | "half"
  | "vacation"
  | "duty"; // 당직

export interface Attendance {
  id: string;
  employee_id: string;
  att_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  time_in: string | null; // HH:MM
  time_out: string | null; // HH:MM
  note: string | null;
  created_at: string;
}

// 일정 확인/응답
export type ConfirmationResponse = "pending" | "yes" | "maybe" | "no";

export interface ScheduleConfirmation {
  id: string;
  schedule_id: string;
  employee_id: string;
  response: ConfirmationResponse;
  note: string | null;
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
