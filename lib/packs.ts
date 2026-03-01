export type CoinPack = {
  id: "50" | "100" | "250" | "500";
  title: string;
  coins: number;
  stars: number;
};

export const COIN_PACKS: CoinPack[] = [
  { id: "50", title: "50 SC Coin", coins: 50, stars: 10 },
  { id: "100", title: "100 SC Coin", coins: 100, stars: 18 },
  { id: "250", title: "250 SC Coin", coins: 250, stars: 40 },
  { id: "500", title: "500 SC Coin", coins: 500, stars: 70 },
];

export function getPackById(id: string) {
  return COIN_PACKS.find((p) => p.id === id) ?? null;
}
