# 🗓️ 회사 전용 스케줄 + 보고 달력

직원별 색상으로 스케줄을 보여주고, 카톡 단톡방 보고/수기 보고까지 기록하는 **사내 전용** 웹 앱입니다.

## 주요 기능
- **전체 달력** (`/`): 직원별 색상 스케줄 + 공휴일 + 보고(📌) 꼬리표
  - 월/주/일 보기 전환, 날짜 클릭 시 그 날의 일정·보고 상세
  - 직원별 표시/숨김 필터, 근태 유형 필터, 이번 달 요약 통계
- **직원 관리** (`/employees`): 직원 등록 + 달력 색상 지정, 퇴사 처리
- **보고 기록** (`/reports`): 날짜·직원·원천(카톡/수기)·내용으로 기록, 검색/필터
  - 카톡 단톡방 로그를 붙여 넣으면 내용 정리 도움

## 기술 스택
- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**
- **FullCalendar v6** (월/주/일 캘린더)
- **Supabase** (Postgres + RLS, 비로그인 내부용)
- **Railway** 배포

## 1) Supabase 설정
1. [Supabase](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor 에서 [`supabase/schema.sql`](supabase/schema.sql) 전체 실행
3. `Project Settings → API` 에서 `URL` 과 `anon`(public) key 복사
4. 이 프로젝트 루트의 `.env.local` 생성 (`.env.local.example` 참고):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

> 참고: 현재는 로그인 없이 누구나 읽기/쓰기가 가능하도록 RLS 정책이 설정되어 있습니다.
> URL이 외부에 공개되면 별도 인증/권한 체계를 추가해야 합니다.

## 2) 로컬 실행
```bash
npm install
npm run dev
```
브라우저에서 http://localhost:3000 접속.

## 3) 배포 (Railway)
1. GitHub에 이 저장소를 올립니다 (Railway account 연동).
2. Railway에서 **New Project → Deploy from GitHub repo** 선택.
3. **Variables** 에 Supabase 환경변수 2개를 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 배포됩니다 (`railway.json`이 빌드/시작 명령을 지정).

## 선택 사항
- **공휴일 자동 갱신**: 한국 공공데이터(`data.go.kr`)의 "국가법정공휴일정보" API 키를
  `NEXT_PUBLIC_HOLIDAYS_API_KEY` 에 넣으면 실행 시점에 공휴일이 갱신됩니다.
  (키가 없어도 2025~2027년 공휴일은 내장 데이터로 표시됩니다.)

## 폴더 구조
```
src/
  app/
    page.tsx          # 메인 달력
    employees/page.tsx
    reports/page.tsx
    layout.tsx
  components/         # 달력/모달/헤더/UI
  lib/                # supabase, 타입, 상수, 공휴일, 데이터 컨텍스트
supabase/schema.sql   # 테이블 + RLS
```
