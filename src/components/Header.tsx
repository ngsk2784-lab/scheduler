"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Modal, inputCls } from "@/components/ui";

const NAV = [
  { href: "/", label: "📅 달력" },
  { href: "/office", label: "🏢 사무실" },
  { href: "/reports", label: "📌 보고" },
  { href: "/attendance", label: "🗓️ 출근부" },
  { href: "/stats", label: "📊 통계" },
  { href: "/employees", label: "👥 직원" },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, openLogin, logout, changePin } = useAuth();
  const [pinOpen, setPinOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function submitPin(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s]{4,16}$/.test(newPin)) {
      setPinMsg("4~16자, 공백 없이 영문/숫자/특수문자로 입력해 주세요.");
      return;
    }
    try {
      await changePin(newPin);
      setPinOpen(false);
      setNewPin("");
      setPinMsg(null);
      setMenuOpen(false);
    } catch {
      setPinMsg("변경에 실패했습니다.");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white shadow-sm">
              🗓️
            </span>
            <div className="min-w-0 leading-tight">
              <div className="hidden truncate text-sm font-bold text-zinc-900 sm:block">회사 스케줄 달력</div>
              <div className="hidden text-[11px] text-zinc-400 sm:block">사내 전용</div>
            </div>
          </div>

          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative shrink-0">
            {user ? (
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: user.color }} />
                {user.name}
                {isAdmin && <span className="rounded bg-indigo-100 px-1 text-[10px] font-semibold text-indigo-600">관리자</span>}
                <span className="text-zinc-400">▾</span>
              </button>
            ) : (
              <button
                onClick={openLogin}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                🔐 로그인
              </button>
            )}
            {menuOpen && user && (
              <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-zinc-200 bg-white shadow-lg">
                <button
                  onClick={() => { setPinOpen(true); setMenuOpen(false); }}
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  🔑 핀 변경
                </button>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Modal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title="🔑 로그인 핀 변경"
        footer={
          <button form="pin-form" type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            변경
          </button>
        }
      >
        <form id="pin-form" onSubmit={submitPin} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-600">새 비밀번호 (4~16자)</span>
            <input
              type="password"
              className={inputCls}
              value={newPin}
              maxLength={16}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="영문/숫자/특수문자"
            />
          </label>
          {pinMsg && <p className="text-sm font-medium text-rose-600">{pinMsg}</p>}
        </form>
      </Modal>
    </>
  );
}


