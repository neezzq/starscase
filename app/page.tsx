"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import ClientShell from "./components/ClientShell";
import { useAuth } from "./components/AuthProvider";
import OpeningModal from "./components/OpeningModal";

type CaseDTO = {
  id: string;
  title: string;
  imageUrl: string | null;
  priceStars: number;
  isFree: boolean;
  cooldownSec: number;
  isActive: boolean;
  itemCount: number;
};

type OpenResult =
  | {
      ok: true;
      balanceStars: number;
      result: { title: string; rarity: string; rewardType: string; rewardValue: number };
    }
  | {
      ok: false;
      error: string;
      remainingSec?: number;
      retryAfterMs?: number;
    };

function formatCooldown(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

export default function Page() {
  const { state, refresh } = useAuth();
  const [cases, setCases] = useState<CaseDTO[] | null>(null);
  const [loadingCases, setLoadingCases] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<"opening" | "done" | "error">("opening");
  const [modalCaseTitle, setModalCaseTitle] = useState("");
  const [modalResult, setModalResult] = useState<OpenResult | null>(null);

  const balance = state.status === "ready" ? state.me.user.balanceStars : 0;

  async function loadCases() {
    setLoadingCases(true);
    try {
      const res = await fetch("/api/cases", { credentials: "include" });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed to load cases");
      setCases(j.cases as CaseDTO[]);
    } finally {
      setLoadingCases(false);
    }
  }

  useEffect(() => {
    if (state.status === "ready") loadCases();
  }, [state.status]);

  const canOpen = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of cases ?? []) {
      const affordable = c.isFree || balance >= c.priceStars;
      const hasItems = c.itemCount > 0;
      m.set(c.id, affordable && hasItems);
    }
    return m;
  }, [cases, balance]);

  async function openCase(c: CaseDTO) {
    setModalCaseTitle(c.title);
    setModalOpen(true);
    setModalStatus("opening");
    setModalResult(null);

    try {
      const res = await fetch("/api/cases/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseId: c.id }),
      });
      const j = (await res.json()) as any;
      if (!res.ok || !j?.ok) {
        const errRes: OpenResult = {
          ok: false,
          error: j?.error || "ERROR",
          remainingSec: j?.remainingSec,
          retryAfterMs: j?.retryAfterMs,
        };
        setModalStatus("error");
        setModalResult(errRes);
        return;
      }
      const okRes: OpenResult = {
        ok: true,
        balanceStars: j.balanceStars,
        result: {
          title: j.result.title,
          rarity: j.result.rarity,
          rewardType: j.result.rewardType,
          rewardValue: j.result.rewardValue,
        },
      };
      setModalStatus("done");
      setModalResult(okRes);
      await refresh();
    } catch (e: any) {
      setModalStatus("error");
      setModalResult({ ok: false, error: typeof e?.message === "string" ? e.message : "ERROR" });
    }
  }

  const errorText =
    modalResult && !modalResult.ok
      ? modalResult.error === "COOLDOWN"
        ? `Кулдаун: осталось ${formatCooldown(modalResult.remainingSec ?? 0)}`
        : modalResult.error === "INSUFFICIENT_BALANCE"
          ? "Недостаточно ⭐"
          : modalResult.error === "CASE_EMPTY"
            ? "Кейс пока пустой. Скоро добавим предметы."
            : modalResult.error === "RATE_LIMIT"
              ? "Слишком часто. Попробуйте чуть позже."
              : modalResult.error
      : null;

  return (
    <ClientShell>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Кейсы</div>
        <button
          className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          onClick={async () => {
            await loadCases();
            await refresh();
          }}
          disabled={loadingCases}
        >
          {loadingCases ? "…" : "Обновить"}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {(cases ?? []).map((c) => {
          const enabled = canOpen.get(c.id) ?? false;
          const affordable = c.isFree || balance >= c.priceStars;
          const hasItems = c.itemCount > 0;

          return (
            <div key={c.id} className="overflow-hidden rounded-3xl bg-white/5">
              {c.imageUrl && (
                <div className="relative aspect-[16/9] w-full bg-black/30">
                  <Image src={c.imageUrl} alt={c.title} fill className="object-contain" priority />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{c.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80">
                      {c.isFree ? (
                        <span className="rounded-xl bg-green-400/10 px-3 py-1 text-green-200">Бесплатно</span>
                      ) : (
                        <span className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1">
                          <Image src="/assets/star.png" alt="star" width={16} height={16} />
                          <span className="font-semibold">{c.priceStars}</span>
                        </span>
                      )}

                      {!hasItems && (
                        <span className="rounded-xl bg-white/10 px-3 py-1 text-xs text-white/70">Скоро</span>
                      )}

                      {!c.isFree && !affordable && (
                        <span className="rounded-xl bg-red-500/10 px-3 py-1 text-xs text-red-200">Не хватает ⭐</span>
                      )}

                      {c.cooldownSec > 0 && (
                        <span className="text-xs text-white/60">Кулдаун: {formatCooldown(c.cooldownSec)}</span>
                      )}
                    </div>
                  </div>

                  <button
                    className={
                      "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition " +
                      (enabled ? "bg-white/15 hover:bg-white/20" : "bg-white/5 text-white/40")
                    }
                    onClick={() => openCase(c)}
                    disabled={!enabled}
                  >
                    {hasItems ? "Открыть" : "Скоро"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!cases && <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">Загрузка списка…</div>}
        {cases?.length === 0 && <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">Нет активных кейсов.</div>}
      </div>

      <OpeningModal
        open={modalOpen}
        title={modalCaseTitle}
        status={modalStatus}
        result={modalResult && modalResult.ok ? modalResult.result : null}
        errorText={errorText}
        onClose={() => setModalOpen(false)}
      />
    </ClientShell>
  );
}
