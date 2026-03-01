"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { api } from "@/lib/api";
import { useTelegram } from "@/lib/telegram/useTelegram";

type CaseDto = {
  id: string;
  title: string;
  priceStars: number;
  imageUrl: string | null;
};

export default function HomePage() {
  const tg = useTelegram();
  const [cases, setCases] = useState<CaseDto[]>([]);
  const [qty, setQty] = useState(1);
  const [demo, setDemo] = useState(false);
  const [opening, setOpening] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    tg.ready();
    tg.expand();
    (async () => {
      const res = await api.get("/api/cases");
      setCases(res);
    })();
  }, [tg]);

  const karabas = useMemo(() => cases[0], [cases]);

  const open = async () => {
    if (!karabas) return;
    setBusy(true);
    try {
      const res = await api.post("/api/cases/open", { caseId: karabas.id, qty, demo });
      setOpening(res.results);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5">
      <div className="text-2xl font-semibold mb-1">KARABAS CASE</div>
      <div className="text-sm opacity-70 mb-5">Кейс стоит 1 ⭐. Можно открыть 1–5 за раз.</div>

      {karabas && (
        <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
          {karabas.imageUrl && (
            <div className="relative w-full aspect-[16/9]">
              <Image src={karabas.imageUrl} alt={karabas.title} fill className="object-cover" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{karabas.title}</div>
              <div className="text-sm opacity-80">{karabas.priceStars} ⭐</div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    className={"px-3 py-2 rounded-xl border " + (qty===n ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10")}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="ml-auto flex items-center gap-2 text-sm opacity-80">
                <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                Demo (без инвентаря)
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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-3xl bg-neutral-900 border border-white/10 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-semibold mb-3">Результат</div>
              <div className="grid gap-3">
                {opening.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden relative">
                      {r.imageUrl && <Image src={r.imageUrl} alt={r.title} fill className="object-contain" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs opacity-70">{String(r.rarity)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-5 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3" onClick={() => setOpening(null)}>
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
