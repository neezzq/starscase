"use client";

import Image from "next/image";
import Link from "next/link";
import NavBar from "./NavBar";
import { useAuth } from "./AuthProvider";

function shortName(username: string | null, tgId: string) {
  if (username) return `@${username}`;
  return `ID: ${tgId}`;
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-[420px] px-4 py-10">
        <div className="rounded-2xl bg-white/5 p-6">Загрузка…</div>
      </div>
    );
  }

  if (state.status === "need_telegram") {
    return (
      <div className="mx-auto max-w-[420px] px-4 py-10">
        <div className="rounded-2xl bg-white/5 p-6">
          <div className="text-lg font-semibold">Открой Mini App из Telegram</div>
          <div className="mt-2 text-sm text-white/70">
            Эта страница должна быть открыта кнопкой <b>web_app</b> внутри чата с ботом <b>KARABAS CASE</b>.
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-[420px] px-4 py-10">
        <div className="rounded-2xl bg-red-500/10 p-6">
          <div className="text-lg font-semibold">Ошибка</div>
          <div className="mt-2 text-sm text-white/80">{state.message}</div>
        </div>
      </div>
    );
  }

  const me = state.me;

  return (
    <div className="mx-auto max-w-[420px] px-4 pb-24 pt-4">
      <div className="mb-4 rounded-3xl bg-white/5 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white/10">
              {me.user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.user.photoUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/60">TG</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">KARABAS CASE</div>
              <div className="truncate text-xs text-white/70">{shortName(me.user.username, me.user.tgId)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <Image src="/assets/star.png" alt="star" width={18} height={18} />
              <div className="text-sm font-semibold">{me.user.balanceStars}</div>
            </div>

            <Link
              href="/topup"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold hover:bg-white/15"
              aria-label="Top up"
            >
              +
            </Link>
          </div>
        </div>
      </div>

      {children}
      <NavBar />
    </div>
  );
}
