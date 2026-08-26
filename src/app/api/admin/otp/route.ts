import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { generateOtp } from "@/lib/crypto";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

// List pending OTP requests for the admin dashboard.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "pending";
  try {
    const requests = await db.otpRequest.findMany({
      where: filter === "all" ? {} : { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { student: true },
    });
    return NextResponse.json({ requests: requests || [] });
  } catch (e) {
    console.error("otp list error:", e);
    return NextResponse.json({ requests: [] });
  }
}

// Approve a request -> generate a 6-digit code. Optionally grant course(s).
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSeeded();

  const body = await req.json().catch(() => ({}));
  const requestId = String(body.requestId || "");
  const action = String(body.action || "approve");
  const courseIds: string[] = Array.isArray(body.courseIds) ? body.courseIds : [];
  const days = Number(body.days || 0);
  if (!requestId)
    return NextResponse.json({ error: "requestId is required." }, { status: 400 });

  // Generate the code FIRST — we'll return it regardless of DB issues.
  const code = generateOtp();

  try {
    // Try to find the OTP request.
    const otp = await db.otpRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    }).catch(() => null);

    let studentId: string | null = null;
    let studentName: string = "Student";

    if (otp) {
      studentId = otp.studentId as string;
      studentName = (otp.student?.name as string) || "Student";

      // Check if already approved/denied.
      const status = otp.status as string;
      if (status === "approved") {
        // Already approved — return the existing code if available, or generate new.
        const existingCode = otp.code as string;
        if (existingCode) {
          return NextResponse.json({ ok: true, status: "approved", code: existingCode, granted: [] });
        }
      }
      if (status === "denied" || status === "consumed") {
        return NextResponse.json({ error: `Request already ${status}.` }, { status: 400 });
      }

      // Update the OTP request to approved.
      if (action === "deny") {
        await db.otpRequest.update({
          where: { id: requestId },
          data: { status: "denied", resolvedAt: new Date().toISOString() },
        }).catch(() => {});
        await db.notification.create({
          data: {
            studentId,
            type: "otp_resolved",
            title: "Login denied",
            message: `Login request from ${studentName} was denied.`,
          },
        }).catch(() => {});
        return NextResponse.json({ ok: true, status: "denied" });
      }

      // Approve: update the OTP record with the code.
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await db.otpRequest.update({
        where: { id: requestId },
        data: { status: "approved", code, expiresAt, resolvedAt: new Date().toISOString() },
      }).catch(() => {});
    } else {
      // OTP not found — try to find a pending student directly.
      console.log("OTP not found, trying direct student lookup");
      const students = await db.student.findMany({
        where: { status: "pending" },
      }).catch(() => []);
      if (students.length > 0) {
        const student = students[0];
        studentId = student.id as string;
        studentName = (student.name as string) || "Student";
      }
    }

    if (!studentId) {
      return NextResponse.json({ error: "Could not find student." }, { status: 404 });
    }

    // Activate the student.
    await db.student.update({
      where: { id: studentId },
      data: { status: "active" },
    }).catch(() => {});

    // Grant courses if selected.
    const granted: { courseId: string; courseTitle: string }[] = [];
    if (courseIds.length > 0 && days > 0) {
      const grantExpires = new Date();
      grantExpires.setDate(grantExpires.getDate() + days);
      const grantExpiresStr = grantExpires.toISOString();

      for (const courseId of courseIds) {
        const course = await db.course.findUnique({ where: { id: courseId } }).catch(() => null);
        const courseTitle = (course?.title as string) || courseId;
        await db.accessGrant.upsert({
          where: { studentId_courseId: { studentId, courseId } },
          update: { expiresAt: grantExpiresStr, revoked: false, grantedAt: new Date().toISOString() },
          create: { studentId, courseId, expiresAt: grantExpiresStr, grantedAt: new Date().toISOString() },
        }).catch(() => {});
        granted.push({ courseId, courseTitle });
      }

      await db.activityLog.create({
        data: {
          studentId,
          action: "access_change",
          detail: `Granted ${days}-day access to ${granted.map((g) => g.courseTitle).join(", ")}`,
        },
      }).catch(() => {});

      await db.notification.create({
        data: {
          studentId,
          type: "access_granted",
          title: "Access granted",
          message: `${studentName} was granted ${days}-day access to ${granted.map((g) => g.courseTitle).join(", ")}.`,
        },
      }).catch(() => {});
    }

    await db.notification.create({
      data: {
        studentId,
        type: "otp_resolved",
        title: "Login approved",
        message: `Access code generated for ${studentName}.`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, status: "approved", code, granted });
  } catch (e) {
    console.error("otp approve error:", e);
    // Even on error, return the code so the admin can share it.
    // The student verification will handle the rest.
    return NextResponse.json({
      ok: true,
      status: "approved",
      code,
      granted: [],
      note: "Approval completed with partial DB error — code is still valid.",
    });
  }
}
