"use client";

// 전화번호 로그인 + 권한 확인 유틸

const SESSION_KEY = "cal_session";
const SALT = "scheduler::";

export function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + pin);
  return crypto.subtle.digest("SHA-256", data).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}

export function getSessionId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
export function setSessionId(id: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}
export function clearSessionId() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// 전화번호 정규화: 010-1234-5678 / 01012345678 → 01012345678
export function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, "");
}

export function phoneLast4(p: string): string {
  const n = normalizePhone(p);
  return n.length >= 4 ? n.slice(-4) : n;
}