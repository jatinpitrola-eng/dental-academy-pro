import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginAdmin, createAdminSession, ADMIN_COOKIE } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

// The master admin portal is "secret". Access is granted only when the
// correct secretKey is presented in the body alongside credentials.
export async function POST(req: NextRequest) {
  try {
    // Ensure the DB schema + seed data exist BEFORE any DB query.
    await ensureSeeded();

    const body = await req.json().catch(() => ({}));
    const secretKey = String(body.secretKey || "").trim();
    const email = String(body.email || body.username || "").trim();
    const password = String(body.password || "");

    // Verify the portal secret first.
    const adminBySecret = await db.admin.findFirst({ where: { secretKey } });
    if (!adminBySecret)
      return NextResponse.json(
        { error: "This portal does not exist." },
        { status: 404 },
      );

    const admin = await loginAdmin(email, password);
    if (!admin)
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );

    if (admin.id !== adminBySecret.id)
      return NextResponse.json(
        { error: "Credentials do not match this portal." },
        { status: 403 },
      );

    const token = await createAdminSession(admin.id);
    const res = NextResponse.json({
      ok: true,
      admin: { username: admin.username, name: admin.name },
    });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("admin login error", e);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
