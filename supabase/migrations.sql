-- ============================================================
-- 마이그레이션: 추가 기능용 (2026-08)
-- 1) 기존에 schema.sql로 만든 테이블에 컬럼 추가
-- 2) 출근부 / 일정확인 테이블 생성
-- ============================================================

-- employees: 조직구조 + 연차잔여 필드
alter table if exists public.employees
  add column if not exists branch         text,          -- 지점/사업장
  add column if not exists team           text,          -- 팀/부서그룹
  add column if not exists annual_allowance double precision; -- 연간 연차 부여일수 (소수 0.5 단위 허용)

-- 기존에 int 로 만들어진 컬럼이면 실수로 교체 (반차 0.5 차감 대응)
alter table if exists public.employees
  alter column annual_allowance type double precision using annual_allowance::double precision;

-- 인증: 전화번호 로그인 + 권한
alter table if exists public.employees
  add column if not exists password_hash text,        -- 로그인 핀(해시). 기존 직원은 전화번호 뒷4자리로 자동 생성
  add column if not exists is_admin boolean not null default false; -- 관리자 여부

-- 관리자가 아무도 없으면 최초 직원 1명을 관리자로 지정 (잠금 방지)
update public.employees
   set is_admin = true
 where id = (select id from public.employees order by created_at asc, id asc limit 1)
   and not exists (select 1 from public.employees where is_admin = true);


-- reports: 태그 배열
alter table if exists public.reports
  add column if not exists tags text[] default '{}';

-- 출근부 (당직/출퇴근)
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  att_date    date not null default current_date,
  status      text not null default 'present',   -- present / absent / half / duty(당직) / vacation
  time_in     text,                               -- HH:MM (선택)
  time_out    text,                               -- HH:MM (선택)
  note        text,
  created_at  timestamptz not null default now(),
  unique(employee_id, att_date)
);

-- 일정 확인/응답 (투표)
create table if not exists public.schedule_confirmations (
  id          uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  response    text not null default 'pending',    -- pending / yes / maybe / no
  note        text,
  created_at  timestamptz not null default now(),
  unique(schedule_id, employee_id)
);

create index if not exists attendance_date_idx     on public.attendance(att_date);
create index if not exists confirmations_schedule_idx on public.schedule_confirmations(schedule_id);

-- RLS (비로그인 내부용 공개 읽기/쓰기)
alter table if exists public.attendance enable row level security;
alter table if exists public.schedule_confirmations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='attendance' and policyname='attendance_public_all') then
    create policy attendance_public_all on public.attendance for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='schedule_confirmations' and policyname='confirmations_public_all') then
    create policy confirmations_public_all on public.schedule_confirmations for all using (true) with check (true);
  end if;
end $$;
