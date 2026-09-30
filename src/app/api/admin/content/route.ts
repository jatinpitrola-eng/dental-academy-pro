import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSchema();
    const res = await db.$queryRawUnsafe<{ data: string }[]>(
      'SELECT data FROM "AppContent" WHERE id = ?',
      "main",
    );
    if (!res || res.length === 0) return NextResponse.json({ content: {} });
    const content = JSON.parse(res[0].data as string);
    return NextResponse.json({ content });
  } catch (e) {
    console.error("content get error:", e);
    return NextResponse.json({ content: {} });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const data = JSON.stringify(body);
    const now = new Date().toISOString();
    await db.$executeRawUnsafe(
      'INSERT OR REPLACE INTO "AppContent" (id, data, updatedAt) VALUES (?, ?, ?)',
      "main",
      data,
      now,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("content update error:", e);
    return NextResponse.json({ error: "Could not update content" }, { status: 500 });
  }
}

// Also support PATCH as the admin dashboard may use it.
export async function PATCH(req: NextRequest) {
  return PUT(req);
}
