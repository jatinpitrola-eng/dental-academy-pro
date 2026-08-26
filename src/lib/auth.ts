import { NextRequest } from "next/server";
import { randomBytes, createHmac } from "crypto";
import { db } from "./db";
import { verifyPassword } from "./crypto";
import { ensureSeeded } from "./auto-seed";

// Secret for signing session tokens. Fixed so tokens survive across different
// serverless function instances on Vercel.
const SESSION_SECRET = process.env.SESSION_SECRET || "dental-academy-session-secret-2024";

export function signToken(payload: string): string {
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expectedSig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  if (sig !== expectedSig) return null;
  return payload;
}

export type SessionUser =
  | {
      kind: "student";
      id: string;
      name: string;
      email: string;
      status: string;
    }
  | {
      kind: "admin";
      id: string;
      username: string;
      name: string | null;
    };

export const SESSION_COOKIE = "da_session";
export const ADMIN_COOKIE = "da_admin";
export const DEVICE_COOKIE = "da_device";

// --- Device fingerprinting ------------------------------------------------
// A stable-ish device id stored in a cookie + localStorage. Combined with the
// user-agent hash it lets us enforce single-device login.
export function getDeviceId(req: NextRequest): string {
  const fromCookie = req.cookies.get(DEVICE_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  // derive from UA + a random component for first-time visitors
  const ua = req.headers.get("user-agent") || "unknown";
  return `dev_${hashString(ua).slice(0, 16)}`;
}

export function getDeviceLabel(req: NextRequest): string {
  const ua = req.headers.get("user-agent") || "";
  let os = "Unknown";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/firefox/i.test(ua)) browser = "Firefox";

  return `${browser} • ${os}`;
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

// --- Student session ------------------------------------------------------
// The session token is self-contained: `studentId.signature`. This means
// even if the DB resets (Vercel cold start), the token still identifies the
// student. We verify the signature and look up the student by ID (which
// always exists because we use fixed IDs in the seed data).
export async function getStudentSession(
  req: NextRequest,
): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Verify the token signature and extract the student ID.
  const studentId = verifyToken(token);
  if (!studentId) return null;
  // Ensure the DB schema + seed data exist (Vercel cold-start fix).
  await ensureSeeded();
  // Look up the student by ID.
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) return null;
  if (student.status !== "active") return null;
  return {
    kind: "student",
    id: student.id,
    name: student.name,
    email: student.email,
    status: student.status,
  };
}

// --- Admin session (self-contained signed token, same approach as student) ---
export async function createAdminSession(adminId: string): Promise<string> {
  return signToken(`admin:${adminId}`);
}

export async function getAdminSession(
  req: NextRequest,
): Promise<SessionUser | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.startsWith("admin:")) return null;
  const adminId = payload.slice(6);
  // Ensure the DB schema + seed data exist (Vercel cold-start fix).
  await ensureSeeded();
  const admin = await db.admin.findUnique({ where: { id: adminId } });
  if (!admin) return null;
  return {
    kind: "admin",
    id: admin.id,
    username: admin.username,
    name: admin.name,
  };
}

export async function revokeAdminSession(req: NextRequest): Promise<void> {
  // No-op: tokens are stateless. To truly revoke, we'd need a blocklist.
  // For the demo, the admin just clears the cookie client-side.
}

export async function loginAdmin(
  identifier: string,
  password: string,
): Promise<{ id: string; username: string; name: string | null } | null> {
  // Ensure the DB schema + seed data exist (Vercel cold-start fix).
  await ensureSeeded();
  // Allow login by either email or username.
  const admin = await db.admin.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });
  if (!admin) return null;
  if (!verifyPassword(password, admin.passwordHash)) return null;
  return { id: admin.id, username: admin.username, name: admin.name };
}
