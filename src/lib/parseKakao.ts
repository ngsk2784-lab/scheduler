// 카카오톡 "대화 내보내기" 로그를 보고 데이터로 파싱하는 유틸

export interface ParsedKakaoEntry {
  date: string; // YYYY-MM-DD
  name: string; // 보낸 사람 이름
  lines: string[]; // 그날 그 사람의 메시지
  summary: string; // 첫 메시지 요약
  content: string; // 전체 내용
}

// ---------- 2026년 5월 1일 금요일 ----------
const TXT_DATE_RE =
  /(\d{4})\s*[년.]\s*(\d{1,2})\s*[월.]\s*(\d{1,2})\s*일/;
// [오후 3:04] 홍길동 : 내용
const MSG_RE =
  /^\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*([^:：]+)\s*[:：]\s*([\s\S]*)$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function to24h(ampm: string, h: number): string {
  let hh = h % 12;
  if (ampm === "오후") hh += 12;
  return pad(hh);
}

function makeSummary(lines: string[]): string {
  const first = lines[0]?.replace(/\s+/g, " ").trim() ?? "";
  return first.length > 20 ? first.slice(0, 20) + "…" : first || "단톡방 보고";
}

export function parseKakaoExport(text: string): ParsedKakaoEntry[] {
  // CSV 형식(엑셀용) 여부 판별
  const firstNonEmpty = text
    .split(/\r?\n/)
    .find((l) => l.trim().length > 0);
  const isCsv =
    !!firstNonEmpty &&
    (/메시지|사용자/.test(firstNonEmpty) ||
      /^"?\d{4}-\d{2}-\d{2}"?,"/.test(firstNonEmpty));

  if (isCsv) return parseCsv(text);

  // TXT(채팅 저장) 형식
  const groups = new Map<string, { name: string; lines: string[] }>();
  let curDate: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const dHeader = line.match(TXT_DATE_RE);
    if (dHeader) {
      curDate = toDateStr(+dHeader[1], +dHeader[2], +dHeader[3]);
      continue;
    }
    const iso = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      curDate = toDateStr(+iso[1], +iso[2], +iso[3]);
      continue;
    }

    if (!curDate) continue; // 날짜 컨텍스트 전의 헤더/잡음

    const m = line.match(MSG_RE);
    if (!m) continue; // 시스템 메시지 등 skip
    const name = m[4].trim();
    const h24 = to24h(m[1], +m[2]);
    const time = `${h24}:${m[3]}`;
    const content = m[5].trim();
    if (!name || !content) continue;

    const key = `${curDate}|${name}`;
    if (!groups.has(key)) groups.set(key, { name, lines: [] });
    groups.get(key)!.lines.push(`[${time}] ${content}`);
  }

  return toEntries(groups);
}

function parseCsv(text: string): ParsedKakaoEntry[] {
  const groups = new Map<string, { name: string; lines: string[] }>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^날짜.*(메시지|사용자)/.test(line)) continue;
    const f = parseCsvLine(line);
    if (f.length < 4) continue;
    const [date, time, name, content] = f.map((s) => s.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const key = `${date}|${name}`;
    if (!groups.has(key)) groups.set(key, { name, lines: [] });
    groups.get(key)!.lines.push(`[${time}] ${content}`);
  }
  return toEntries(groups);
}

function toEntries(
  groups: Map<string, { name: string; lines: string[] }>
): ParsedKakaoEntry[] {
  const entries: ParsedKakaoEntry[] = [];
  groups.forEach((g, key) => {
    const date = key.split("|")[0];
    entries.push({
      date,
      name: g.name,
      lines: g.lines,
      summary: makeSummary(g.lines),
      content: g.lines.join("\n"),
    });
  });
  return entries.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// "a","b","c" 형태의 CSV 한 줄 파싱 (따옴표 안 콤마 처리)
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
