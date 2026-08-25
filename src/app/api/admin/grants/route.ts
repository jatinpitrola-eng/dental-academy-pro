import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

// Grant a student access to a course for N days.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const studentId = String(body.studentId || "");
  const courseId = String(body.courseId || "");
  const days = Number(body.days || 0);
  if (!studentId || !courseId || !days || days <= 0)
    return NextResponse.json(
      { error: "studentId, courseId and a positive days value are required." },
      { status: 400 },
    );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const grant = await db.accessGrant.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { expiresAt, revoked: false, grantedAt: new Date() },
    create: { studentId, courseId, expiresAt },
  });

  const [student, course] = await Promise.all([
    db.student.findUnique({ where: { id: studentId } }),
    db.course.findUnique({ where: { id: courseId } }),
  ]);

  await db.activityLog.create({
    data: {
      studentId,
      action: "access_change",
      detail: `Granted ${days}-day access to ${course?.title || "course"}`,
    },
  });
  await db.notification.create({
    data: {
      studentId,
      type: "access_granted",
      title: "Access granted",
      message: `${student?.name || "Student"} was granted ${days}-day access to ${course?.title || "a course"}.`,
    },
  });

  return NextResponse.json({ grant });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Grant id required." }, { status: 400 });
  await db.accessGrant.update({
    where: { id },
    data: { revoked: true },
  });
  return NextResponse.json({ ok: true });
}
