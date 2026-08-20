# 🗓️ 회사 스케줄 + 보고 달력 — 핸드오프 (2026-08 업데이트)

새 세션에서 이 프로젝트를 바로 이어서 작업할 수 있도록 정리한 최신 문서입니다.
작업 폴더: `C:\Users\MSI\Desktop\scheduler\web`  ·  최신 커밋: `da0b1f0` (main, 원격과 동일)

> ⚠️ 2026-08 현재 **Railway가 서버 과부하 점검 중**일 수 있음 → 배포/재배포·URL 접속이 잠시 안 될 수 있음.
> 점검 후 Railway 대시보드에서 `Deployments` 상태가 `Deployed` 인지 확인하고, 필요 시 Redeploy.

---

## 0. ⭐ 새 세션 시작 방법 + 체크리스트 방식 (반드시 먼저 읽기)
이 프로젝트는 **"작업(구현) ↔ 사용자 테스트" 를 체크리스트로 번갈아가는 방식**으로 진행합니다.
- **체크리스트 파일**: `C:\Users\MSI\Desktop\scheduler\CHECKLIST.md`
  - ⚠️ git 저장소는 `web/` 하위이므로 **이 파일은 git에 커밋되지 않습니다.** 단, 같은 PC에 그대로 남아 새 세션에서도 바로 이어갈 수 있음.
- 방식 규칙:
  1. 새 기능/변경이 생기면 나(agent)가 테스트용 항목을 `- [ ] **n-x** 내용` 형태로 작성
  2. 사용자가 실제 배포 URL에서 하나씩 테스트하고 `[ ]` → `[x]` 로 체크
  3. 체크된 파일을 다시 보내면 → 코드 수정/기능 추가 → "변경 이력"&새 항목을 체크리스트에 갱신 → 다시 제시 → 반복
- 현재 진행 상황: **사무실 도트 시뮬레이션(`/office`) 1차 완성 → CHECKLIST.md 10번 섹션 테스트 대기 중.**

새 세션에서 처음 할 일:
1. 코드 최신화: `cd C:\Users\MSI\Desktop\scheduler\web` → `git pull`
2. 최근 작업 상태 확인: `git log --oneline -8`
3. `CHECKLIST.md` 를 열어 **미체크(`[ ]`)** 항목 확인 → 그 항목들을 다음 작업으로 이어감
4. 배포 방법: `web/` 안에서 `git add -A; git commit -m "..." ; git push origin main` → Railway 자동 재배포
5. 테스트는 배포 URL(또는 로컬 `npm run dev`)에서 확인 → 체크리스트에 반영

⚠️ 알려진 개발 환경 제약 (재발 방지)
- `npx`가 PowerShell 실행정책으로 실행 불가 → 타입체크는 `node node_modules/typescript/bin/tsc --noEmit`
- PowerShell `Set-Content`로 .tsx 처리 시 한글 깨짐 → **반드시 editor(UTF-8)** 로 수정
- Turbopack 불가(개발PC) → `next build --webpack` / `npm run dev`(=next dev --webpack)

---

## 1. 개요 / 현재 상태
회사 내부 전용 **스케줄(근태) + 보고(카톡/수기) 달력** 웹 앱. Next.js 16 + FullCalendar v6 + Supabase + Railway.
기능(거의 모두 구현됨):
- [x] 직원별 색상 달력, 월/주/일/목록 보기, 공휴일, 직원/유형 필터, 이번 달 요약
- [x] 직원·스케줄·보고 CRUD / **연차(ANNUAL)·오전반차(HALF_AM)·오후반차(HALF_PM)**
- [x] **연차 소수(0.5) 지원** · **휴가도 연차에서 일수로 차감**(시작~종료 일수)
- [x] **사이드 고정 직원 상태패널**(오전/오후 사무실 인원, 사무실 아니면 비활성)
- [x] **일정에서 휴가/연차와 겹치는 "업무(WORK)" 숨김**
- [x] **통계 `/stats`**(월간 집계, 연차 잔여, CSV/알림 버튼)
- [x] **출근부 `/attendance`**(출근/퇴근/상태/당직, 날짜범위 CSV) — **일반직원은 본인만 보고/저장, 관리자 전체**
- [x] **보고 검색 + 태그 + CSV 내보내기** (보고 자동엮기는 보류/삭제됨, git 이력에 존재)
- [x] **조직구조(지점/팀) 필터**, 엑셀/CSV·iCal 내보내기, PWA 매니페스트, 관리자 PIN(선택)
- [x] **인증/로그인**: 전화번호 + 비밀번호(4~16자, 영문/특수문자), 기존직원 자동가입, 세션 유지, **본인 정보만 본인 수정**, 관리자(전체) 권한 — `010-2645-3908` 을 관리자로 지정
- [x] **슬랙 알림**: `@channel` 멘션 · 사무실 오전/오후/외부 인원 포함 · **매일 평일 8시(KST) 자동 발송**(`AUTO_NOTIFY_ON=on` 일 때)
- [x] 모바일 UI 개선(테이블 가로스크롤, 헤더·툴바·모달·보고태그 배치)
- [x] **사무실 도트 시뮬레이션 `/office`** — 3x3 책상(고정·넓게), 이름+직책 라벨, 기본은 책상 근무 + 이따금 이동/식사/대화(실생활 대사), 행동 후 책상 복귀

