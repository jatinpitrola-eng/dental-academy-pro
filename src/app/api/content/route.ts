import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";

export const runtime = "nodejs";

// Public endpoint — no auth needed (students view the landing page).
export async function GET() {
  try {
    await ensureSchema();
    const res = await db.$queryRawUnsafe<{ data: string }[]>(
      'SELECT data FROM "AppContent" WHERE id = ?',
      "main",
    );
    if (!res || res.length === 0) return NextResponse.json({ content: {} });
    const content = JSON.parse(res[0].data as string);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: {} });
  }
}
