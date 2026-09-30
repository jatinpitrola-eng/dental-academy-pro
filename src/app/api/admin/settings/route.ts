import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { hashPassword, verifyPassword } from "@/lib/crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const admin = await db.admin.findUnique({ where: { id: "admin-master" } });
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      admin: { email: admin.email, username: admin.username, name: admin.name, secretKey: admin.secretKey },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim();
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.secretKey === "string" && body.secretKey.trim()) data.secretKey = body.secretKey.trim();
  if (typeof body.password === "string" && body.password.trim()) {
    const currentPassword = String(body.currentPassword || "");
    const admin = await db.admin.findUnique({ where: { id: "admin-master" } });
    if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!verifyPassword(currentPassword, admin.passwordHash as string))
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    data.passwordHash = hashPassword(body.password.trim());
  }

  try {
    await db.admin.update({ where: { id: "admin-master" }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("settings update error:", e);
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }
}
