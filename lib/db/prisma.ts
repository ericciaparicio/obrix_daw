import { PrismaClient } from "@prisma/client";

/**
 * Singleton de PrismaClient. En dev, Next.js recarga módulos en caliente y cada recarga crearía
 * una conexión nueva si no se cachea en `globalThis` — este patrón evita agotar el pool de
 * conexiones de Postgres.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
