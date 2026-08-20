"use client";

// ─────────────────────────────────────────────────────────────
// 사무실 도트 시뮬레이션 씬
// 책상은 3x3 고정(움직이지 않음) / 캐릭터가 돌아다니며 일·식사·대화·전화
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PixelSprite, makeDesk, type PixChar } from "@/components/pixels";

export interface SceneChar {
  id: string;
  name: string;
  color: string;
  char: PixChar;
}

// 3 x 3 책상 좌표(퍼센트) - 넓게 배치
const COLS = [18, 50, 84];
const ROWS = [30, 54, 78];
const DESK_COLS = 3;
const DESK_COUNT = 9;
const DESK_SIZE = 5; // 책상 도트 배율

// 책상 좌표
function deskSpot(i: number) {
  const r = Math.floor(i / DESK_COLS);
  const c = i % DESK_COLS;
  return { x: COLS[c], y: ROWS[r] };
}
// 캐릭터가 책상에 앉았을 때 좌표 (책상 살짝 위)
function charAtDesk(i: number) {
  const r = Math.floor(i / DESK_COLS);
  const c = i % DESK_COLS;
  return { x: COLS[c], y: ROWS[r] - 20 };
}

// 돌아다닐 수 있는 자유 지점
const EXTRA_SPOTS = [
  { x: 50, y: 16 }, // 간식 코너
  { x: 16, y: 14 },
  { x: 84, y: 14 },
  { x: 30, y: 44 },
  { x: 70, y: 44 },
  { x: 16, y: 90 },
  { x: 84, y: 90 },
];

type Activity = "work" | "eat" | "talk" | "walk";

const BUBBLE: Record<Activity, string> = {
  work: "💻 일하는중",
  eat: "🍚 밥먹는중",
  talk: "💬 얘기중",
  walk: "💨 이동중",
};

interface SimChar {
  id: string;
  name: string;
  color: string;
  char: PixChar;
  deskIndex: number;
  x: number;
  y: number;
  lastX: number;
  activity: Activity;
}

let simSeq = 0;

