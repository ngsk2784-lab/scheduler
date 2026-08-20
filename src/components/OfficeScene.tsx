"use client";

import { PixelSprite, makeDesk, type PixChar } from "@/components/pixels";

export interface SceneChar {
  id: string;
  name: string;
  position: string | null;
  color: string;
  char: PixChar;
}

// 3x3 책상 배치 (% 좌표)
const COLS = [18, 50, 84];
const ROWS = [36, 60, 82];
const DESK_COLS = 3;
const DESK_COUNT = 9;
const DESK_SIZE = 5;

function deskSpot(i: number) {
  const r = Math.floor(i / DESK_COLS);
  const c = i % DESK_COLS;
  return { x: COLS[c], y: ROWS[r] };
}

function charAtDesk(i: number) {
  const r = Math.floor(i / DESK_COLS);
  const c = i % DESK_COLS;
  // 책상 위 자기 자리에 앉도록 발이 책상 표면에 닿게 배치 (떠 보이지 않게)
  return { x: COLS[c], y: ROWS[r] + 2 };
}

export function OfficeScene({
  present,
  lunch,
}: {
  present: SceneChar[];
  lunch?: boolean;
}) {
  const cap = present.slice(0, DESK_COUNT);
  // 출근 직원은 책상에 고정되어 근무/식사만 함 (이동·식사코너 이동 없음)
  const statusBubble = lunch ? "🍚 식사중" : "💻 일하는중";

  return (
    <div
      className="relative h-[640px] w-full select-none overflow-hidden bg-[#d8d2c4] sm:h-[700px]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* 책상 (고정 레이어, 캐릭터와 분리) */}
      {Array.from({ length: DESK_COUNT }).map((_, i) => {
        const d = deskSpot(i);
        return (
          <div
            key={`desk-${i}`}
            className="absolute -translate-x-1/2"
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
          >
            <PixelSprite
              grid={makeDesk("#b8a68a").grid}
              palette={makeDesk("#b8a68a").palette}
              size={DESK_SIZE}
              title="책상"
            />
          </div>
        );
      })}

      {/* 캐릭터 (자기 책상에서 근무/식사) */}
      {cap.map((c, i) => {
        const sp = charAtDesk(i);
        return (
          <div
            key={c.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${sp.x}%`, top: `${sp.y}%`, zIndex: 20 }}
          >
            <div className="relative" style={{ width: 64, height: 72 }}>
              {/* 이름 + 직책 라벨 */}
              <div className="absolute -top-12 left-1/2 w-max max-w-[96px] -translate-x-1/2 rounded border border-zinc-700 bg-zinc-800/85 px-1.5 py-0.5 text-center leading-tight text-white shadow">
                <div className="truncate text-[11px] font-bold">{c.name}</div>
                <div className="truncate text-[9px] text-zinc-300">
                  {c.position || "직원"}
                </div>
              </div>

              {/* 행동 말풍선 */}
              <span className="absolute -top-[92px] left-1/2 z-30 w-max max-w-[150px] -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 shadow">
                {statusBubble}
              </span>

              <PixelSprite
                grid={c.char.grid}
                palette={c.char.palette}
                size={4}
                title={c.name}
                className="drop-shadow"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}