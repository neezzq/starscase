import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "./prisma";

const BOT_TOKEN = process.env.BOT_TOKEN ?? "";

export const bot = new Bot(BOT_TOKEN);

function getWebAppUrl() {
  const url = process.env.NEXT_PUBLIC_WEBAPP_URL || process.env.WEBAPP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_WEBAPP_URL (or WEBAPP_URL) is missing");
  return url;
}

bot.command("start", async (ctx) => {
  const kb = new InlineKeyboard().webApp("Открыть KARABAS CASE", getWebAppUrl());
  await ctx.reply(
    "Добро пожаловать в *KARABAS CASE* ⭐\n\nНажми кнопку ниже, чтобы открыть Mini App.",
    { parse_mode: "Markdown", reply_markup: kb }
  );
});

bot.on("pre_checkout_query", async (ctx) => {
  const payload = ctx.preCheckoutQuery.invoice_payload;
  const pending = await prisma.pendingPayment.findUnique({ where: { payload } });

  if (!pending || pending.consumed) {
    await ctx.answerPreCheckoutQuery(false, "Платёж устарел или уже обработан. Создайте новый инвойс.");
    return;
  }

  const fromTgId = BigInt(ctx.preCheckoutQuery.from.id);
  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || user.tgId !== fromTgId) {
    await ctx.answerPreCheckoutQuery(false, "Платёж не принадлежит этому пользователю.");
    return;
  }

  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  const sp = ctx.message.successful_payment;
  const payload = sp.invoice_payload;
  const telegramChargeId = sp.telegram_payment_charge_id;
  const amountStars = sp.total_amount; // XTR: 1 = 1 Star
  const currency = sp.currency;

  if (currency !== "XTR") return;

  const pending = await prisma.pendingPayment.findUnique({ where: { payload } });
  if (!pending || pending.consumed) return;

  const existing = await prisma.payment.findUnique({ where: { telegramChargeId } });
  if (existing) {
    await prisma.pendingPayment.update({ where: { id: pending.id }, data: { consumed: true } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const freshPending = await tx.pendingPayment.findUnique({ where: { payload } });
    if (!freshPending || freshPending.consumed) return;

    const already = await tx.payment.findUnique({ where: { telegramChargeId } });
    if (already) {
      await tx.pendingPayment.update({ where: { id: freshPending.id }, data: { consumed: true } });
      return;
    }

    await tx.user.update({
      where: { id: freshPending.userId },
      data: { balanceStars: { increment: freshPending.starsToAdd } },
    });

    await tx.payment.create({
      data: {
        userId: freshPending.userId,
        amountStars,
        starsAdded: freshPending.starsToAdd,
        telegramChargeId,
      },
    });

    await tx.pendingPayment.update({ where: { id: freshPending.id }, data: { consumed: true } });
  });

  await ctx.reply(`✅ Оплата успешна! Начислено *${pending.starsToAdd}* ⭐`, { parse_mode: "Markdown" });
});

bot.catch((err) => {
  // eslint-disable-next-line no-console
  console.error("BOT_ERROR:", err);
});
