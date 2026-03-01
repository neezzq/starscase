import { PrismaClient, Rarity } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * KARABAS CASE seed:
 * - One case priced 1 ⭐
 * - 3 items with weights:
 *   - Pepe (0.001%) => weight 1
 *   - Heart (20%)   => weight 20000
 *   - Cupcake (80%) => weight 80000
 */
async function main() {
  // Keep users/payments; only reseed cases/items
  await prisma.caseItem.deleteMany({});
  await prisma.case.deleteMany({});

  const karabas = await prisma.case.create({
    data: {
      title: "KARABAS",
      isActive: true,
      isFree: false,
      cooldownSec: 0,
      priceStars: 1,
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
        imageUrl: "/assets/items/pepe.png",
      },
      {
        caseId: karabas.id,
        title: "HEART",
        rarity: Rarity.EPIC,
        weight: 20000,
        rewardType: "ITEM",
        rewardValue: 1,
        imageUrl: "/assets/items/heart.png",
      },
      {
        caseId: karabas.id,
        title: "TON CUPCAKE",
        rarity: Rarity.COMMON,
        weight: 80000,
        rewardType: "ITEM",
        rewardValue: 1,
        imageUrl: "/assets/items/cupcake.png",
      },
    ],
  });

  console.log("✅ Seeded KARABAS case and items.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
