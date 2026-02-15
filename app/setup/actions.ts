"use server";

import { exec } from "child_process";
import util from "util";
import { createAccount } from "../actions";

const execAsync = util.promisify(exec);

export async function runMigration() {
  try {
    await execAsync("npx prisma migrate deploy");
    return { success: true };
  } catch (error: any) {
    console.error("Migration failed:", error);
    return { success: false, error: error.message };
  }
}

export async function createAdminUser(username: string, password: string, orgName?: string) {
    if (!username || !password) {
        return { success: false, error: "Username and password required" };
    }

    return await createAccount({ username, password, orgName });
}
