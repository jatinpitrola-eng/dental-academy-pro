import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [logs, violations] = await Promise.all([
      db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }).catch(() => []),
      db.violation.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
    ]);

    // Fetch student names for logs/violations.
    for (const l of logs) {
      if (l.studentId) {
        const s = await db.student.findUnique({ where: { id: l.studentId as string } }).catch(() => null);
        l.student = s ? { name: s.name as string, email: s.email as string } : null;
      }
    }
    for (const v of violations) {
      if (v.studentId) {
        const s = await db.student.findUnique({ where: { id: v.studentId as string } }).catch(() => null);
        v.student = s ? { name: s.name as string, email: s.email as string } : null;
      }
    }

    const [students, activeStudents, pendingStudents, disabledStudents, courses, videos, pendingOtps, violationsCount, grants] = await Promise.all([
      db.student.count().catch(() => 0),
      db.student.count({ where: { status: "active" } }).catch(() => 0),
      db.student.count({ where: { status: "pending" } }).catch(() => 0),
      db.student.count({ where: { status: "disabled" } }).catch(() => 0),
      db.course.count().catch(() => 0),
      db.video.count().catch(() => 0),
      db.otpRequest.count({ where: { status: "pending" } }).catch(() => 0),
      db.violation.count().catch(() => 0),
      db.accessGrant.count({ where: { revoked: false } }).catch(() => 0),
    ]);

    const stats = { students, activeStudents, pendingStudents, disabledStudents, courses, videos, pendingOtps, violations: violationsCount, grants };

    return NextResponse.json({ logs, violations, stats });
  } catch (e) {
    console.error("admin logs error:", e);
    return NextResponse.json({
      logs: [],
      violations: [],
      stats: { students: 0, activeStudents: 0, pendingStudents: 0, disabledStudents: 0, courses: 0, videos: 0, pendingOtps: 0, violations: 0, grants: 0 },
    });
  }
}
