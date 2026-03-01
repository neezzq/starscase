import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Ресидим только кейсы/предметы. Пользователей/платежи не трогаем.
  await prisma.caseItem.deleteMany({});
  await prisma.case.deleteMany({});

  const karabas = await prisma.case.create({
    data: {
      title: "KARABAS",
      imageUrl: "/assets/karabas-case.png",
      priceStars: 100,
      isFree: false,
      cooldownSec: 0,
      isActive: true,
      // items: пока пусто по твоей просьбе
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete:", { karabas: karabas.id });
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
