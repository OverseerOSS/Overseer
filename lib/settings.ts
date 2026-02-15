// Ensure you call this from server actions only
import { db } from "@/lib/db";

export async function getSystemSetting(key: string, defaultValue = "") {
  const setting = await db.systemSettings.findUnique({ where: { key } });
  return setting?.value || defaultValue;
}

export async function setSystemSetting(key: string, value: string) {
  return await db.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export function isDemoMode() {
  return process.env.DEMO === "true";
}
