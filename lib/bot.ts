import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "@/lib/prisma";

const token = process.env.BOT_TOKEN!;
export const bot = new Bot(token);

const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL!;
const OWNER_TG_ID = process.env.OWNER_TG_ID ? Number(process.env.OWNER_TG_ID) : null;

bot.command("start", async (ctx) => {
  const kb = new InlineKeyboard().webApp("Открыть KARABAS CASE", WEBAPP_URL);
  await ctx.reply("KARABAS CASE ⭐\nНажми кнопку ниже, чтобы открыть Mini App.", { reply_markup: kb });
});

// Owner-only: grant stars to yourself
bot.command("grantstars", async (ctx) => {
  if (!OWNER_TG_ID || ctx.from?.id !== OWNER_TG_ID) return;
  const amount = Number((ctx.message?.text || "").split(" ")[1] || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    await ctx.reply("Использование: /grantstars 100");
    return;
  }

  const user = await prisma.user.findUnique({ where: { tgId: String(ctx.from.id) } });
  if (!user) {
    await ctx.reply("Открой Mini App один раз (авторизуйся), потом повтори /grantstars.");
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { balanceStars: { increment: Math.floor(amount) } } });
  await ctx.reply(`✅ Начислено ${Math.floor(amount)} ⭐`);
});

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  const sp = ctx.message.successful_payment;
  const chargeId = sp.telegram_payment_charge_id;
  const payload = sp.invoice_payload;

  // Find pending by payload
  const pending = await prisma.pendingPayment.findUnique({ where: { payload } });
  if (!pending || pending.consumed) return;

  // Deduplicate by chargeId
  const exists = await prisma.payment.findUnique({ where: { telegramChargeId: chargeId } });
  if (exists) return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        userId: pending.userId,
        amountStars: pending.starsToAdd,
        starsAdded: pending.starsToAdd,
        telegramChargeId: chargeId,
      },
    });

    await tx.user.update({
      where: { id: pending.userId },
      data: { balanceStars: { increment: pending.starsToAdd } },
    });

    await tx.pendingPayment.update({ where: { id: pending.id }, data: { consumed: true } });
  });

  await ctx.reply(`✅ Оплата принята. Начислено ${pending.starsToAdd} ⭐`);
});