export function OfficeScene({
  present,
  out,
}: {
  present: SceneChar[];
  out: SceneChar[];
}) {
  const cap = present.slice(0, DESK_COUNT);

  const nodeRef = useRef<Record<string, HTMLDivElement | null>>({});
  const innerRef = useRef<Record<string, HTMLDivElement | null>>({});
  const simRef = useRef<SimChar[]>([]);
  const [bubbles, setBubbles] = useState<
    Record<string, { text: string; visible: boolean }>
  >({});
  const [phone, setPhone] = useState<{
    char: SceneChar;
    x: number;
    y: number;
    key: number;
  } | null>(null);

  const presentKey = cap.map((c) => c.id).join(",");

  // 시뮬레이션 초기화 (사람 목록이 바뀔 때)
  useEffect(() => {
    simRef.current = cap.map((c, i) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      char: c.char,
      deskIndex: i,
      x: charAtDesk(i).x,
      y: charAtDesk(i).y,
      lastX: charAtDesk(i).x,
      activity: "work",
    }));
    const b: Record<string, { text: string; visible: boolean }> = {};
    cap.forEach((c) => {
      b[c.id] = { text: BUBBLE.work, visible: true };
    });
    setBubbles(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey]);

  // 핵심 활동 루프 (계속 돌면서 캐릭터 이동/행동 변경)
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval>;
    let phase = 0;

    const plan = () => {
      const sims = simRef.current;
      for (const st of sims) {
        const roll = Math.random();
        let target: { x: number; y: number };
        let act: Activity;
        if (roll < 0.42) {
          // 집중 근무 (책상 고정)
          target = charAtDesk(st.deskIndex);
          act = "work";
        } else if (roll < 0.55) {
          // 밥 먹으러 간식 코너
          target = EXTRA_SPOTS[0];
          act = "eat";
        } else if (roll < 0.78) {
          // 한가롭게 걷기
          target =
            EXTRA_SPOTS[1 + Math.floor(Math.random() * (EXTRA_SPOTS.length - 1))];
          act = "walk";
        } else {
          // 다른 사람 찾아가서 대화
          const others = sims.filter((o) => o.id !== st.id);
          const peer =
            others.length > 0
              ? others[Math.floor(Math.random() * others.length)]
              : null;
          if (peer) {
            const a = charAtDesk(st.deskIndex);
            const b = charAtDesk(peer.deskIndex);
            target = {
              x: (a.x + b.x) / 2,
              y: Math.min(a.y, b.y) - 6,
            };
            act = "talk";
            const pi = sims.findIndex((o) => o.id === peer.id);
            if (pi >= 0) {
              sims[pi].activity = "talk";
              sims[pi].x = target.x;
              sims[pi].y = target.y + 10;
              moveNode(sims[pi], innerRef.current[peer.id], nodeRef.current[peer.id]);
              setBubbles((prev) => ({
                ...prev,
                [peer.id]: { text: BUBBLE.talk, visible: true },
              }));
            }
          } else {
            target = charAtDesk(st.deskIndex);
            act = "talk";
          }
        }
        st.x = target.x;
        st.y = target.y;
        st.activity = act;
        moveNode(st, innerRef.current[st.id], nodeRef.current[st.id]);
        setBubbles((prev) => ({
          ...prev,
          [st.id]: { text: BUBBLE[act], visible: true },
        }));
      }
    };

    timer = setInterval(() => {
      phase += 1;
      if (phase % 3 === 0) plan();
    }, 700);

    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey]);

  // 걸려오는 전화 (외근/출장자)
  useEffect(() => {
    if (out.length === 0) return;
    let active = true;
    let callT: ReturnType<typeof setTimeout>;

    const schedule = () => {
      callT = setTimeout(() => {
        if (!active) return;
        const pick = out[Math.floor(Math.random() * out.length)];
        const spot = EXTRA_SPOTS[Math.floor(Math.random() * EXTRA_SPOTS.length)];
        setPhone({ char: pick, x: spot.x, y: spot.y, key: ++simSeq });
        setTimeout(() => {
          if (active) setPhone(null);
        }, 6000);
        schedule();
      }, 15000 + Math.random() * 15000);
    };
    schedule();
    return () => {
      active = false;
      clearTimeout(callT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
return (
    <div
      className="relative h-[620px] w-full select-none overflow-hidden bg-[#d8d2c4] sm:h-[680px]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* 책상 (고정, 캐릭터와 별도 레이어) */}
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

      {/* 사무실 캐릭터 */}
      {cap.map((c) => {
        const seat = charAtDesk(cap.indexOf(c));
        return (
          <div
            key={c.id}
            ref={(el) => {
              nodeRef.current[c.id] = el;
            }}
            className="absolute"
            style={
              {
                left: `${seat.x}%`,
                top: `${seat.y}%`,
                transform: "translateX(-50%)",
                transition: "left 3.2s linear, top 3.2s linear",
                zIndex: 20,
              } as CSSProperties
            }
          >
            <div
              ref={(el) => {
                innerRef.current[c.id] = el;
              }}
              className="relative"
            >
              {bubbles[c.id]?.visible && (
                <span className="absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 shadow-sm">
                  {bubbles[c.id].text}
                </span>
              )}
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

      {/* 걸려오는 전화 오버레이 (외근/출장자) */}
      {phone && (
        <div
          key={phone.key}
          className="phone-overlay absolute -translate-x-1/2"
          style={{ left: `${phone.x}%`, top: `${phone.y}%`, zIndex: 40 }}
        >
          <span className="absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-blue-300 bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            📞 {phone.char.name} 전화중
          </span>
          <div className="relative">
            <PixelSprite
              grid={phone.char.char.grid}
              palette={phone.char.char.palette}
              size={4}
              title={phone.char.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function moveNode(
  st: SimChar,
  inner: HTMLDivElement | null,
  node: HTMLDivElement | null
) {
  if (!node) return;
  if (inner && st.x !== st.lastX) {
    inner.style.transform = st.x < st.lastX ? "scaleX(-1)" : "scaleX(1)";
  }
  st.lastX = st.x;
  node.style.left = `${st.x}%`;
  node.style.top = `${st.y}%`;
}