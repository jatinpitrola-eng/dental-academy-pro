import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession, SESSION_COOKIE } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || "screenshot");
  const detail = String(body.detail || "").slice(0, 500);

  try {
    // Create violation record.
    await db.violation.create({
      data: { studentId: session.id, type, detail },
    });

    // Auto-disable the account.
    await db.student.update({
      where: { id: session.id },
      data: {
        status: "disabled",
        disableReason: `Auto: ${type}`,
      },
    });

    // Log the activity.
    await db.activityLog.create({
      data: {
        studentId: session.id,
        action: "violation",
        detail: `${type}: ${detail}`,
      },
    });

    // Send notification to admin.
    await db.notification.create({
      data: {
        studentId: session.id,
        type: "violation",
        title: "⚠️ Account auto-disabled",
        message: `${session.name} was caught attempting ${type}. Account has been disabled. Click "Activate" to reactivate.`,
      },
    });
  } catch (e) {
    console.error("violation report error:", e);
  }

  // Clear the session cookie regardless of DB success.
  const res = NextResponse.json({ ok: true, disabled: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
