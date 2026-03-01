/**
 * Weighted random picker.
 *
 * - weights <= 0 are ignored
 * - if all weights are <= 0, falls back to uniform random
 */
export function pickWeighted<T>(items: readonly T[], getWeight: (item: T) => number): T {
  if (!items.length) throw new Error("pickWeighted: empty items");

  let total = 0;
  const weights = items.map((it) => {
    const w = Number(getWeight(it));
    const ww = Number.isFinite(w) ? Math.max(0, Math.floor(w)) : 0;
    total += ww;
    return ww;
  });

  // Fallback to uniform if total == 0
  if (total <= 0) {
    return items[Math.floor(Math.random() * items.length)]!;
  }

  let r = Math.floor(Math.random() * total) + 1; // 1..total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }

  // Should never happen, but keep TS happy
  return items[items.length - 1]!;
}
