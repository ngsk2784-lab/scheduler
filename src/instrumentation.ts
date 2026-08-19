// 서버 시작 시 실행되어 "매일 아침 8시(KST)"에 /api/notify 를 자동 호출합니다.
// 사용 조건: Railway Variables 에 AUTO_NOTIFY_ON=on 포함 + WEBHOOK_URL 설정
let started = false;

export async function register() {
  if (started) return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AUTO_NOTIFY_ON !== "on") return;
  started = true;

  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/notify`;
  let lastSent = "";

  const run = async () => {
    try {
      const now = new Date();
      // KST = UTC+9
      const kst = new Date(now.getTime() + 9 * 3600000);
      const h = kst.getUTCHours();
      const m = kst.getUTCMinutes();
      const dow = kst.getUTCDay(); // 0=일, 6=토
      const dateKey = kst.toISOString().slice(0, 10);
      // 평일(월~금) 오전 8시(KST) 0~2분 사이에 1회 발송 (분 단위 드리프트 방지)
      if (h === 8 && m >= 0 && m <= 2 && dow !== 0 && dow !== 6 && lastSent !== dateKey) {
        lastSent = dateKey;
        const res = await fetch(url);
        console.log("[notify] auto send ->", res.status, dateKey);
      }
    } catch (e) {
      console.error("[notify] auto failed", e);
    }
  };

  // 시작 직후 1회 확인 후, 30초마다 체크
  await run();
  setInterval(run, 30_000);
}