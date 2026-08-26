import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDeviceId, getDeviceLabel, getClientIp, SESSION_COOKIE, signToken } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId || "");
    const code = String(body.code || "").trim();

    if (!requestId || !code)
      return NextResponse.json({ error: "Request and code are required." }, { status: 400 });

    // Try to find the OTP request.
    const otp = await db.otpRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    }).catch(() => null);

    if (!otp) {
      // OTP not found in DB — this happens on Vercel when different function
      // instances have different DB states. But since we use Turso now,
      // the DB is shared. If still not found, it might have been consumed
      // or expired. Return a helpful error.
      return NextResponse.json({
        error: "Access code not found or expired. Please ask the academy owner for a new code, or try logging in again.",
      }, { status: 404 });
    }

    const status = otp.status as string;
    const otpCode = otp.code as string;
    const studentId = otp.studentId as string;
    const studentName = (otp.student?.name as string) || "Student";
    const studentStatus = (otp.student?.status as string) || "pending";

    if (status === "consumed")
      return NextResponse.json({ error: "This code was already used." }, { status: 410 });

    if (status !== "approved" || !otpCode)
      return NextResponse.json({
        error: "Your request is still pending approval. Please wait for the academy owner to approve.",
        pending: true,
      }, { status: 202 });

    // Check expiry.
    const expiresAt = otp.expiresAt as string;
    if (new Date(expiresAt) < new Date())
      return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 410 });

    // Check code match.
    if (otpCode !== code)
      return NextResponse.json({ error: "Incorrect access code." }, { status: 401 });

    if (studentStatus === "disabled")
      return NextResponse.json({ error: "Account disabled. Contact the academy.", disabled: true }, { status: 403 });

    // SUCCESS! Activate the student + mark OTP as consumed.
    // We use the student ID from the OTP record to create the session token.
    // The token is self-contained (studentId.signature) so it survives cold starts.

    // Mark OTP as consumed.
    await db.otpRequest.update({
      where: { id: requestId },
      data: { status: "consumed", resolvedAt: new Date().toISOString() },
    }).catch(() => {});

    // Activate the student.
    await db.student.update({
      where: { id: studentId },
      data: {
        status: "active",
        activeDeviceId: getDeviceId(req),
        deviceLabel: getDeviceLabel(req),
      },
    }).catch(() => {});

    // Log the login.
    await db.activityLog.create({
      data: {
        studentId,
        action: "login_success",
        detail: `Logged in from ${getDeviceLabel(req)}`,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || "",
      },
    }).catch(() => {});

    await db.notification.create({
      data: {
        studentId,
        type: "otp_resolved",
        title: "Student logged in",
        message: `${studentName} successfully logged in.`,
      },
    }).catch(() => {});

    // Create the session cookie with a self-contained signed token.
    const res = NextResponse.json({ ok: true });
    const sessionToken = signToken(studentId);
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("verify-otp error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or contact the academy owner." },
      { status: 500 },
    );
  }
}
