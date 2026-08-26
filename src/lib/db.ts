import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Turso database credentials.
// These are also set as Vercel env vars (DATABASE_URL + DATABASE_AUTH_TOKEN)
// but we hardcode them as a fallback so the app works even if env vars
// aren't properly propagated.
const TURSO_URL =
  process.env.DATABASE_URL ||
  "libsql://dental-academy-jatinpitrola-eng.aws-ap-south-1.turso.io";
const TURSO_AUTH_TOKEN =
  process.env.DATABASE_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc3MzM5NDcsImlkIjoiMDFhMDNkM2QtZjIwMS03ZDE2LWIwOTQtMzcyNmMxMDcwODNiIiwia2lkIjoiSUZMcWF5Z3dwYjRUd2lwZURrYUtaanpXTUJKSkxJMTIzaWFsWUhUZnIwayIsInJpZCI6Ijk1MzE1NTY5LTU3ZGEtNDk0ZS1iZGI5LWQ2MWYyNzhhMGY1YiJ9.fmMIcFjKgNVFim0UF79LazrSplUECpae2ET3t_3DrrVZ-sYJwEKNpK0T4CiKWahtx_uGLzvmllG7PX-7WbN7Cg";

function createPrismaClient(): PrismaClient {
  // Use Turso (libsql) for all environments.
  if (TURSO_URL && TURSO_URL.startsWith("libsql://")) {
    const libsql = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter, log: ["error", "warn"] });
  }

  // Fallback: local file-based SQLite (for local dev only).
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