---

## 2. 실행 방법
```bash
cd C:\Users\MSI\Desktop\scheduler\web
npm install
npm run dev      # = next dev --webpack
```
- 필수 env: `web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- 선택 env: `WEBHOOK_URL`(슬랙/디스코드), `AUTO_NOTIFY_ON=on`, `NEXT_PUBLIC_HOLIDAYS_API_KEY`, `NEXT_PUBLIC_ADMIN_PIN`
- 최신 내용은 `web/.env.example` 참고
- 빌드: `npm run build` = `next build --webpack` (이 PC는 Turbopack SWC 바인딩 없어 반드시 `--webpack`)

---

## 3. 배포 (Railway)
- 원격: `github.com/ngsk2784-lab/scheduler` (branch `main`, push 시 자동 재배포)
- `web/railway.json`: build `next build --webpack`, start `next start`, health `/`
- `web/.nvmrc` = `22` (필수, 없으면 Node 18로 빌드 실패)
- **Railway Variables(메인 웹 서비스)**:
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `WEBHOOK_URL` = 슬랙 Incoming Webhook URL
  - `AUTO_NOTIFY_ON = on`  ← ⭐ 자동 아침 알림을 켜려면 반드시
- ⚠️ `NEXT_PUBLIC_*`는 빌드타임 인라인 → 변수 변경 후 **Redeploy(새 빌드)** 필요
- 배포 URL: Railway 대시보드 → 서비스 → Deployments / Settings→Networking (Deployed 후 생성)

### 자동 아침 알림 동작
- 코드: `src/instrumentation.ts` (`register()`가 서버 시작 시 실행)
- **평일(월~금) 8:00~8:02(KST)** 에 슬랙 채널로 `@channel` + 오늘 일정/사무실 인원 요약 발송
- **조건**: `AUTO_NOTIFY_ON=on` + `WEBHOOK_URL` 설정 + Railway 서버 기동 중(Railway 24/7)
- 시간은 KST(+9)로 계산(서버는 UTC). 점검 후 Redeploy하고 다음날 아침 확인.
- 확인: Railway 로그에 `[notify] auto send -> ...` 가 있으면 발송됨. 없으면 env/기동 문제.
---

## 4. 데이터 모델 (Supabase)
`web/supabase/schema.sql` (기본 테이블+RLS) — **`web/supabase/migrations.sql` 이 최신** (새 컬럼/테이블/관리자 부여)
| 테이블 | 주요 내용 |
|--------|-----------|
| `employees` | name, color, dept, phone, position, branch(지점), team(팀), annual_allowance(**double**), **password_hash**, **is_admin**, is_active |
| `schedules` | employee_id, title, type(`WORK/LEAVE/ANNUAL/HALF/HALF_AM/HALF_PM/TRIP/FIELD/REMOTE/OTHER`), start_at, end_at, all_day, desc |
| `reports` | employee_id, report_date, source(`kakao/manual`), summary, content, **tags(text[])** |
| `attendance` | employee_id, att_date, status(`present/absent/half/vacation/duty`), time_in, time_out, note |
| `schedule_confirmations` | schedule_id, employee_id, response(`yes/maybe/no/pending`) |

- **migrations.sql 이 중요한 것**: `annual_allowance double precision`(0.5 소수), `password_hash`, `is_admin`,
  지점/팀, reports.tags, attendance/confirmations 테이블, **최초 1명 자동 관리자**, **`010-2645-3908` 관리자 지정**
- RLS: 비로그인 내부용 공개 정책(읽기/쓰기 모두 true). 실제 인증은 **클라이언트(앱) 단**에서 적용됨.

---

## 5. 파일 구조 (역할)
```
src/instrumentation.ts     # 서버 시작 훅 → 매일 평일 8시(KST) /api/notify 자동 호출
src/app/
  layout.tsx   # DataProvider + AuthProvider + Header + PWA meta
  page.tsx     # 메인 달력 + 사이드 직원상태패널 + DayDetail + 필터/내보내기
  attendance/page.tsx  # 출근부(본인만/관리자 전체), 범위 CSV
  employees/page.tsx    # 직원 관리(관리자/본인만)
  reports/page.tsx      # 보고 목록(검색/태그/CSV)
  stats/page.tsx        # 통계(월간/연차잔여/알림/CSV)
  api/notify/route.ts   # 알림 발송(Slack @channel/사무실 인원, GET)
