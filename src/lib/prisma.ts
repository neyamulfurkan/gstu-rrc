// src/lib/prisma.ts

import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;
import { PrismaNeon } from "@prisma/adapter-neon";
// ws is handled by @neondatabase/serverless internally on Vercel edge



if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Please configure your Neon PostgreSQL connection string before starting the application."
  );
}

const createPrismaClient = (): PrismaClient => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  } as ConstructorParameters<typeof PrismaClient>[0]);
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}