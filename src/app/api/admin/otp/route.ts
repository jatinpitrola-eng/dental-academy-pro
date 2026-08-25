import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { generateOtp } from "@/lib/crypto";

export const runtime = "nodejs";

// List pending OTP requests for the admin dashboard.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "pending"; // pending | all
  const where = filter === "all" ? {} : { status: "pending" };
  const requests = await db.otpRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { student: true },
  });
  return NextResponse.json({ requests });
}

// Approve a request -> generate a 6-digit code. Optionally grant course(s).
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requestId = String(body.requestId || "");
  const action = String(body.action || "approve");
  const courseIds: string[] = Array.isArray(body.courseIds)
    ? body.courseIds
    : [];
  const days = Number(body.days || 0);
  if (!requestId)
    return NextResponse.json(
      { error: "requestId is required." },
      { status: 400 },
    );

  const otp = await db.otpRequest.findUnique({
    where: { id: requestId },
    include: { student: true },
  });
  if (!otp)
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (otp.status !== "pending")
    return NextResponse.json(
      { error: `Request already ${otp.status}.` },
      { status: 400 },
    );

  if (action === "deny") {
    await db.otpRequest.update({
      where: { id: requestId },
      data: { status: "denied", resolvedAt: new Date() },
    });
    await db.notification.create({
      data: {
        studentId: otp.studentId,
        type: "otp_resolved",
        title: "Login denied",
        message: `Login request from ${otp.student.name} was denied.`,
      },
    });
    return NextResponse.json({ ok: true, status: "denied" });
  }

  // Approve: generate a 6-digit code valid for 30 minutes.
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.otpRequest.update({
    where: { id: requestId },
    data: { status: "approved", code, expiresAt, resolvedAt: new Date() },
  });

  // If the admin selected course(s) + duration, create grants immediately so
  // the student sees them the moment they verify the code.
  const granted: { courseId: string; courseTitle: string }[] = [];
  if (courseIds.length > 0 && days > 0) {
    const grantExpires = new Date();
    grantExpires.setDate(grantExpires.getDate() + days);
    for (const courseId of courseIds) {
      const course = await db.course.findUnique({ where: { id: courseId } });
      if (!course) continue;
      await db.accessGrant.upsert({
        where: { studentId_courseId: { studentId: otp.studentId, courseId } },
        update: { expiresAt: grantExpires, revoked: false, grantedAt: new Date() },
        create: { studentId: otp.studentId, courseId, expiresAt: grantExpires },
      });
      granted.push({ courseId, courseTitle: course.title });
    }
    // Also activate the student so they can log in immediately.
    await db.student.update({
      where: { id: otp.studentId },
      data: { status: "active" },
    });
    await db.activityLog.create({
      data: {
        studentId: otp.studentId,
        action: "access_change",
        detail: `Granted ${days}-day access to ${granted.map((g) => g.courseTitle).join(", ")}`,
      },
    });
    await db.notification.create({
      data: {
        studentId: otp.studentId,
        type: "access_granted",
        title: "Access granted",
        message: `${otp.student.name} was granted ${days}-day access to ${granted.map((g) => g.courseTitle).join(", ")}.`,
      },
    });
  }

  await db.notification.create({
    data: {
      studentId: otp.studentId,
      type: "otp_resolved",
      title: "Login approved",
      message: `Access code generated for ${otp.student.name}.`,
    },
  });
  return NextResponse.json({ ok: true, status: "approved", code, granted });
}
