# 🗓️ 회사 스케줄 + 보고 달력 — 핸드오프 문서

새 세션에서 이 프로젝트를 바로 이어서 작업할 수 있도록 정리한 문서입니다. 파일 위치: `C:\Users\MSI\Desktop\scheduler\web`

---

## 1. 개요
회사 내부 전용 **스케줄(근태) + 보고(카톡/수기) 달력** 웹 앱.
- **직원별 색상**으로 달력에 일정을 표시
- 날짜 클릭 → 그날의 일정·보고 상세
- **사이드 고정 직원 상태패널**(오전/오후 사무실 인원 판단)
- 보고/수기 기록, 정렬·필터
- **로그인 없이** 열람·입력 가능한 내부 오픈 도구 (요구사항)

---

## 2. 현재 상태 (완료된 것)
- [x] Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- [x] FullCalendar v6 캘린더 (월/주/일/목록)
- [x] Supabase 연동 + 공개 RLS 스키마
- [x] 직원 / 스케줄 / 보고 CRUD (모달)
- [x] 직원별 색상 필터, 근태 유형 필터, 공휴일 표시
- [x] 연차(ANNUAL) 유형 추가
- [x] **오전 반차(HALF_AM) / 오후 반차(HALF_PM)** 분리
- [x] **사이드 고정 직원 상태패널**: 오전·오후 사무실 인원/이름
- [x] 주간/일간 보기 시간 슬롯 + 시각 표시
- [x] **카톡 자동엮기 보류**(UI 제거, 코드는 git 이력에 잔존)
- [x] Railway 배포 (GitHub auto-deploy) + Node 22 고정
- [x] 빌드 검증(로컬 `next build --webpack`) 통과, 3 라우트 200 확인

---

## 3. 실행 방법
```bash
cd C:\Users\MSI\Desktop\scheduler\web
npm install
npm run dev        # http://localhost:3000
```
- **환경변수**: `web/.env.local` (로컬 진행 시 필수). 없다면 `.env.local.example` 복사 후 값 입력.
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  NEXT_PUBLIC_HOLIDAYS_API_KEY=   # 선택 (한국 공공데이터 키)
  ```
- **빌드**: `npm run build` (= `next build --webpack`).
  ⚠️ 이 PC는 Turbopack 네이티브 바인딩이 없어 반드시 `--webpack` 필요. scripts에 이미 반영됨.

---

## 4. 배포 (Railway)
- 원격: `https://github.com/ngsk2784-lab/scheduler` (branch `main`)
- Railway 연결 → **push 시 자동 재배포**
- `web/railway.json`: build `next build --webpack`, start `next start`, healthcheck `/`
- `web/.nvmrc` = `22` (Nixpacks가 Node 22 사용 — **필수**, 없으면 Node 18로 빌드 실패)
- **Railway Variables**(수동 유지):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - ⚠️ `NEXT_PUBLIC_*` 는 **빌드 타임 인라인**이라 변수 변경 후엔 반드시 **Redeploy(새 빌드)** 필요.
- 배포 URL: Railway 대시보드 → 서비스 → Deployments / Settings→Networking (최초 성공 배포 후 생성).

---

## 5. 데이터 모델 (Supabase)
`web/supabase/schema.sql` 에 정의 (SQL Editor에서 실행해야 테이블 생성됨).

| 테이블 | 주요 컬럼 |
|--------|-----------|
| `employees` | name, color, position, department, phone, is_active |
| `schedules` | employee_id, title, type, start_at, end_at, all_day, description |
| `reports` | employee_id, report_date, source(`kakao`/`manual`), summary, content |

- **RLS**: 비로그인 내부용 → 전 테이블 select/insert/update/delete `using(true)` 공개.
  ⚠️ URL 공개 시 인증/권한 추가 권장.
- `schedules.type` 값: `WORK, LEAVE, ANNUAL, HALF(구형), HALF_AM, HALF_PM, TRIP, FIELD, REMOTE, OTHER` (자유 문자열, 테이블 재생성 불필요)

---

