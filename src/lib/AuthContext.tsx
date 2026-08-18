"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Employee } from "@/lib/types";
import { useData } from "@/lib/DataContext";
import * as api from "@/lib/supabase";
import {
  hashPin,
  getSessionId,
  setSessionId,
  clearSessionId,
  normalizePhone,
  phoneLast4,
} from "@/lib/auth";
import { Modal, inputCls } from "@/components/ui";

type LoginResult = "ok" | "notfound" | "wrong";

interface AuthContextValue {
  user: Employee | null;
  isAdmin: boolean;
  login: (phone: string, pin: string) => Promise<LoginResult>;
  logout: () => void;
  changePin: (newPin: string) => Promise<void>;
  openLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { employees, refresh } = useData();
  const [user, setUser] = useState<Employee | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 세션 복구
  useEffect(() => {
    const id = getSessionId();
    if (id) {
      const found = employees.find((e) => e.id === id);
      if (found) setUser(found);
      else clearSessionId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  const login = useCallback(
    async (rawPhone: string, rawPin: string): Promise<LoginResult> => {
      const hp = normalizePhone(rawPhone);
      const emp = employees.find((e) => e.phone && normalizePhone(e.phone) === hp);
      if (!emp) return "notfound";
      if (emp.password_hash) {
        const h = await hashPin(rawPin);
        if (h !== emp.password_hash) return "wrong";
      } else {
        // 자동 회원가입: 기존 직원은 전화번호 뒷4자리로 첫 로그인
        if (phoneLast4(rawPhone) !== rawPin.trim()) return "wrong";
        await api.updateEmployeeAuth(emp.id, { password_hash: await hashPin(rawPin) });
        await refresh();
      }
      setSessionId(emp.id);
      const found = employees.find((e) => e.id === emp.id) ?? emp;
      setUser(found);
      return "ok";
    },
    [employees, refresh]
  );

  const logout = useCallback(() => {
    clearSessionId();
    setUser(null);
  }, []);

  const changePin = useCallback(
    async (newPin: string) => {
      if (!user) return;
      await api.updateEmployeeAuth(user.id, { password_hash: await hashPin(newPin) });
      await refresh();
      const found = employees.find((e) => e.id === user.id);
      if (found) setUser(found);
    },
    [user, employees, refresh]
  );

  const openLogin = useCallback(() => {
    setMsg(null);
    setPin("");
    setLoginOpen(true);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) {
      setMsg("전화번호와 뒷자리 4자리를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await login(phone, pin);
    setBusy(false);
    if (r === "ok") setLoginOpen(false);
    else if (r === "notfound") setMsg("등록된 전화번호가 없습니다. 관리자에게 확인하세요.");
    else setMsg("뒷자리 4자리가 일치하지 않습니다.");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: !!user?.is_admin,
        login,
        logout,
        changePin,
        openLogin,
      }}
    >
      {children}

      <Modal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="🔐 로그인"
        footer={
          <button
            form="login-form"
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "확인 중..." : "로그인"}
          </button>
        }
      >
        <form id="login-form" onSubmit={submit} className="space-y-3">
          <p className="text-xs text-zinc-500">
            전화번호와 <b>뒷자리 4자리(초기 로그인 = 자동 가입)</b>로 로그인합니다.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-600">전화번호</span>
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-600">뒷자리 4자리</span>
            <input
              className={inputCls}
              value={pin}
              maxLength={4}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="1234"
            />
          </label>
          {msg && <p className="text-sm font-medium text-rose-600">{msg}</p>}
        </form>
      </Modal>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
