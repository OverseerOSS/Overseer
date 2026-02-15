import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Force a new client to pick up schema changes
export const db = new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
