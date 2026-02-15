import { db } from "./lib/db";

async function check() {
  console.log("Prisma keys:", Object.keys(db).filter(k => !k.startsWith("_")));
  process.exit(0);
}

check();
