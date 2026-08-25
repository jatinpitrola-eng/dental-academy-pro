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

// Approve a request -> generate a 6-digit code.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requestId = String(body.requestId || "");
  const action = String(body.action || "approve");
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
  await db.notification.create({
    data: {
      studentId: otp.studentId,
      type: "otp_resolved",
      title: "Login approved",
      message: `Access code generated for ${otp.student.name}.`,
    },
  });
  return NextResponse.json({ ok: true, status: "approved", code });
}
