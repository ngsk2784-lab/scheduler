"use client";

// ─────────────────────────────────────────────────────────────
// 픽셀 도트아트 렌더러
// 각 글자 = 픽셀 1칸, `rect` 하나로 매핑해 SVG로 그립니다.
// `crispEdges` 로 확대해도 도트가 선명하게 유지됩니다.
// ─────────────────────────────────────────────────────────────

export type Palette = Record<string, string>;

// 16진수(#rrggbb) → [r,g,b]
function hexRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 색을 factor(0~1) 배로 어둡게/밝게
export function shade(hex: string, factor: number): string {
  const [r, g, b] = hexRgb(hex).map((v) =>
    Math.round(Math.min(255, Math.max(0, v * factor)))
  );
  return `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

// 직원용 팔레트. body = 직원 서명 색상, hair = 머리색 변형
export function buildPalette(color: string, hair: string): Palette {
  return {
    L: "#26262f", // 윤곽
    h: hair,
    H: shade(hair, 1.35), // 머리 광택
    s: "#ffd6b3", // 피부
    S: shade("#ffd6b3", 0.82), // 피부 음영
    e: "#2a211d", // 눈
    r: "#ff9fb0", // 볼터치
    m: "#a04a57", // 입
    o: color, // 옷(직원 색상)
    O: shade(color, 0.68), // 옷 음영
    p: "#3b3f52", // 바지
    b: "#5b5f75", // 신발
    w: "#e9b16a", // 나무 밝음(책상)
    W: "#c98d4a", // 나무 어두움(책상)
    d: "#7fd0a0", // 유리/화분 밝음
    D: "#4f9a78", // 화분
    g: "#3e4a6b", // 창틀/가구
    B: "#20222b", // 모니터 화면
  };
}

// ─────────────────────────────────────────────────────────────
// 캐릭터 도트 스프라이트 (16 x 18)
// o → 직원 색상, h/H → 머리색, s→피부, e→눈, r→볼, m→입
// ─────────────────────────────────────────────────────────────
const CHARACTER_GRID: string[] = [
  "......LLLL......",
  "....LHHHHHHL....",
  "..LHHHHHHHHL....",
  "..LHHHHHHHHHHL..",
  "..LHHHHHHHHHHL..",
  "..LhsssssssshL..",
  "..LsssessessesL..",
  "..LsssrmmrsssL..",
  "..hLssssssssLh..",
  "...LooooooooL...",
  "...LooooooooL...",
  "...LooooooooL...",
  "...LooooooooL...",
  "...LOOOOOOOOOL...",
  "...LppppppppL...",
  "...LppppppppL...",
  ".....LbbbbL.....",
  ".....LbbbbL.....",
];

export interface PixChar {
  grid: string[];
  palette: Palette;
}

// 머리색 변형 팔레트 (직원별로 순환 적용해 다양성 부여)
export const HAIR_COLORS: string[] = [
  "#4a3b3f", // 흑갈색
  "#6b4a2b", // 갈색
  "#2f3b52", // 남색
  "#5a3a52", // 자주
  "#3b5248", // 짙은 초록
  "#52372f", // 적갈색
  "#3a4a5a", // 회청
];

export function makeCharacter(index: number, bodyColor: string): PixChar {
  const hair = HAIR_COLORS[index % HAIR_COLORS.length];
  return { grid: CHARACTER_GRID, palette: buildPalette(bodyColor, hair) };
}

// ─────────────────────────────────────────────────────────────
// 책상 도트 스프라이트 (24 x 14) : 정면에서 본 나무 책상
// ─────────────────────────────────────────────────────────────
const DESK_GRID: string[] = [
  ".LWWWWWWWWWWWWWWWWWWWWL.",
  "LWWWWWWWWWWWWWWWWWWWWWWL",
  "LwWWWWWWWWWWWWWWWWWWWWwL",
  "LwWWWWWWWWWWWWWWWWWWWWwL",
  "LgWWWWWWWWWWWWWWWWWWWWgL",
  "LWWWWWWWWWWpWpWWWWWWWWWL",
  "LWWWWWWWWWWpWpWWWWWWWWWL",
  "LWWWWWWWWWWWWWWWWWWWWWWL",
  "LgggLLgggLLgggLLgggLLggg",
  "LgLLLgLLLgLLLgLLLgLLLgLg",
  "LgLLLgLLLgLLLgLLLgLLLgLg",
  "LgLLLgLLLgLLLgLLLgLLLgLg",
  "LgLLLgLLLgLLLgLLLgLLLgLg",
  ".LLLLLLLLLLLLLLLLLLLLLL.",
];

export function makeDesk(color: string): PixChar {
  return { grid: DESK_GRID, palette: buildPalette(color, HAIR_COLORS[0]) };
}

// ─────────────────────────────────────────────────────────────
// 창문 도트 스프라이트 (20 x 10)
// ─────────────────────────────────────────────────────────────
const WINDOW_GRID: string[] = [
  "LggggggggggggggggggggL",
  "LgdddDDdddDDdddDDdddgL",
  "LgddddddddddddddddddgL",
  "LgdddDDdddDDdddDDdddgL",
  "LgddddddddddddddddddgL",
  "LgdddDDdddDDdddDDdddgL",
  "LgddddddddddddddddddgL",
  "LgdddDDdddDDdddDDdddgL",
  "LggggggggggggggggggggL",
  ".LLLLLLLLLLLLLLLLLLLL.",
];

// 화분(plant) 도트 스프라이트 (12 x 12)
const PLANT_GRID: string[] = [
  ".....Dd......",
  "....DddD.....",
  "...DdddddD...",
  "...DdDDdD....",
  "...DdddddD...",
  "...DdddddD...",
  "....wwww.....",
  "...wWwwWw....",
  "...wWwwWw....",
  "...wWWWWw....",
  "....WWWW.....",
  ".....WW......",
];

// ─────────────────────────────────────────────────────────────
// 렌더러
// ─────────────────────────────────────────────────────────────
export function PixelSprite({
  grid,
  palette,
  size = 1,
  className,
  title,
}: {
  grid: string[];
  palette: Palette;
  size?: number;
  className?: string;
  title?: string;
}) {
  const h = grid.length;
  const w = grid[0].length;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === ".") continue;
      const fill = palette[ch];
      if (!fill) continue;
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />
      );
    }
  }
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {title ? <title>{title}</title> : null}
      {rects}
    </svg>
  );
}

export { WINDOW_GRID, PLANT_GRID };