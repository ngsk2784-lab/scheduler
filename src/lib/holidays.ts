import type HolidaysKr from "holidays-kr";

// 대한민국 공휴일 정적 데이터 (2025 ~ 2027)
// ※ 음력 기준 공휴일(설/추석/부처님오신날)은 실제 확정치 기준으로 정리.
//   정확성이 중요한 경우 아래 HOLIDAYS_API_KEY 환경변수에 한국 공공데이터(holidays-kr) 키를
//   넣으면 실행 시점에 API에서 자동 갱신합니다.
const HOLIDAYS_STATIC: Record<string, string> = {
  // ---- 2025 ----
  "2025-01-01": "신정",
  "2025-01-28": "설 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설 연휴",
  "2025-03-01": "삼일절",
  "2025-03-03": "삼일절 대체공휴일",
  "2025-05-05": "어린이날",
  "2025-05-06": "부처님오신날",
  "2025-06-06": "현충일",
  "2025-08-15": "광복절",
  "2025-10-03": "개천절",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-10-08": "추석 대체공휴일",
  "2025-10-09": "한글날",
  "2025-12-25": "성탄절",
  // ---- 2026 ----
  "2026-01-01": "신정",
  "2026-02-16": "설 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설 연휴",
  "2026-02-19": "설 대체공휴일",
  "2026-03-01": "삼일절",
  "2026-03-02": "삼일절 대체공휴일",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "부처님오신날 대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-09-27": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  // ---- 2027 ----
  "2027-01-01": "신정",
  "2027-02-07": "설날",
  "2027-02-08": "설 연휴",
  "2027-02-09": "설 연휴",
  "2027-03-01": "삼일절",
  "2027-03-03": "대체공휴일",
  "2027-05-05": "어린이날",
  "2027-05-19": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-08-15": "광복절",
  "2027-09-14": "추석",
  "2027-09-15": "추석 연휴",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-09": "한글날",
  "2027-12-25": "성탄절",
};

// 실행 시점 데이터 캐시 (동일 연도 재조회 방지)
const cache: Record<string, string> = { ...HOLIDAYS_STATIC };

export async function loadHolidays(
  year: number
): Promise<Array<{ date: string; name: string }>> {
  const cacheKey = `${year}-api`;
  // 이미 정적으로 확보된 연도는 API 호출 없이 static 값 사용
  const staticEntries = Object.entries(HOLIDAYS_STATIC).filter(([d]) =>
    d.startsWith(String(year))
  );
  if (staticEntries.length > 0) {
    return staticEntries.map(([date, name]) => ({ date, name }));
  }

  const serviceKey = process.env.NEXT_PUBLIC_HOLIDAYS_API_KEY;
  if (!serviceKey) {
    // API 키가 없으면 정적 데이터 반환 (없는 연도는 빈 배열)
    return staticEntries.map(([date, name]) => ({ date, name }));
  }

  try {
    const Holidays = (await import("holidays-kr")).default as typeof HolidaysKr;
    Holidays.serviceKey = serviceKey;
    const items = await Holidays.getHolidays({ year, month: 1, monthCount: 12 });
    const result: Array<{ date: string; name: string }> = [];
    for (const it of items as Array<{ dateStr: string; name: string }>) {
      cache[it.dateStr] = it.name;
      result.push({ date: it.dateStr, name: it.name });
    }
    return result;
  } catch {
    return staticEntries.map(([date, name]) => ({ date, name }));
  }
}
