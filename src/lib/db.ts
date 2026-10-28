import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { berberDb?: PrismaClient };
export const db =
  globalDb.berberDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: process.env.NODE_ENV === "production" ? 10 : 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.berberDb = db;
