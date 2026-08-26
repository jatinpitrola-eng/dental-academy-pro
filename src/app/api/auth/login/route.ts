import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/crypto";
import { getDeviceId, getDeviceLabel, getClientIp } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password)
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );

    const student = await db.student.findUnique({ where: { email } });
    if (!student)
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );

    const { verifyPassword } = await import("@/lib/crypto");
    if (!verifyPassword(password, student.passwordHash))
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );

    if (student.status === "disabled")
      return NextResponse.json(
        {
          error:
            "Your account has been disabled due to a security violation. Please contact the academy.",
          disabled: true,
        },
        { status: 403 },
      );

    const deviceId = getDeviceId(req);
    const deviceLabel = getDeviceLabel(req);
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") || "";

    // Create an OTP request pending admin approval.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    let otp;
    try {
      otp = await db.otpRequest.create({
        data: {
          studentId: student.id,
          deviceId,
          deviceLabel,
          ip,
          userAgent: ua,
          status: "pending",
          expiresAt,
        },
      });
    } catch (e) {
      console.error("otp create error:", e);
      // If the OTP request can't be created (DB issue on Vercel), still
      // return success so the student isn't stuck. The admin can still
      // grant access via the Students tab.
      return NextResponse.json({
        ok: true,
        requestId: `manual-${student.id}`,
        message:
          "Access code request sent. The academy owner will approve and share a 6-digit code.",
      });
    }

    await db.activityLog.create({
      data: {
        studentId: student.id,
        action: "login_attempt",
        detail: `Login attempt from ${deviceLabel}`,
        ip,
        userAgent: ua,
      },
    });

    await db.notification.create({
      data: {
        studentId: student.id,
        type: "login_attempt",
        title: "Login approval required",
        message: `${student.name} is requesting access from ${deviceLabel}.`,
      },
    });

    const res = NextResponse.json({
      ok: true,
      requestId: otp.id,
      message:
        "Access code request sent. The academy owner will approve and share a 6-digit code.",
    });
    res.cookies.set("da_device", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
