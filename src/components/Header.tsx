"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/lib/admin";

const NAV = [
  { href: "/", label: "📅 달력" },
  { href: "/reports", label: "📌 보고" },
  { href: "/attendance", label: "🗓️ 출근부" },
  { href: "/stats", label: "📊 통계" },
  { href: "/employees", label: "👥 직원" },
];

export function Header() {
  const pathname = usePathname();
  const admin = useAdmin();

  function handleLockClick() {
    if (!admin.configured) return;
    if (admin.locked) {
      const pin = window.prompt("관리자 PIN을 입력하세요.");
      if (pin != null && !admin.unlock(pin)) window.alert("PIN이 올바르지 않습니다.");
    } else {
      admin.lock();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white shadow-sm">
            🗓️
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-zinc-900">회사 스케줄 달력</div>
            <div className="text-[11px] text-zinc-400">사내 전용</div>
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
          {admin.configured && (
            <button
              onClick={handleLockClick}
              title={admin.locked ? "잠금 해제" : "잠금"}
              className={`ml-1 rounded-lg px-2.5 py-2 text-sm ${admin.locked ? "text-rose-500 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}`}
            >
              {admin.locked ? "🔒" : "🔓"}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

