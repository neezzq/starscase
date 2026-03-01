"use client";

import { useState } from "react";
import ClientShell from "../components/ClientShell";
import { useAuth } from "../components/AuthProvider";
import { COIN_PACKS } from "@/lib/packs";

export default function TopupPage() {
  const { refresh } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function buy(packId: string) {
    setBusyId(packId);
    setMessage(null);
    try {
      const res = await fetch("/api/payments/create-invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packId }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        throw new Error(j?.details || j?.error || "Failed to create invoice");
      }
      setMessage("Инвойс отправлен в чат с ботом. Оплатите через Stars и вернитесь сюда, затем нажмите “Обновить баланс”.");
    } catch (e: any) {
      setMessage(typeof e?.message === "string" ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ClientShell>
      <div className="text-lg font-semibold">Пополнение</div>
      <div className="mt-2 text-sm text-white/70">
        Выберите пакет. Инвойс придёт в чат с ботом, оплата проходит через <b>Telegram Stars</b>.
      </div>

      <div className="mt-4 grid gap-3">
        {COIN_PACKS.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold">{p.title}</div>
                <div className="mt-1 text-sm text-white/70">
                  Цена: <b>{p.stars}</b> ⭐ (XTR)
                </div>
              </div>

              <button
                className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                onClick={() => buy(p.id)}
                disabled={busyId !== null}
              >
                {busyId === p.id ? "…" : "Купить"}
              </button>
            </div>
          </div>
        ))}

        {message && <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/80">{message}</div>}

        <button
          className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15"
          onClick={refresh}
        >
          Обновить баланс
        </button>
      </div>
    </ClientShell>
  );
}
