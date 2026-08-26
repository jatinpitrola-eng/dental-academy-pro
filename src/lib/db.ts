import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  // If we have a Turso URL (starts with libsql://), use the libsql adapter.
  if (url && url.startsWith("libsql://")) {
    const authToken = process.env.DATABASE_AUTH_TOKEN || "";
    const libsql = createClient({
      url,
      authToken,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
  }

  // Fallback: local file-based SQLite (for local dev).
  // This should only be used in local development.
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
