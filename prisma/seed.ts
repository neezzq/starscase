import { PrismaClient, Rarity } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed for KARABAS CASE:
 * - 1 case (price 1 ⭐)
 * - 3 items with weights:
 *   - PEPE: 0.001% (weight 1)
 *   - HEART: 20% (weight 20000)
 *   - TON CUPCAKE: 80% (weight 80000)
 *
 * Note: Item images are served from /public/assets/items/... and mapped on the client by title.
 * We DO NOT store item imageUrl in DB (CaseItem model has no imageUrl field).
 */
async function main() {
  // Re-seed only cases/items. Keep users/payments/openings if you want; change if needed.
  await prisma.caseItem.deleteMany({});
  await prisma.case.deleteMany({});

  const karabas = await prisma.case.create({
    data: {
      title: "KARABAS",
      // 1 ⭐ per case
      priceStars: 1,
      isFree: false,
      cooldownSec: 0,
      isActive: true,
      // Case image (served from /public/assets/cases/karabas.png)
      imageUrl: "/assets/cases/karabas.png",
    },
  });

  await prisma.caseItem.createMany({
    data: [
      {
        caseId: karabas.id,
        title: "PEPE",
        rarity: Rarity.LEGENDARY,
        weight: 1,
        rewardType: "ITEM",
        rewardValue: 1,
      },
      {
        caseId: karabas.id,
        title: "HEART",
        rarity: Rarity.EPIC,
        weight: 20000,
        rewardType: "ITEM",
        rewardValue: 1,
      },
      {
        caseId: karabas.id,
        title: "TON CUPCAKE",
        rarity: Rarity.COMMON,
        weight: 80000,
        rewardType: "ITEM",
        rewardValue: 1,
      },
    ],
  });

  console.log("✅ Seed complete: KARABAS case + 3 items");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
