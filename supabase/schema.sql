-- ============================================================
-- 회사 전용 스케줄 + 보고 달력 (Supabase 스키마)
-- SQL Editor 에서 이 파일 전체를 실행하세요.
-- 비로그인 내부용 도구이므로 모든 테이블은 공개 읽기/쓰기 RLS 정책을 가집니다.
-- ============================================================

-- 1) 직원
create table if not exists public.employees (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#3b82f6',           -- 달력에서 직원을 구분하는 색상
  position   text,                                      -- 직급
  department text,                                      -- 부서
  phone      text,                                      -- 연락처
  is_active  boolean not null default true,             -- 재직 여부 (false = 퇴사)
  created_at timestamptz not null default now()
);

-- 2) 스케줄
create table if not exists public.schedules (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title       text not null,
  type        text not null default 'WORK',             -- WORK/LEAVE/HALF/TRIP/FIELD/REMOTE/OTHER
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  all_day     boolean not null default true,            -- 종일 여부
  description text,
  created_at  timestamptz not null default now()
);

-- 3) 보고 기록 (카톡 단톡방 보고 / 수기)
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  report_date date not null,                            -- 보고한 날짜
  source      text not null default 'manual',           -- 'kakao' | 'manual'
  summary     text,                                     -- 요약(몇 자 제목)
  content     text not null,                            -- 무슨 이야기를 했는지 상세
  created_at  timestamptz not null default now()
);

-- 인덱스
create index if not exists schedules_employee_idx on public.schedules(employee_id);
create index if not exists schedules_start_idx   on public.schedules(start_at);
create index if not exists reports_date_idx      on public.reports(report_date);
create index if not exists reports_employee_idx  on public.reports(employee_id);

-- ============================================================
-- RLS (비로그인 내부용 → 로그인 없이 읽기/쓰기 모두 허용)
-- ※ 외부에 공개하는 URL인 경우 별도 계정/권한 체계를 추가 권장
-- ============================================================
alter table public.employees enable row level security;
alter table public.schedules enable row level security;
alter table public.reports  enable row level security;

-- employees
create policy "employees_public_read"   on public.employees for select using (true);
create policy "employees_public_insert" on public.employees for insert with check (true);
create policy "employees_public_update" on public.employees for update using (true) with check (true);
create policy "employees_public_delete" on public.employees for delete using (true);

-- schedules
create policy "schedules_public_read"   on public.schedules for select using (true);
create policy "schedules_public_insert" on public.schedules for insert with check (true);
create policy "schedules_public_update" on public.schedules for update using (true) with check (true);
create policy "schedules_public_delete" on public.schedules for delete using (true);

-- reports
create policy "reports_public_read"   on public.reports for select using (true);
create policy "reports_public_insert" on public.reports for insert with check (true);
create policy "reports_public_update" on public.reports for update using (true) with check (true);
create policy "reports_public_delete" on public.reports for delete using (true);