components/ CalendarView, ScheduleModal, ReportModal, EmployeeModal, Header, ui
             OfficeScene(사무실 시뮬레이션)/ pixels(도트 렌더러·스프라이트)
src/app/office/page.tsx   # 사무실 페이지: 날짜 기준 상태→present/outCall 계산 후 OfficeScene에 전달
lib/ DataContext(전역 데이터), AuthContext(인증), auth(핀/세션 헬퍼),
     supabase(API), types, constants, holidays, exportCsv, admin(PIN)
supabase/ schema.sql, migrations.sql
```

---

## 6. 주요 로직 포인트 (수정 시 주의)
- **사무실 시뮬레이션 `OfficeScene.tsx`**: 책상은 별도 레이어로 **고정**(캐릭터와 분리). 캐릭터 상태머신 `work→go→do(작업/식사/대화)→return→work`. **기본은 `work`(책상 근무)**, 이따금 이동(`EXTRA_SPOTS`)/간식(`EXTRA_SPOTS[0]`)/대화(실생활 `DIALOGUES` 대사, 2초마다 교체). `do` 종료 시 **반드시 `home`(자기 책상) 복귀**. 이동은 CSS transition(2.6s linear) + DOM ref(`nodeRef`/`innerRef`)로 직접 제어 → ⚠️ **React re-render가 위치를 되돌릴 수 있으니 JSX `style`에 `left/top`을 넣지 말 것**(ref로만 제어). 이름+직책은 캐릭터 위 라벨 상시 표시. 도트는 `pixels.tsx` `PixelSprite`(문자열 격자→SVG rect, `crispEdges`).
- **오전/오후 사무실**: `page.tsx` 하단 `officeStaff()/TYPE_OFFICE/OFFICE_PRIORITY` — WORK만 둘 다, HALF_AM=오후만, HALF_PM=오전만, 휴가/외근/출장/재택=둘 다 X. 상태패널 기준일 `selectedDay ?? today`.
- **업무 숨김**: `page.tsx` 이벤트 조합에서 `leaveByEmp`로 휴가/연차/반차 범위 지도 생성 → `WORK`가 겹치면 해당 업무 이벤트 제외.
- **연차 차감(통계)**: `stats/page.tsx` `spanDays(start,end)` — 연차/휴가=일수, 반차=0.5. `annual_allowance` 실수형.
- **인증**: `AuthContext` — 세션은 localStorage(`cal_session`). `hashPin`(SHA-256). 로그인은 phone+pin, 기존직원 자동가입(핀=phone뒷4). `isAdmin`은 `employee.is_admin`. 본인 정보만 본인 수정/삭제는 관리자.
- **한글 인코딩 주의**: PowerShell `Set-Content`로 .tsx를 덮어쓰면 한국어가 깨져 SyntaxError → 반드시 **editor(UTF-8)** 로 수정 (이전에 발생).
- **큰 파일 다중 삽입**: insert_line 오프셋이 꼬일 수 있음 → 고유 주석 앵커 치환(`/*__X__*/`) 방식이 안전.

---

## 7. 알려진 이슈
1. Turbopack 불가(개발PC) → `--webpack` 필수. Railway `railway.json`에도 반영.
2. 빌드 시 `@next/swc-win32...not valid` 경고는 무해(WASM 대체).
3. 위에 빨간 배너 = Supabase 연결/테이블 미생성 → `migrations.sql` 실행 필요.
4. 슬랙 "채널 다시 눌러야 보임"은 **슬랙 클라이언트 특성**(모바일은 실시간, PC만 지연) — 앱 문제 아님. `@channel` 멘션으로 완화.
5. 자동알림 안 옴 → **`AUTO_NOTIFY_ON=on` 누락**이 1순위. Railway env 확인+Redeploy.
6. Railway 점검 중(2026-08)이면 배포/URL 일시 불가 → 점검 후 확인.

---

## 8. 다음 단계 / 확장(미정)
- Railway 점검 후: `Deployments → Deployed` 확인 → 자동 알림 다음날 아침 검증
- (보류) 카톡 완전 자동 감시 / 보고 일괄 자동 등록 — git 이력 `a53534d`에 코드 잔존
- 게스트용 열람, 관리자 대시보드, 보고 첨부(Storage), 진짜 서버강제 RLS(Auth uid) 등

---

## 9. 환경
- OS: Windows + PowerShell(`&&` 대신 `;`), Node v24(로컬), git user `ngsk2784-lab`
- 원본 참고 이미지: `C:\Users\MSI\Desktop\scheduler\1..png`
- Railway 계정 유료 + Supabase 계정 사용 중 (배포 24/7)