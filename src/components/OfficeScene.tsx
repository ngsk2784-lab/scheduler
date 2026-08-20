"use client";

import { useEffect, useRef, useState } from "react";
import { PixelSprite, makeDesk, type PixChar } from "@/components/pixels";

export interface SceneChar {
  id: string;
  name: string;
  color: string;
  position: string | null;
  char: PixChar;
}

const COLS = [18, 50, 84];
const ROWS = [36, 60, 82];
const DESK_COLS = 3;
const DESK_COUNT = 9;
const DESK_SIZE = 5;
const GLIDE = 2600;

function deskSpot(i: number) {
  const r = Math.floor(i / DESK_COLS);
  const c = i % DESK_COLS;
  return { x: COLS[c], y: ROWS[r] };
}
function charAtDesk(i: number) {
  const r = Math.floor(i / DESK_COLS);
  const c = i % DESK_COLS;
  return { x: COLS[c], y: ROWS[r] - 16 };
}

const EXTRA_SPOTS = [
  { x: 50, y: 14 },
  { x: 16, y: 12 },
  { x: 84, y: 12 },
  { x: 30, y: 44 },
  { x: 70, y: 44 },
  { x: 16, y: 92 },
  { x: 84, y: 92 },
];

type Action = "work" | "eat" | "talk" | "move";

const DIALOGUES = [
  "오늘 좀 바쁘시죠?",
  "점심 뭐 드셨어요?",
  "다음 주 마감 언제예요?",
  "이 자료 한 번만 봐주실래요?",
  "오늘 회의 몇 시였죠?",
  "보고서 어디까지 됐나요?",
  "이거 결재 부탁드려요.",
  "커피 한 잔 하시겠어요?",
  "내일 일정 확인하셨어요?",
  "주말에 뭐 하셨어요?",
  "퇴근하고 한잔 어떠세요?",
  "이번 달 정기점검 언제인가요?",
];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface SimState {
  id: string;
  name: string;
  position?: string | null;
  char: PixChar;
  deskIndex: number;
  home: { x: number; y: number };
  x: number;
  y: number;
  lastDx: number;
  mode: "work" | "go" | "do" | "return";
  action: Action;
  arriveAt: number;
  doUntil: number;
  swapAt: number;
  nextAt: number;
  dialogue: string;
  peer?: string;
}

