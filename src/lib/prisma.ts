import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = new URL(
    process.env.DATABASE_URL ??
      (() => {
        throw new Error("DATABASE_URL is not set");
      })()
  );

  const pool = new Pool({
    host: url.hostname,
    port: Number(url.port) || 6543,
    database: url.pathname.replace("/", ""),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
