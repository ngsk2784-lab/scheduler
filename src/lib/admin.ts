"use client";

import { useCallback, useEffect, useState } from "react";

// 선택적 관리자 잠금: NEXT_PUBLIC_ADMIN_PIN 이 설정돼 있으면
// PIN을 입력해야 등록/수정 버튼이 활성화됩니다. (미설정 시 항상 열림 = 기존 동작)
const PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";

const STORAGE_KEY = "cal_admin_ok";

export function useAdmin() {
  const [unlocked, setUnlocked] = useState(() => {
    if (!PIN) return true;
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (!PIN) {
      setUnlocked(true);
      return;
    }
    setUnlocked(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const unlock = useCallback((pin: string) => {
    if (pin === PIN) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
  }, []);

  return {
    locked: !!PIN && !unlocked,
    unlocked,
    configured: !!PIN,
    unlock,
    lock,
  };
}