export function OfficeScene({ present }: { present: SceneChar[] }) {
  const cap = present.slice(0, DESK_COUNT);
  const nodeRef = useRef<Record<string, HTMLDivElement | null>>({});
  const innerRef = useRef<Record<string, HTMLDivElement | null>>({});
  const simRef = useRef<SimState[]>([]);
  const bubbleRef = useRef<Record<string, string>>({});
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const presentKey = cap.map((c) => c.id).join(",");

  const setBubble = (id: string, text: string) => {
    if (bubbleRef.current[id] === text) return;
    bubbleRef.current[id] = text;
    setBubbles((prev) => (prev[id] === text ? prev : { ...prev, [id]: text }));
  };

  function plan(st: SimState, sims: SimState[], now: number) {
    const roll = Math.random();
    // 기본은 책상에 앉아 근무 유지
    if (roll < 0.5) {
      st.nextAt = now + rand(6000, 13000);
      return;
    }
    let target: { x: number; y: number };
    let action: Action;
    if (roll < 0.62) {
      // 가끔 간식 코너로 밥
      target = EXTRA_SPOTS[0];
      action = "eat";
    } else {
      // 이따금 다른 사람과 대화
      const free = sims.filter(
        (o) => o.id !== st.id && o.mode === "work" && o.action !== "talk"
      );
      if (roll < 0.86 && free.length > 0) {
        const peer = free[Math.floor(Math.random() * free.length)];
        const a = charAtDesk(st.deskIndex);
        const b = charAtDesk(peer.deskIndex);
        target = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 6 };
        action = "talk";
        peer.mode = "go";
        peer.action = "talk";
        peer.x = target.x;
        peer.y = target.y;
        peer.arriveAt = now + GLIDE;
        peer.dialogue = "💬";
        peer.peer = st.id;
        setBubble(peer.id, "💬");
        st.peer = peer.id;
      } else {
        target =
          EXTRA_SPOTS[1 + Math.floor(Math.random() * (EXTRA_SPOTS.length - 1))];
        action = "move";
      }
    }
    st.mode = "go";
    st.action = action;
    st.x = target.x;
    st.y = target.y;
    st.arriveAt = now + GLIDE;
    st.dialogue = action === "eat" ? "🍚" : "💨";
    setBubble(st.id, st.dialogue);
  }

  function step(st: SimState, sims: SimState[], now: number) {
    if (st.mode === "work") {
      if (now >= st.nextAt) plan(st, sims, now);
      return;
    }
    if (st.mode === "go") {
      if (now >= st.arriveAt) {
        st.mode = "do";
        if (st.action === "eat") {
          st.dialogue = "🍚 밥먹는중";
          st.doUntil = now + rand(3500, 6500);
        } else if (st.action === "talk") {
          st.dialogue = pick(DIALOGUES);
          st.swapAt = now;
          st.doUntil = now + rand(4000, 6000);
          if (st.peer) {
            const p = sims.find((o) => o.id === st.peer);
            if (p) {
              p.dialogue = st.dialogue;
              setBubble(p.id, p.dialogue);
            }
          }
        } else {
          st.dialogue = "💨 이동중";
          st.doUntil = now + 1500;
        }
        setBubble(st.id, st.dialogue);
      }
      return;
    }
    if (st.mode === "do") {
      if (now >= st.doUntil) {
        // 다시 자기 책상으로 복귀
        st.x = st.home.x;
        st.y = st.home.y;
        st.mode = "return";
        st.arriveAt = now + GLIDE;
        st.dialogue = "💨 이동중";
        setBubble(st.id, st.dialogue);
      } else if (st.action === "talk" && now >= st.swapAt + 2000) {
        st.swapAt = now;
        st.dialogue = pick(DIALOGUES);
        setBubble(st.id, st.dialogue);
        if (st.peer) {
          const p = sims.find((o) => o.id === st.peer);
          if (p) {
            p.dialogue = st.dialogue;
            setBubble(p.id, p.dialogue);
          }
        }
      }
      return;
    }
    if (st.mode === "return") {
      if (now >= st.arriveAt) {
        st.mode = "work";
        st.nextAt = now + rand(6000, 13000);
        st.dialogue = "💻 일하는중";
        st.peer = undefined;
        setBubble(st.id, st.dialogue);
      }
    }
  }

  // 초기화
  useEffect(() => {
    const first = Date.now();
    simRef.current = cap.map((c, i) => {
      const home = charAtDesk(i);
      return {
        id: c.id,
        name: c.name,
        position: c.position,
        char: c.char,
        deskIndex: i,
        home,
        x: home.x,
        y: home.y,
        lastDx: home.x,
        mode: "work" as const,
        action: "work" as const,
        arriveAt: 0,
        doUntil: 0,
        swapAt: 0,
        nextAt: first + rand(1500, 4000),
        dialogue: "💻 일하는중",
      };
    });
    for (const st of simRef.current) {
      setBubble(st.id, "💻 일하는중");
      setNode(st, nodeRef.current[st.id], innerRef.current[st.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey]);

  // 활동 루프
  useEffect(() => {
    const sims = simRef.current;
    const tick = setInterval(() => {
      const now = Date.now();
      for (const st of sims) step(st, sims, now);
      for (const st of sims)
        setNode(st, nodeRef.current[st.id], innerRef.current[st.id]);
    }, 300);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey]);

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

      {/* 캐릭터 */}
      {cap.map((c) => (
        <div
          key={c.id}
          ref={(el) => {
            nodeRef.current[c.id] = el;
          }}
          className="absolute"
          style={{
            transition: "left 2.6s linear, top 2.6s linear",
            transform: "translate(-50%, -100%)",
            zIndex: 20,
          }}
        >
          <div
            ref={(el) => {
              innerRef.current[c.id] = el;
            }}
            className="relative"
            style={{ width: 64, height: 72 }}
          >
            {/* 이름 + 직책 라벨 */}
            <div className="absolute -top-12 left-1/2 w-max max-w-[96px] -translate-x-1/2 rounded border border-zinc-700 bg-zinc-800/85 px-1.5 py-0.5 text-center leading-tight text-white shadow">
              <div className="truncate text-[11px] font-bold">{c.name}</div>
              <div className="truncate text-[9px] text-zinc-300">
                {c.position || "직원"}
              </div>
            </div>

            {/* 행동/대화 말풍선 */}
            {bubbles[c.id] && (
              <span className="absolute -top-[92px] left-1/2 z-30 w-max max-w-[150px] -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 shadow">
                {bubbles[c.id]}
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
      ))}
    </div>
  );
}

function setNode(
  st: SimState,
  node: HTMLDivElement | null,
  inner: HTMLDivElement | null
) {
  if (!node) return;
  if (inner && st.x !== st.lastDx) {
    inner.style.transform = st.x < st.lastDx ? "scaleX(-1)" : "scaleX(1)";
  }
  st.lastDx = st.x;
  node.style.left = st.x + "%";
  node.style.top = st.y + "%";
}