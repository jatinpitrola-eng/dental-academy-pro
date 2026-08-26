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
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!name || !email || !password)
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 },
      );
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );

    const existing = await db.student.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 },
      );

    const deviceId = getDeviceId(req);
    const deviceLabel = getDeviceLabel(req);
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") || "";

    // New students start in "pending" status until the admin approves a login.
    const student = await db.student.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash: hashPassword(password),
        status: "pending",
        activeDeviceId: deviceId,
        deviceToken: generateToken(),
        deviceLabel,
      },
    });

    await db.activityLog.create({
      data: {
        studentId: student.id,
        action: "register",
        detail: `Registered from ${deviceLabel}`,
        ip,
        userAgent: ua,
      },
    });

    await db.notification.create({
      data: {
        studentId: student.id,
        type: "registered",
        title: "New student registered",
        message: `${name} (${email}) just registered and is awaiting access.`,
      },
    });

    const res = NextResponse.json({
      ok: true,
      message:
        "Registration received. The academy owner will review and share an access code.",
    });
    res.cookies.set("da_device", deviceId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
