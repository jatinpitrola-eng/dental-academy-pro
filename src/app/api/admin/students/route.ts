import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure DB schema + seed data exist (Vercel cold-start fix).
  await ensureSeeded();

  try {
    const students = await db.student.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        grants: { include: { course: { select: { title: true, color: true } } } },
        _count: {
          select: { violations: true, activityLogs: true, sessions: true },
        },
      },
    });
    return NextResponse.json({ students });
  } catch (e) {
    console.error("students query error:", e);
    // If DB query fails, return empty list.
    return NextResponse.json({ students: [] });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSeeded();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id || !action)
    return NextResponse.json({ error: "id and action required." }, {
      status: 400,
    });

  try {
    if (action === "activate") {
      const student = await db.student.update({
        where: { id },
        data: { status: "active", disableReason: null },
      });
      await db.activityLog.create({
        data: { studentId: id, action: "access_change", detail: "Account activated by admin" },
      }).catch(() => {});
      await db.notification.create({
        data: {
          studentId: id,
          type: "access_granted",
          title: "Account activated",
          message: `${student.name}'s account was reactivated.`,
        },
      }).catch(() => {});
      return NextResponse.json({ student });
    }
    if (action === "disable") {
      const reason = String(body.reason || "Security violation");
      const student = await db.student.update({
        where: { id },
        data: { status: "disabled", disableReason: reason },
      });
      await db.activityLog.create({
        data: { studentId: id, action: "access_change", detail: `Disabled: ${reason}` },
      }).catch(() => {});
      return NextResponse.json({ student });
    }
    if (action === "revokeDevice") {
      const student = await db.student.update({
        where: { id },
        data: { activeDeviceId: null, deviceToken: null, deviceLabel: null },
      });
      return NextResponse.json({ student });
    }
  } catch (e) {
    console.error("student update error:", e);
    return NextResponse.json({ error: "Could not update student." }, { status: 500 });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
