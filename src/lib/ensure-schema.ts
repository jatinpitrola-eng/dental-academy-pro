import { db } from "./db";

let schemaPromise: Promise<void> | null = null;

/**
 * Creates the SQLite schema programmatically on first access. This is needed
 * on Vercel's serverless platform where the /tmp filesystem is ephemeral and
 * `prisma db push` can't be run at runtime.
 *
 * Uses `CREATE TABLE IF NOT EXISTS` for each table — safe to call multiple
 * times.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = doCreateSchema();
  return schemaPromise;
}

async function doCreateSchema(): Promise<void> {
  try {
    // Create all tables using raw SQL. The column types match the Prisma schema.
    // SQLite is forgiving with types (dynamic typing).
    const statements = [
      `CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "username" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "secretKey" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "AdminSession" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "adminId" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME NOT NULL,
        FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "Student" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "phone" TEXT,
        "passwordHash" TEXT NOT NULL,
        "activeDeviceId" TEXT,
        "deviceToken" TEXT,
        "deviceLabel" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "disableReason" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "deviceToken" TEXT NOT NULL,
        "deviceLabel" TEXT,
        "ip" TEXT,
        "userAgent" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME NOT NULL,
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "Course" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "thumbnail" TEXT,
        "color" TEXT,
        "published" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "Video" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "courseId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "sourceType" TEXT NOT NULL DEFAULT 'url',
        "sourceUrl" TEXT NOT NULL,
        "youtubeId" TEXT,
        "duration" INTEGER NOT NULL DEFAULT 0,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "AccessGrant" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "courseId" TEXT NOT NULL,
        "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" DATETIME NOT NULL,
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("studentId", "courseId"),
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE,
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "OtpRequest" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "code" TEXT,
        "deviceId" TEXT NOT NULL,
        "deviceLabel" TEXT,
        "ip" TEXT,
        "userAgent" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt" DATETIME,
        "expiresAt" DATETIME NOT NULL,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT,
        "action" TEXT NOT NULL,
        "detail" TEXT,
        "ip" TEXT,
        "userAgent" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "Violation" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "detail" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "VideoSummary" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "videoId" TEXT NOT NULL UNIQUE,
        "transcript" TEXT,
        "summary" TEXT NOT NULL,
        "keyPoints" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "ChatMessage" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "videoId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE,
        FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "WatchProgress" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "videoId" TEXT NOT NULL,
        "watched" BOOLEAN NOT NULL DEFAULT false,
        "lastPosition" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" DATETIME NOT NULL,
        UNIQUE ("studentId", "videoId"),
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE,
        FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "VideoNote" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "studentId" TEXT NOT NULL,
        "videoId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE,
        FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE
      )`,
    ];

    for (const sql of statements) {
      await db.$executeRawUnsafe(sql);
    }

    // Create indexes for performance.
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "Session_studentId_idx" ON "Session"("studentId")`,
      `CREATE INDEX IF NOT EXISTS "Video_courseId_idx" ON "Video"("courseId")`,
      `CREATE INDEX IF NOT EXISTS "AccessGrant_studentId_idx" ON "AccessGrant"("studentId")`,
      `CREATE INDEX IF NOT EXISTS "OtpRequest_studentId_idx" ON "OtpRequest"("studentId")`,
      `CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read")`,
      `CREATE INDEX IF NOT EXISTS "AdminSession_adminId_idx" ON "AdminSession"("adminId")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_studentId_videoId_idx" ON "ChatMessage"("studentId", "videoId")`,
      `CREATE INDEX IF NOT EXISTS "WatchProgress_studentId_videoId_idx" ON "WatchProgress"("studentId", "videoId")`,
      `CREATE INDEX IF NOT EXISTS "VideoNote_studentId_videoId_idx" ON "VideoNote"("studentId", "videoId")`,
    ];
    for (const sql of indexes) {
      await db.$executeRawUnsafe(sql).catch(() => {});
    }
  } catch (e) {
    console.error("schema creation error:", e);
  }
}
