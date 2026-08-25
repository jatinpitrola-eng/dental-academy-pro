import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { student: { select: { name: true, email: true } } },
  });
  const violations = await db.violation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { student: { select: { name: true, email: true } } },
  });
  const stats = {
    students: await db.student.count(),
    activeStudents: await db.student.count({ where: { status: "active" } }),
    pendingStudents: await db.student.count({ where: { status: "pending" } }),
    disabledStudents: await db.student.count({
      where: { status: "disabled" },
    }),
    courses: await db.course.count(),
    videos: await db.video.count(),
    pendingOtps: await db.otpRequest.count({ where: { status: "pending" } }),
    violations: await db.violation.count(),
    grants: await db.accessGrant.count({ where: { revoked: false } }),
  };
  return NextResponse.json({ logs, violations, stats });
}
