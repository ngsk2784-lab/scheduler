import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Employee,
  Report,
  ReportSource,
  Schedule,
  ScheduleType,
} from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 환경변수가 없어도 빌드/서버 렌더링이 깨지지 않도록 지연 생성 처리
let client: SupabaseClient | null = null;
export function getClient(): SupabaseClient {
  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase 연결 정보가 없습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL 와 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정해 주세요."
      );
    }
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

// ---- 입력 타입 ----
export interface EmployeeInput {
  name: string;
  color: string;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export interface ScheduleInput {
  employee_id: string;
  title: string;
  type: ScheduleType;
  start_at: string;
  end_at: string;
  all_day: boolean;
  description?: string | null;
}

export interface ReportInput {
  employee_id: string;
  report_date: string;
  source: ReportSource;
  summary?: string | null;
  content: string;
}

// ---- 직원 ----
export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await getClient()
    .from("employees")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function saveEmployee(input: EmployeeInput, id?: string) {
  if (id) {
    const { error } = await getClient()
      .from("employees")
      .update(input)
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await getClient().from("employees").insert(input);
    if (error) throw error;
  }
}

export async function deleteEmployee(id: string) {
  const { error } = await getClient().from("employees").delete().eq("id", id);
  if (error) throw error;
}

// ---- 스케줄 ----
export async function fetchSchedules(): Promise<Schedule[]> {
  const { data, error } = await getClient()
    .from("schedules")
    .select("*")
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Schedule[];
}

export async function saveSchedule(input: ScheduleInput, id?: string) {
  if (id) {
    const { error } = await getClient()
      .from("schedules")
      .update(input)
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await getClient().from("schedules").insert(input);
    if (error) throw error;
  }
}

export async function deleteSchedule(id: string) {
  const { error } = await getClient().from("schedules").delete().eq("id", id);
  if (error) throw error;
}

// ---- 보고 ----
export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await getClient()
    .from("reports")
    .select("*")
    .order("report_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Report[];
}

export async function saveReport(input: ReportInput, id?: string) {
  if (id) {
    const { error } = await getClient()
      .from("reports")
      .update(input)
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await getClient().from("reports").insert(input);
    if (error) throw error;
  }
}

export async function deleteReport(id: string) {
  const { error } = await getClient().from("reports").delete().eq("id", id);
  if (error) throw error;
}
