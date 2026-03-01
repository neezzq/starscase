import crypto from "crypto";

export type TelegramWebAppUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type VerifiedInitData = {
  raw: string;
  user: TelegramWebAppUser;
  authDate: number;
  queryId?: string;
  chatType?: string;
  chatInstance?: string;
};

function timingSafeEqualHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Строгая проверка initData по документации Telegram WebApps.
 * Алгоритм:
 * 1) data_check_string: key=value (кроме hash), отсортировано по ключу, разделитель \n
 * 2) secret_key = HMAC_SHA256(key="WebAppData", data=BOT_TOKEN)
 * 3) expected_hash = HMAC_SHA256(key=secret_key, data=data_check_string).hex
 * 4) compare expected_hash === hash
 *
 * Док: https://core.telegram.org/bots/webapps
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 60 * 60
): VerifiedInitData {
  if (!initData || typeof initData !== "string") {
    throw new Error("initData is empty");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("initData.hash is missing");
  if (!/^[0-9a-f]{64}$/i.test(hash)) throw new Error("initData.hash is invalid");

  const kv: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    kv.push(`${key}=${value}`);
  }
  kv.sort((a, b) => a.localeCompare(b));
  const dataCheckString = kv.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!timingSafeEqualHex(expectedHash, hash)) {
    throw new Error("initData signature mismatch");
  }

  const authDateStr = params.get("auth_date");
  if (!authDateStr) throw new Error("initData.auth_date is missing");
  const authDate = Number(authDateStr);
  if (!Number.isFinite(authDate) || authDate <= 0) throw new Error("initData.auth_date is invalid");

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSeconds) {
    throw new Error("initData is too old");
  }

  const userStr = params.get("user");
  if (!userStr) throw new Error("initData.user is missing");
  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userStr);
  } catch {
    throw new Error("initData.user is invalid JSON");
  }
  if (!user?.id) throw new Error("initData.user.id is missing");

  return {
    raw: initData,
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    chatType: params.get("chat_type") ?? undefined,
    chatInstance: params.get("chat_instance") ?? undefined,
  };
}
