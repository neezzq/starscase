"use client";

import NavBar from "./NavBar";
import { useAuth } from "./AuthProvider";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl bg-white/5 p-6">Загрузка…</div>
      </div>
    );
  }

  if (state.status === "need_telegram") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl bg-white/5 p-6">
          <div className="text-lg font-semibold">Открой Mini App из Telegram</div>
          <div className="mt-2 text-sm text-white/70">
            Эта страница должна быть открыта кнопкой <b>web_app</b> внутри чата с ботом StarsCase.
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl bg-red-500/10 p-6">
          <div className="text-lg font-semibold">Ошибка</div>
          <div className="mt-2 text-sm text-white/80">{state.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-4">
      <div className="mb-4 rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70">Баланс</div>
            <div className="text-2xl font-bold">{state.me.user.balanceCoin} SC</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/70">Пользователь</div>
            <div className="text-sm font-medium">
              {state.me.user.username ? `@${state.me.user.username}` : `tg:${state.me.user.tgId}`}
            </div>
          </div>
        </div>
      </div>

      {children}
      <NavBar />
    </div>
  );
}
