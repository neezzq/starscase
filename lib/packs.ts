// Optional presets for UI (not required). Currency is Telegram Stars (XTR).

export type TopUpPreset = {
  id: "10" | "25" | "50" | "100";
  title: string;
  stars: number;
};

export const TOPUP_PRESETS: TopUpPreset[] = [
  { id: "10", title: "10 ⭐", stars: 10 },
  { id: "25", title: "25 ⭐", stars: 25 },
  { id: "50", title: "50 ⭐", stars: 50 },
  { id: "100", title: "100 ⭐", stars: 100 },
];

export function getPresetById(id: string) {
  return TOPUP_PRESETS.find((p) => p.id === id) ?? null;
}
