"use client";

import ClientShell from "../components/ClientShell";
import { useAuth } from "../components/AuthProvider";

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

const rarityBadge: Record<string, string> = {
  COMMON: "bg-white/10 text-white/80",
  RARE: "bg-blue-500/15 text-blue-200",
  EPIC: "bg-purple-500/15 text-purple-200",
  LEGENDARY: "bg-yellow-500/15 text-yellow-200",
};

export default function ProfilePage() {
  const { state, refresh } = useAuth();

  if (state.status !== "ready") return null;

  return (
    <ClientShell>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Профиль</div>
        <button
          className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          onClick={refresh}
        >
          Обновить
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-white/5 p-4">
          <div className="text-sm text-white/70">Telegram</div>
          <div className="mt-1 text-sm font-medium">
            {state.me.user.username ? `@${state.me.user.username}` : `tg:${state.me.user.tgId}`}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 p-4">
          <div className="text-sm text-white/70">Последние открытия (20)</div>
          <div className="mt-3 grid gap-2">
            {state.me.openings.length === 0 && (
              <div className="text-sm text-white/60">Пока нет открытий.</div>
            )}
            {state.me.openings.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{o.caseTitle}</div>
                  <div className="truncate text-xs text-white/60">{fmtDate(o.createdAt)}</div>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className={"rounded-lg px-2 py-1 text-xs " + (rarityBadge[o.rarity] ?? "bg-white/10")}>
                    {o.rarity}
                  </span>
                  <span className="max-w-[160px] truncate text-sm">{o.resultTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 p-4">
          <div className="text-sm text-white/70">Инвентарь</div>
          <div className="mt-3 grid gap-2">
            {state.me.inventory.length === 0 && <div className="text-sm text-white/60">Пусто.</div>}
            {state.me.inventory.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{it.title}</div>
                  <div className="mt-1">
                    <span className={"rounded-lg px-2 py-1 text-xs " + (rarityBadge[it.rarity] ?? "bg-white/10")}>
                      {it.rarity}
                    </span>
                  </div>
                </div>
                <div className="ml-3 text-sm font-semibold">x{it.qty}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
