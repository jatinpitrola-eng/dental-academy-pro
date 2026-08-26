import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
      return NextResponse.json(
        { error: "Request and code are required." },
        { status: 400 },
      );

    const otp = await db.otpRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    });
    if (!otp)
      return NextResponse.json({ error: "Invalid request." }, { status: 404 });
    if (otp.status === "consumed")
      return NextResponse.json(
        { error: "This code was already used." },
        { status: 410 },
      );
    if (otp.status !== "approved" || !otp.code)
      return NextResponse.json(
        {
          error:
            "Your request is still pending approval. Please wait for the academy owner to approve.",
          pending: true,
        },
        { status: 202 },
      );
    if (otp.expiresAt < new Date())
      return NextResponse.json(
        { error: "This code has expired. Please request a new one." },
        { status: 410 },
      );
    if (otp.code !== code)
      return NextResponse.json(
        { error: "Incorrect access code." },
        { status: 401 },
      );

    const deviceId = getDeviceId(req);
    if (otp.deviceId !== deviceId)
      return NextResponse.json(
        {
          error:
            "This code was issued for a different device. Please log in again from the same device.",
        },
        { status: 403 },
      );

    const student = otp.student;
    if (student.status === "disabled")
      return NextResponse.json(
        { error: "Account disabled. Contact the academy.", disabled: true },
        { status: 403 },
      );

    // Revoke any previous sessions (single-device enforcement).
    await db.session.updateMany({
      where: { studentId: student.id, revoked: false },
      data: { revoked: true },
    });

    const deviceToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.session.create({
      data: {
        studentId: student.id,
        deviceId,
        deviceToken,
        deviceLabel: getDeviceLabel(req),
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || "",
        expiresAt,
      },
    });

    // Bind this device to the student account and activate them.
    await db.student.update({
      where: { id: student.id },
      data: {
        activeDeviceId: deviceId,
        deviceToken,
        deviceLabel: getDeviceLabel(req),
        status: "active",
      },
    });

    await db.otpRequest.update({
      where: { id: otp.id },
      data: { status: "consumed", resolvedAt: new Date() },
    });

    await db.activityLog.create({
      data: {
        studentId: student.id,
        action: "login_success",
        detail: `Logged in from ${getDeviceLabel(req)}`,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || "",
      },
    });

    await db.notification.create({
      data: {
        studentId: student.id,
        type: "otp_resolved",
        title: "Student logged in",
        message: `${student.name} successfully logged in.`,
      },
    });

    const res = NextResponse.json({ ok: true });
    // Use a self-contained signed token (studentId.signature) so the session
    // survives Vercel cold starts where the DB resets.
    const sessionToken = signToken(student.id);
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
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
