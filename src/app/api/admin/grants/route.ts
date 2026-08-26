import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

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

  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  const nowStr = now.toISOString();
  const expiresStr = expiresAt.toISOString();

  try {
    // Check if grant already exists.
    let existing = null;
    try {
      const { client } = await import("@/lib/db");
      const res = await (await import("@libsql/client")).createClient({
        url: "libsql://dental-academy-jatinpitrola-eng.aws-ap-south-1.turso.io",
        authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc3MzM5NDcsImlkIjoiMDFhMDNkM2QtZjIwMS03ZDE2LWIwOTQtMzcyNmMxMDcwODNiIiwia2lkIjoiSUZMcWF5Z3dwYjRUd2lwZURrYUtaanpXTUJKSkxJMTIzaWFsWUhUZnIwayIsInJpZCI6Ijk1MzE1NTY5LTU3ZGEtNDk0ZS1iZGI5LWQ2MWYyNzhhMGY1YiJ9.fmMIcFjKgNVFim0UF79LazrSplUECpae2ET3t_3DrrVZ-sYJwEKNpK0T4CiKWahtx_uGLzvmllG7PX-7WbN7Cg",
      }).execute({
        sql: 'SELECT * FROM "AccessGrant" WHERE "studentId" = ? AND "courseId" = ? LIMIT 1',
        args: [studentId, courseId],
      });
      existing = res.rows[0] || null;
    } catch { /* ignore */ }

    // Use db wrapper for create/update.
    await db.accessGrant.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      update: { expiresAt: expiresStr, revoked: false, grantedAt: nowStr },
      create: { studentId, courseId, expiresAt: expiresStr, grantedAt: nowStr, revoked: false },
    });

    const [student, course] = await Promise.all([
      db.student.findUnique({ where: { id: studentId } }).catch(() => null),
      db.course.findUnique({ where: { id: courseId } }).catch(() => null),
    ]);

    await db.activityLog.create({
      data: {
        studentId,
        action: "access_change",
        detail: `Granted ${days}-day access to ${course?.title || "course"}`,
      },
    }).catch(() => {});
    await db.notification.create({
      data: {
        studentId,
        type: "access_granted",
        title: "Access granted",
        message: `${student?.name || "Student"} was granted ${days}-day access to ${course?.title || "a course"}.`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("grant error:", e);
    return NextResponse.json({ error: "Could not grant access. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Grant id required." }, { status: 400 });
  try {
    await db.accessGrant.upsert({
      where: { id },
      update: { revoked: true },
      create: { revoked: true },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
