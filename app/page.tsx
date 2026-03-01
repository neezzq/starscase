"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { api } from "@/lib/api";
import { useTelegram } from "@/lib/telegram/useTelegram";

type CaseDto = {
  id: string;
  title: string;
  priceStars: number;
  imageUrl: string | null;
};

type OpenResult = {
  title: string;
  rarity?: string;
  imageUrl?: string | null;
};

function normalizeCases(raw: any): CaseDto[] {
  if (Array.isArray(raw)) return raw as CaseDto[];
  if (Array.isArray(raw?.cases)) return raw.cases as CaseDto[];
  if (Array.isArray(raw?.data)) return raw.data as CaseDto[];
  if (Array.isArray(raw?.data?.cases)) return raw.data.cases as CaseDto[];
  return [];
}

export default function HomePage() {
  const tg = useTelegram();
  const router = useRouter();

  const [cases, setCases] = useState<CaseDto[] | null>(null);
  const [qty, setQty] = useState(1);
  const [demo, setDemo] = useState(false);
  const [opening, setOpening] = useState<OpenResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    tg.ready();
    tg.expand();

    (async () => {
      try {
        const raw = await api.get("/api/cases");
        setCases(normalizeCases(raw));
      } catch {
        setCases([]);
      }
    })();
  }, [tg]);

  const karabas = useMemo(() => (cases && cases.length ? cases[0] : null), [cases]);

  const open = async () => {
    if (!karabas || busy) return;
    setBusy(true);
    try {
      const res = await api.post("/api/cases/open", { caseId: karabas.id, qty, demo });
      setOpening((res?.results ?? res) as OpenResult[]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] p-4 pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-xl font-semibold">KARABAS CASE</div>

        <button
          onClick={() => router.push("/topup?open=1")}
          className="shrink-0 rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm"
        >
          Пополнить ⭐
        </button>
      </div>

      {/* Content */}
      {cases === null ? (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <div className="h-40 rounded-2xl bg-white/5" />
          <div className="mt-4 h-4 w-40 rounded bg-white/10" />
          <div className="mt-2 h-4 w-24 rounded bg-white/10" />
          <div className="mt-4 h-12 rounded-2xl bg-white/10" />
        </div>
      ) : !karabas ? (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4 text-sm opacity-80">
          Кейс не найден. Проверь, что сид/база данных на проде заполнены и /api/cases возвращает список.
        </div>
      ) : (
        <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
          {karabas.imageUrl ? (
            <div className="relative w-full aspect-[16/9]">
              <Image src={karabas.imageUrl} alt={karabas.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-[16/9] bg-white/5" />
          )}

          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{karabas.title}</div>
              <div className="text-sm opacity-80">{karabas.priceStars} ⭐</div>
            </div>

            {/* qty selector */}
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setQty(n)}
                  className={
                    "px-3 py-2 rounded-xl border text-sm " +
                    (qty === n
                      ? "bg-white/15 border-white/25"
                      : "bg-white/5 border-white/10")
                  }
                >
                  x{n}
                </button>
              ))}

              <label className="ml-auto flex items-center gap-2 text-sm opacity-80 select-none">
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                />
                demo
              </label>
            </div>

            <button
              onClick={open}
              disabled={busy}
              className="mt-4 w-full rounded-2xl bg-blue-600/80 hover:bg-blue-600 px-4 py-3 font-medium"
            >
              {busy ? "Открываем..." : demo ? `Открыть демо x${qty}` : `Открыть x${qty}`}
            </button>
          </div>
        </div>
      )}

      {/* Result modal */}
      <AnimatePresence>
        {opening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-6"
            onClick={() => setOpening(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 10 }}
              className="w-full max-w-md rounded-3xl bg-neutral-900 border border-white/10 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-semibold mb-3">Результат</div>

              <div className="grid gap-3">
                {opening.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden relative">
                      {r.imageUrl ? (
                        <Image
                          src={r.imageUrl}
                          alt={r.title}
                          fill
                          className="object-contain"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs opacity-70">{String(r.rarity ?? "")}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="mt-5 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3"
                onClick={() => setOpening(null)}
              >
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
