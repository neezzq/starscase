import { PrismaClient, Rarity } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Полный ресид кейсов + лута (пользователей не трогаем)
  await prisma.caseItem.deleteMany({});
  await prisma.case.deleteMany({});

  const dailyFree = await prisma.case.create({
    data: {
      title: "Daily Free Case",
      priceCoin: 0,
      isFree: true,
      cooldownSec: 86400,
      isActive: true,
      items: {
        create: [
          {
            title: "Sticker Pack",
            rarity: Rarity.COMMON,
            weight: 800,
            rewardType: "ITEM",
            rewardValue: 1,
          },
          {
            title: "Profile Frame",
            rarity: Rarity.RARE,
            weight: 150,
            rewardType: "ITEM",
            rewardValue: 1,
          },
          {
            title: "Epic Badge",
            rarity: Rarity.EPIC,
            weight: 40,
            rewardType: "ITEM",
            rewardValue: 1,
          },
          {
            title: "Legendary Title",
            rarity: Rarity.LEGENDARY,
            weight: 10,
            rewardType: "ITEM",
            rewardValue: 1,
          },
        ],
      },
    },
  });

  const silver = await prisma.case.create({
    data: {
      title: "Silver Case",
      priceCoin: 30,
      isFree: false,
      cooldownSec: 5,
      isActive: true,
      items: {
        create: [
          { title: "50 SC Coin Bonus", rarity: Rarity.COMMON, weight: 650, rewardType: "COIN", rewardValue: 5 },
          { title: "Rare Charm", rarity: Rarity.RARE, weight: 250, rewardType: "ITEM", rewardValue: 1 },
          { title: "Epic Charm", rarity: Rarity.EPIC, weight: 90, rewardType: "ITEM", rewardValue: 1 },
          { title: "Legendary Charm", rarity: Rarity.LEGENDARY, weight: 10, rewardType: "ITEM", rewardValue: 1 },
        ],
      },
    },
  });

  const gold = await prisma.case.create({
    data: {
      title: "Gold Case",
      priceCoin: 80,
      isFree: false,
      cooldownSec: 10,
      isActive: true,
      items: {
        create: [
          { title: "10 SC Coin Bonus", rarity: Rarity.COMMON, weight: 500, rewardType: "COIN", rewardValue: 10 },
          { title: "Rare Artifact", rarity: Rarity.RARE, weight: 300, rewardType: "ITEM", rewardValue: 1 },
          { title: "Epic Artifact", rarity: Rarity.EPIC, weight: 160, rewardType: "ITEM", rewardValue: 1 },
          { title: "Legendary Artifact", rarity: Rarity.LEGENDARY, weight: 40, rewardType: "ITEM", rewardValue: 1 },
        ],
      },
    },
  });

  const diamond = await prisma.case.create({
    data: {
      title: "Diamond Case",
      priceCoin: 150,
      isFree: false,
      cooldownSec: 15,
      isActive: true,
      items: {
        create: [
          { title: "20 SC Coin Bonus", rarity: Rarity.COMMON, weight: 420, rewardType: "COIN", rewardValue: 20 },
          { title: "Rare Relic", rarity: Rarity.RARE, weight: 320, rewardType: "ITEM", rewardValue: 1 },
          { title: "Epic Relic", rarity: Rarity.EPIC, weight: 200, rewardType: "ITEM", rewardValue: 1 },
          { title: "Legendary Relic", rarity: Rarity.LEGENDARY, weight: 60, rewardType: "ITEM", rewardValue: 1 },
        ],
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete:", {
    dailyFree: dailyFree.id,
    silver: silver.id,
    gold: gold.id,
    diamond: diamond.id,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
