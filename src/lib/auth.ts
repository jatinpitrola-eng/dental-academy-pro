import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { db } from "./db";
import { verifyPassword } from "./crypto";

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
export async function getStudentSession(
  req: NextRequest,
): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findFirst({
    where: {
      deviceToken: token,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    include: { student: true },
  });
  if (!session) return null;
  if (session.student.status !== "active") return null;
  return {
    kind: "student",
    id: session.student.id,
    name: session.student.name,
    email: session.student.email,
    status: session.student.status,
  };
}

// --- Admin session --------------------------------------------------------
const ADMIN_TOKENS = new Map<string, string>(); // token -> adminId (in-memory)

export async function createAdminSession(adminId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  ADMIN_TOKENS.set(token, adminId);
  return token;
}

export async function getAdminSession(
  req: NextRequest,
): Promise<SessionUser | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const adminId = ADMIN_TOKENS.get(token);
  if (!adminId) return null;
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
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token) ADMIN_TOKENS.delete(token);
}

export async function loginAdmin(
  identifier: string,
  password: string,
): Promise<{ id: string; username: string; name: string | null } | null> {
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
