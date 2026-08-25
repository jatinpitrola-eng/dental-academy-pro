import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

// When the client detects a screenshot / screen-record / download / copy
// attempt, it reports here. The account is automatically disabled.
export async function POST(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || "screenshot");
  const detail = String(body.detail || "").slice(0, 500);

  const violation = await db.violation.create({
    data: { studentId: session.id, type, detail },
  });

  // Auto-disable the account and revoke sessions.
  await db.student.update({
    where: { id: session.id },
    data: {
      status: "disabled",
      disableReason: `Auto: ${type}`,
    },
  });
  await db.session.updateMany({
    where: { studentId: session.id, revoked: false },
    data: { revoked: true },
  });

  await db.activityLog.create({
    data: {
      studentId: session.id,
      action: "violation",
      detail: `${type}: ${detail}`,
    },
  });
  await db.notification.create({
    data: {
      studentId: session.id,
      type: "violation",
      title: "Account auto-disabled",
      message: `${session.name} was caught attempting ${type}. Account disabled.`,
    },
  });

  const res = NextResponse.json({ ok: true, disabled: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
