"use client";

import { useEffect, useMemo, useState } from "react";
import { useTelegram } from "@/lib/telegram/useTelegram";
import { api } from "@/lib/api";

const PACKS = [
  { id: "p1", title: "Stars Top Up", stars: 1 },
  { id: "p50", title: "50 ⭐", stars: 50 },
  { id: "p100", title: "100 ⭐", stars: 100 },
];

export default function TopupPage() {
  const tg = useTelegram();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    tg.ready();
    tg.expand();
  }, [tg]);

  const buy = async (packId: string) => {
    setLoading(true);
    setNote(null);
    try {
      await api.post("/api/payments/create-invoice", { packId });
      setNote("Инвойс отправлен в чат с ботом. Оплати и вернись сюда — баланс обновится автоматически.");
    } catch (e: any) {
      setNote(e?.message || "Ошибка создания инвойса");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5">
      <div className="text-xl font-semibold mb-2">Пополнение ⭐</div>
      <div className="text-sm opacity-70 mb-5">1 ⭐ = 1 ⭐ (внутренняя валюта). После оплаты баланс подтянется автоматически.</div>

      <div className="grid gap-3">
        {PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => buy(p.id)}
            disabled={loading}
            className="rounded-2xl px-5 py-4 bg-white/5 border border-white/10 active:scale-[0.99] text-left"
          >
            <div className="font-medium">{p.title}</div>
            <div className="text-sm opacity-70">{p.stars} ⭐</div>
          </button>
        ))}
      </div>

      {note && <div className="mt-4 text-sm opacity-80">{note}</div>}

      <div className="mt-8 text-sm opacity-60">
        Скоро добавим оплату через Crypto Bot и TON Connect.
      </div>
    </div>
  );
}
