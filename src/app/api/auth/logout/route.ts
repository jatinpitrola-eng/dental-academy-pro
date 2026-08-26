import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession, SESSION_COOKIE } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const session = await getStudentSession(req);
  if (session?.kind === "student") {
    // Log the logout.
    await db.activityLog
      .create({
        data: {
          studentId: session.id,
          action: "logout",
          detail: "User logged out",
        },
      })
      .catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  // Clear the session cookie.
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
