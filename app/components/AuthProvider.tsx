"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type MeResponse = {
  ok: true;
  user: { id: string; tgId: string; username: string | null; balanceCoin: number; createdAt: string };
  openings: Array<{
    id: string;
    caseId: string;
    caseTitle: string;
    resultTitle: string;
    rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    createdAt: string;
  }>;
  inventory: Array<{ id: string; title: string; rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY"; qty: number }>;
};

type AuthState =
  | { status: "loading" }
  | { status: "need_telegram" }
  | { status: "error"; message: string }
  | { status: "ready"; me: MeResponse };

type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitData(): string {
  // @ts-expect-error Telegram injected
  const tg = typeof window !== "undefined" ? (window.Telegram?.WebApp ?? null) : null;
  return tg?.initData || "";
}

async function authWithTelegram(initData: string) {
  const res = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ initData }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Auth failed");
  }
}

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { credentials: "include" });
  const j = await res.json();
  if (!res.ok || !j?.ok) {
    throw new Error(j?.error || "Failed to load profile");
  }
  return j as MeResponse;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setState({ status: "ready", me });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Telegram UX helpers
        // @ts-expect-error Telegram injected
        const webApp = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
        webApp?.ready?.();
        webApp?.expand?.();

        const initData = getInitData();
        if (!initData) {
          setState({ status: "need_telegram" });
          return;
        }

        await authWithTelegram(initData);
        const me = await fetchMe();
        setState({ status: "ready", me });
      } catch (e: any) {
        setState({ status: "error", message: typeof e?.message === "string" ? e.message : "Unknown error" });
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, refresh }), [state, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
