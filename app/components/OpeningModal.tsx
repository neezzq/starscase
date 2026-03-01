"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  title: string;
  status: "opening" | "done" | "error";
  result?: { title: string; rarity: string; rewardType: string; rewardValue: number } | null;
  errorText?: string | null;
  onClose: () => void;
};

const rarityColor: Record<string, string> = {
  COMMON: "text-white/80",
  RARE: "text-blue-300",
  EPIC: "text-purple-300",
  LEGENDARY: "text-yellow-300",
};

export default function OpeningModal(props: Props) {
  return (
    <AnimatePresence>
      {props.open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={props.onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-[#0f1528] p-6 shadow-xl"
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm text-white/70">Кейс</div>
            <div className="text-lg font-semibold">{props.title}</div>

            {props.status === "opening" && (
              <div className="mt-6">
                <motion.div
                  className="mx-auto h-24 w-24 rounded-2xl bg-white/10"
                  animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.03, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
                <div className="mt-4 text-center text-sm text-white/70">Открываем…</div>
              </div>
            )}

            {props.status === "done" && props.result && (
              <div className="mt-6">
                <motion.div
                  className="rounded-2xl bg-white/5 p-4"
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="text-sm text-white/70">Выпало</div>
                  <div className={`mt-1 text-xl font-bold ${rarityColor[props.result.rarity] ?? ""}`}>
                    {props.result.title}
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    Редкость: <b className={rarityColor[props.result.rarity] ?? ""}>{props.result.rarity}</b>
                  </div>
                  {(props.result.rewardType === "STARS" || props.result.rewardType === "COIN") && props.result.rewardValue > 0 && (
                    <div className="mt-2 text-sm text-white/70">
                      Бонус: <b>+{props.result.rewardValue} ⭐</b>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {props.status === "error" && (
              <div className="mt-6 rounded-2xl bg-red-500/10 p-4 text-sm text-white/80">
                {props.errorText || "Ошибка открытия"}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                onClick={props.onClose}
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
