// 엑셀/CSV 다운로드 헬퍼
function esc(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export function downloadFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8"
) {
  // BOM(EF BB BF)을 붙여 엑셀에서 한글 깨짐 방지
  const blob = new Blob(["\ufeff", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// .ics(구글/아이캘린더 구독용) 생성
function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

export function buildIcs(
  events: { title: string; start: Date; end: Date; desc?: string; location?: string }[],
  title = "회사 스케줄"
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scheduler//KO//EN",
    "X-WR-CALNAME:" + title,
    "CALSCALE:GREGORIAN",
  ];
  events.forEach((e, i) => {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + e.start.getTime() + "-" + i + "@scheduler.local");
    lines.push("DTSTAMP:" + icsDate(new Date()));
    lines.push("DTSTART:" + icsDate(e.start));
    lines.push("DTEND:" + icsDate(e.end));
    lines.push("SUMMARY:" + e.title);
    if (e.desc) lines.push("DESCRIPTION:" + e.desc.replace(/\n/g, "\\n"));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

