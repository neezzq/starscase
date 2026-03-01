"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ClientShell from "../components/ClientShell";
import { useAuth } from "../components/AuthProvider";

type Tab = "STARS" | "GIFTS" | "TON" | "CRYPTOBOT";

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function TopupPage() {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("STARS");

  const [starsInput, setStarsInput] = useState("1");
  const starsAmount = useMemo(() => {
    const n = Number(String(starsInput).replace(/[^0-9]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return 1;
    return clampInt(Math.floor(n), 1, 10_000);
  }, [starsInput]);

  const tonAmount = useMemo(() => {
    // 1 TON = 100 ⭐
    return (starsAmount / 100).toFixed(2);
  }, [starsAmount]);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function payStars() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/payments/create-invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountStars: starsAmount }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        throw new Error(j?.details || j?.error || "Failed to create invoice");
      }
      setMessage("Инвойс отправлен в чат с ботом. Оплати и вернись сюда, затем нажми “Обновить баланс”.");
    } catch (e: any) {
      setMessage(typeof e?.message === "string" ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ClientShell>
      <div className="text-center text-xs font-semibold tracking-[0.24em] text-white/60">ПОПОЛНЕНИЕ</div>

      <div className="mt-4 rounded-3xl bg-white/5 p-4">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 p-2">
          {["STARS", "GIFTS", "TON", "CRYPTOBOT"].map((k) => {
            const key = k as Tab;
            const active = tab === key;
            return (
              <button
                key={k}
                onClick={() => setTab(key)}
                className={
                  "flex-1 rounded-2xl px-2 py-2 text-xs font-semibold transition " +
                  (active ? "bg-white/10" : "text-white/60 hover:bg-white/5")
                }
              >
                {k}
              </button>
            );
          })}
        </div>

        {tab === "STARS" && (
          <div className="mt-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-white/50">СУММА (STARS)</div>

            <div className="mt-3 flex items-center justify-between rounded-3xl border border-white/10 bg-black/30 px-4 py-4">
              <input
                value={starsInput}
                onChange={(e) => setStarsInput(e.target.value)}
                inputMode="numeric"
                className="w-full bg-transparent text-center text-4xl font-bold outline-none"
              />
              <Image src="/assets/star.png" alt="star" width={34} height={34} />
            </div>

            <button
              className="mt-5 w-full rounded-3xl bg-blue-500/90 px-4 py-4 text-sm font-extrabold uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50"
              onClick={payStars}
              disabled={busy}
            >
              {busy ? "…" : "Пополнить"}
            </button>

            {message && <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-white/80">{message}</div>}

            <button
              className="mt-3 w-full rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15"
              onClick={refresh}
            >
              Обновить баланс
            </button>
          </div>
        )}

        {tab === "TON" && (
          <div className="mt-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-white/50">СУММА (STARS)</div>

            <div className="mt-3 flex items-center justify-between rounded-3xl border border-white/10 bg-black/30 px-4 py-4">
              <div className="w-full text-center text-4xl font-bold">{starsAmount}</div>
              <Image src="/assets/star.png" alt="star" width={34} height={34} />
            </div>

            <div className="mt-4 rounded-3xl bg-white/5 p-4">
              <div className="text-xs text-white/60">COST</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-lg font-semibold">{tonAmount}</div>
                <div className="text-xs text-white/60">TON</div>
              </div>

              <button
                className="mt-4 w-full rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/70"
                disabled
              >
                Connect Wallet (скоро)
              </button>
            </div>

            <div className="mt-3 text-xs text-white/60">
              Конверсия: <b>1 TON = 100 ⭐</b>. Оплата TON будет добавлена позже.
            </div>
          </div>
        )}

        {(tab === "GIFTS" || tab === "CRYPTOBOT") && (
          <div className="mt-6 rounded-3xl bg-white/5 p-4 text-sm text-white/70">
            Этот способ пополнения будет добавлен позже.
          </div>
        )}
      </div>
    </ClientShell>
  );
}
