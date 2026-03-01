"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useTelegram } from "@/lib/telegram/useTelegram";

type CaseDto = {
  id: string;
  title: string;
  priceStars: number;
  imageUrl: string | null;
};

function safeArray<T>(val: any): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && Array.isArray(val.cases)) return val.cases as T[];
  if (val && Array.isArray(val.data)) return val.data as T[];
  return [];
}

export default function HomePage() {
  const tg = useTelegram();
  const router = useRouter();

  const [cases, setCases] = useState<CaseDto[]>([]);
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    tg.ready();
    tg.expand();

    (async () => {
      try {
        const res = await api.get("/api/cases");
        setCases(safeArray<CaseDto>(res));
      } catch {
        setCases([]);
      }
    })();

    // баланс (если у тебя есть такой endpoint — подхватим; иначе просто покажем 0)
    (async () => {
      try {
        const me = await api.get("/api/me");
        const s =
          (typeof me?.stars === "number" && me.stars) ||
          (typeof me?.balanceStars === "number" && me.balanceStars) ||
          (typeof me?.balance === "number" && me.balance) ||
          0;
        setStars(Number.isFinite(s) ? s : 0);
      } catch {
        setStars(0);
      }
    })();
  }, [tg]);

  const title = useMemo(() => {
    const u = (tg as any)?.user;
    const name = u?.first_name || u?.username || "KARABAS";
    return String(name).toUpperCase();
  }, [tg]);

  return (
    <div className="min-h-screen pb-24">
      {/* фон */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.20),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.16),transparent_50%)]" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.10),transparent_18%),radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.08),transparent_16%),radial-gradient(circle_at_40%_75%,rgba(255,255,255,0.08),transparent_14%)]" />
      </div>

      <div className="px-5 pt-5">
        {/* верхняя панель */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-semibold">
            {title.slice(0, 1)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-wide truncate">{title}</div>
            <div className="text-[11px] opacity-60 -mt-0.5 truncate">KARABAS CASE</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/5 border border-white/10 px-3 py-2 flex items-center gap-2">
              <div className="text-xs opacity-70">⭐</div>
              <div className="text-sm font-semibold tabular-nums">{stars ?? "—"}</div>
            </div>

            <button
              onClick={() => router.push("/topup?open=1")}
              className="w-11 h-11 rounded-full bg-blue-600/90 active:scale-95 transition border border-white/10 flex items-center justify-center text-xl"
              aria-label="Пополнить"
              title="Пополнить"
            >
              +
            </button>
          </div>
        </div>

        {/* переключатель валют */}
        <div className="mt-6 flex gap-3">
          <button className="flex-1 h-12 rounded-2xl bg-white text-black font-semibold tracking-[0.2em] text-sm">
            STARS
          </button>
          <button
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-semibold tracking-[0.2em] text-sm"
            disabled
          >
            SC COIN
          </button>
        </div>

        {/* список кейсов */}
        <div className="mt-7">
          <div className="text-xs tracking-[0.35em] uppercase opacity-40 text-center">КЕЙСЫ</div>

          {cases.length === 0 ? (
            <div className="mt-8 rounded-3xl bg-white/5 border border-white/10 p-6 text-center opacity-70">
              Кейс не найден
            </div>
          ) : (
            <div className={"mt-6 grid gap-5 " + (cases.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/case/${c.id}`)}
                  className="group rounded-[32px] bg-white/5 border border-white/10 overflow-hidden active:scale-[0.99] transition"
                >
                  <div className="relative w-full aspect-square">
                    <Image
                      src={c.imageUrl || "/assets/cases/karabas.png"}
                      alt={c.title}
                      fill
                      className="object-contain p-5 drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
                      priority={cases.length === 1}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.12),transparent_55%)]" />
                  </div>

                  <div className="px-4 pb-4">
                    <div className="mt-1 text-sm font-semibold tracking-wide truncate">{c.title}</div>

                    <div className="mt-3">
                      <div className="w-full rounded-2xl bg-white/5 border border-white/10 py-3 text-sm font-semibold">
                        {c.priceStars} ⭐
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* нижняя навигация */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5">
        <div className="rounded-[28px] bg-black/40 backdrop-blur-xl border border-white/10 h-16 flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-blue-400">
            <span className="text-xl">⌂</span>
            <span className="text-[10px] tracking-[0.25em] uppercase">Главная</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/35" disabled>
            <span className="text-xl">🏆</span>
            <span className="text-[10px] tracking-[0.25em] uppercase">Конкурсы</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/35" disabled>
            <span className="text-xl">👤</span>
            <span className="text-[10px] tracking-[0.25em] uppercase">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  );
}
