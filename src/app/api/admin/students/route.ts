import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id || !action)
    return NextResponse.json({ error: "id and action required." }, {
      status: 400,
    });

  if (action === "activate") {
    const student = await db.student.update({
      where: { id },
      data: { status: "active", disableReason: null },
    });
    await db.activityLog.create({
      data: { studentId: id, action: "access_change", detail: "Account activated by admin" },
    });
    await db.notification.create({
      data: {
        studentId: id,
        type: "access_granted",
        title: "Account activated",
        message: `${student.name}'s account was reactivated.`,
      },
    });
    return NextResponse.json({ student });
  }
  if (action === "disable") {
    const reason = String(body.reason || "Security violation");
    const student = await db.student.update({
      where: { id },
      data: { status: "disabled", disableReason: reason },
    });
    await db.session.updateMany({
      where: { studentId: id, revoked: false },
      data: { revoked: true },
    });
    await db.activityLog.create({
      data: { studentId: id, action: "access_change", detail: `Disabled: ${reason}` },
    });
    return NextResponse.json({ student });
  }
  if (action === "revokeDevice") {
    const student = await db.student.update({
      where: { id },
      data: { activeDeviceId: null, deviceToken: null, deviceLabel: null },
    });
    await db.session.updateMany({
      where: { studentId: id, revoked: false },
      data: { revoked: true },
    });
    return NextResponse.json({ student });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
