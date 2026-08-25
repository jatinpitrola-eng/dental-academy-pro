import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getStudentSession(req);
  if (session?.kind === "student") {
    // Revoke this device's session.
    await db.session
      .updateMany({
        where: { deviceToken: req.cookies.get(SESSION_COOKIE)?.value || "" },
        data: { revoked: true },
      })
      .catch(() => {});
    await db.activityLog.create({
      data: {
        studentId: session.id,
        action: "logout",
        detail: "User logged out",
      },
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
