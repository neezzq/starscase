"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, animate } from "framer-motion";
import { api } from "@/lib/api";
import { useTelegram } from "@/lib/telegram/useTelegram";

type CaseDto = {
  id: string;
  title: string;
  priceStars: number;
  imageUrl: string | null;
};

type ItemDto = {
  id?: string;
  title: string;
  imageUrl?: string | null;
  chance?: number; // 0..1
  weight?: number;
};

function safeArray<T>(val: any): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && Array.isArray(val.items)) return val.items as T[];
  if (val && Array.isArray(val.caseItems)) return val.caseItems as T[];
  if (val && Array.isArray(val.data)) return val.data as T[];
  return [];
}

export default function CasePage({ params }: { params: { id: string } }) {
  const tg = useTelegram();
  const router = useRouter();

  const [caseInfo, setCaseInfo] = useState<CaseDto | null>(null);
  const [items, setItems] = useState<ItemDto[]>([]);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<any[] | null>(null);

  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    tg.ready();
    tg.expand();

    (async () => {
      // пытаемся получить детали кейса
      try {
        const res = await api.get(`/api/cases/${params.id}`);
        const c = res?.case || res;
        if (c?.id) setCaseInfo(c);
        const its = safeArray<ItemDto>(res);
        if (its.length) setItems(its);
      } catch {
        // fallback: тянем список и ищем кейс
        try {
          const res = await api.get("/api/cases");
          const list = Array.isArray(res) ? res : res?.cases ?? [];
          const c = list.find((x: any) => String(x.id) === String(params.id));
          if (c) setCaseInfo(c);
        } catch {}
      }

      // fallback items по нашему кейсу KARABAS
      setItems((prev) =>
        prev.length
          ? prev
          : [
              { title: "PEPE", imageUrl: "/assets/items/pepe.png", chance: 0.00001 },
              { title: "HEART", imageUrl: "/assets/items/heart.png", chance: 0.2 },
              { title: "TON CUPCAKE", imageUrl: "/assets/items/cupcake.png", chance: 0.8 },
            ]
      );
    })();

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
  }, [tg, params.id]);

  const price = useMemo(() => caseInfo?.priceStars ?? 1, [caseInfo]);
  const title = useMemo(() => (caseInfo?.title ?? "KARABAS").toUpperCase(), [caseInfo]);

  // swipe button
  const railRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);

  const resetSwipe = async () => {
    await animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
  };

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.post("/api/cases/open", { caseId: params.id, qty, demo: false });
      setOpening(res?.results ?? res?.data?.results ?? res?.result ?? res);
    } finally {
      setBusy(false);
      resetSwipe();
    }
  };

  const onSwipeEnd = () => {
    const rail = railRef.current;
    if (!rail) return;

    const maxX = Math.max(0, rail.clientWidth - 58 - 10); // handle 58 + padding
    const threshold = maxX * 0.72;

    if (x.get() >= threshold) {      open();
    } else {      resetSwipe();
    }
  };

  const formattedChance = (it: ItemDto) => {
    const c =
      typeof it.chance === "number"
        ? it.chance
        : typeof it.weight === "number"
          ? it.weight / items.reduce((s, i) => s + (i.weight ?? 0), 0)
          : null;

    if (c == null || !Number.isFinite(c)) return null;
    if (c < 0.001) return `${(c * 100).toFixed(3)}%`;
    return `${(c * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen pb-28">
      {/* фон */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.14),transparent_50%)]" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.10),transparent_18%),radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.08),transparent_16%),radial-gradient(circle_at_45%_78%,rgba(255,255,255,0.08),transparent_14%)]" />
      </div>

      <div className="px-5 pt-5">
        {/* top bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg active:scale-95 transition"
            aria-label="Назад"
          >
            ←
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-wide truncate">{title}</div>
            <div className="text-[11px] opacity-60 -mt-0.5 truncate">ОТКРЫТИЕ КЕЙСА</div>
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
            >
              +
            </button>
          </div>
        </div>

        {/* carousel */}
        <div className="mt-7 rounded-[36px] bg-white/5 border border-white/10 p-5">
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {items.map((it, idx) => (
              <div key={idx} className="min-w-[120px] w-[120px] snap-center">
                <div className="rounded-3xl bg-black/30 border border-white/10 p-3 h-[120px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.12),transparent_60%)]" />
                  <div className="relative w-full h-full">
                    <Image
                      src={it.imageUrl || "/assets/items/heart.png"}
                      alt={it.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold text-center truncate">{it.title}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-white/45"
                    style={{
                      width: (() => {
                        const c = formattedChance(it);
                        if (!c) return "30%";
                        const num = parseFloat(c.replace("%", ""));
                        return `${Math.min(100, Math.max(6, num))}%`;
                      })(),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-center">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white/25" />
          </div>

          {/* qty */}
          <div className="mt-5 rounded-2xl bg-black/30 border border-white/10 p-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setQty(n)}
                className={
                  "flex-1 h-10 rounded-xl text-sm font-semibold " +
                  (qty === n ? "bg-blue-600/90 border border-white/10" : "bg-white/5 border border-white/10 opacity-80")
                }
              >
                x{n}
              </button>
            ))}
          </div>

          {/* swipe to open */}
          <div className="mt-5">
            <div
              ref={railRef}
              className="relative rounded-[28px] bg-black/35 border border-white/10 h-16 overflow-hidden"
              role="button"
              tabIndex={0}
              onClick={() => (!busy ? open() : undefined)}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
                <div className="text-[12px] tracking-[0.35em] uppercase opacity-80">Свайпните</div>
                <div className="text-[11px] opacity-60 mt-0.5">{price * qty} ⭐</div>
              </div>

              <motion.div
                className="absolute left-[5px] top-[5px] w-[58px] h-[58px] rounded-[22px] bg-blue-600/95 border border-white/10 flex items-center justify-center text-2xl"
                style={{ x }}
                drag="x"
                dragConstraints={railRef}
                dragElastic={0.08}
                onDragEnd={onSwipeEnd}
                whileTap={{ scale: 0.98 }}
                role="button"
                aria-label="Свайп для открытия"
                onDoubleClick={open}
              >
                ›
              </motion.div>

              {/* клик как запасной вариант */}
              <button
                onClick={open}
                disabled={busy}
                className="absolute inset-0"
                aria-label="Открыть"
                style={{ background: "transparent" }}
              />
            </div>

            {busy ? <div className="mt-3 text-center text-xs opacity-70">Открываем...</div> : null}
          </div>
        </div>

        {/* possible drop */}
        <div className="mt-7">
          <div className="text-xs tracking-[0.35em] uppercase opacity-40 text-center">Возможный дроп</div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {items.slice(0, 6).map((it, idx) => (
              <div key={idx} className="rounded-[28px] bg-white/5 border border-white/10 p-4">
                <div className="relative w-full aspect-square rounded-2xl bg-black/25 border border-white/10 overflow-hidden">
                  <Image src={it.imageUrl || "/assets/items/heart.png"} alt={it.title} fill className="object-contain p-4" />
                </div>
                <div className="mt-2 text-xs font-semibold truncate">{it.title}</div>
                <div className="mt-1 text-[11px] opacity-60">{formattedChance(it) ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* result modal */}
      {opening ? (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" onClick={() => setOpening(null)}>
          <div
            className="w-full max-w-md rounded-[36px] bg-neutral-900 border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm tracking-[0.35em] uppercase opacity-60 text-center">Результат</div>

            <div className="mt-4 grid gap-3">
              {(Array.isArray(opening) ? opening : safeArray<any>(opening)).map((r: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 rounded-3xl bg-white/5 border border-white/10 p-3">
                  <div className="relative w-12 h-12 rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                    {r?.imageUrl ? <Image src={r.imageUrl} alt={r.title ?? "item"} fill className="object-contain p-2" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{r?.title ?? "Предмет"}</div>
                    <div className="text-[11px] opacity-60 truncate">{String(r?.rarity ?? "")}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="mt-5 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 font-semibold"
              onClick={() => setOpening(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      {/* bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5">
        <div className="rounded-[28px] bg-black/40 backdrop-blur-xl border border-white/10 h-16 flex items-center justify-around">
          <button onClick={() => router.push("/")} className="flex flex-col items-center gap-1 text-white/35">
            <span className="text-xl">⌂</span>
            <span className="text-[10px] tracking-[0.25em] uppercase">Главная</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-blue-400">
            <span className="text-xl">🎁</span>
            <span className="text-[10px] tracking-[0.25em] uppercase">Кейс</span>
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