## 6. 파일 구조 / 역할
```
src/
  app/
    layout.tsx          # 루트 레이아웃 + DataProvider + Header
    page.tsx            # 메인 달력 + 필터 + 사이드 상태패널 + DayDetail
    employees/page.tsx  # 직원 관리 (CRUD)
    reports/page.tsx    # 보고 기록 (필터/그룹핑)
  components/
    CalendarView.tsx    # FullCalendar 래퍼 (뷰·슬롯·이벤트 컨텐츠 커스텀)
    ScheduleModal.tsx   # 스케줄 등록/수정 (오전/오후 반차 시간 자동설정)
    ReportModal.tsx     # 보고 등록/수정 (카톡 로그 간편 파싱 내장)
    EmployeeModal.tsx   # 직원 등록/수정 (색상 팔레트)
    Header.tsx          # 상단 네비
    ui.tsx              # Modal/Field/Button/Spinner 공용
  lib/
    DataContext.tsx     # 전역 데이터 + CRUD (Supabase 호출, 에러 배너)
    supabase.ts         # supabase client(지연생성) + API 함수
    types.ts            # 도메인 타입 (ScheduleType, Employee, ...)
    constants.ts        # 유형 상수/맵, 직원 색상, 날짜 헬퍼
    holidays.ts         # 공휴일 (정적 2025~27 + 선택 API)
supabase/schema.sql     # 테이블 + RLS
railway.json            # Railway 빌드/시작/헬스체크
.nvmrc                  # Node 22
.env.example / .env.local.example
```

---

## 7. 주요 로직 포인트 (수정 시 주의)
- **직원 상태(오전/오후 사무실)** 계산: `src/app/page.tsx` 하단 `officeStaff()` / `TYPE_OFFICE` / `OFFICE_PRIORITY`.
  - 규칙: WORK만 오전·오후 둘 다 사무실. HALF_AM=오후만, HALF_PM=오전만, 휴가/연차/출장/외근/재택/기타=둘 다 X.
  - 상태패널 기준일: `statusDate = selectedDay ?? today` (선택 없으면 오늘).
- **캘린더 이벤트 조합** + 유형 필터/직원 필터: `page.tsx` `events` useMemo.
- **일접근(daySchedules)** 필터는 `all_day ? end : start` 기준 날짜 포함 판단 — `officeStaff`의 `coveringSchedules`와 동일 로직.
- **FullCalendar 이벤트**: 리포트/공휴일은 `className report-event/holiday-event`, 커스텀 `eventContent`로 작은 꼬리표/빨간 텍스트 렌더. 스케줄은 직원색 배경.

---

## 8. 알려진 이슈 / 주의사항
1. **Turbopack 불가**: 이 개발PC는 `next build --webpack`/`next dev --webpack` 필수. Railway도 `railway.json`에 `--webpack` 반영돼 있음.
2. **빌드 시 SWC 경고 무시**: 로그의 `Attempted to load @next/swc-win32-x64-msvc...is not a valid Win32` 는 정상(WASM 대체)이며 무해. 실제 에러는 그 아래 별도 표시.
3. **`NEXT_PUBLIC_` 지연 생성**: `supabase.ts`의 `getClient()`가 빈 URL이면 에러를 던지고, DataContext가 "데이터를 불러오는 데 실패했습니다..." 배너 표시. → 즉 **위에 빨간 배너**는 "Supabase 연결/테이블 문제"를 의미.
4. **배포 초기 실패 원인(Node 18)**은 `.nvmrc=22`로 해결됨. 재발 시 `.nvmrc` 확인.
5. **editor 도구로 큰 파일 다중 삽입 시 라인 오프셋 문제**가 발생했었음 → 큰 편집은 "고유 주석 앵커 치환"(`/*__X__*/`) 방식이 안전.

---

## 9. 다음 단계 / 가능한 확장 (아직 안 한 것)
- [ ] `카톡 완전 자동 감시`: 순수 웹으론 불가 — 카카오 챗봇/오픈빌더 or 앱 연동 보조 필요. (일괄 붙여넣기는 git 이력 `a53534d`에 존재해 필요 시 복원 가능)
- [ ] 출근/퇴근 시간 표시, 당직 배정, 보고 검색
- [ ] Supabase 테이블에 사진/첨부(Storage) 업로드
- [ ] 인증/권한(관리자만 쓰기) 추가 (URL 공개 시 필요)
- [ ] 배포 이후 실제 데이터로 스모크 테스트 (직원→스케줄→보고 저장 확인)

---

## 10. 환경 정보
- OS: Windows (PowerShell; `&&` 대신 `;` 사용 필요)
- Node v24(로컬) / Railway `.nvmrc=22`
- 도구: npm 11
- Git 사용자: `ngsk2784-lab` / `ngsk2784@gmail.com`
- 원본 참고 이미지: `C:\Users\MSI\Desktop\scheduler\1..png` (미사용 유지)
