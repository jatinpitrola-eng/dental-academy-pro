import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { createClient } from "@libsql/client";

export const runtime = "nodejs";

const client = createClient({
  url: "libsql://dental-academy-jatinpitrola-eng.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc3MzM5NDcsImlkIjoiMDFhMDNkM2QtZjIwMS03ZDE2LWIwOTQtMzcyNmMxMDcwODNiIiwia2lkIjoiSUZMcWF5Z3dwYjRUd2lwZURrYUtaanpXTUJKSkxJMTIzaWFsWUhUZnIwayIsInJpZCI6Ijk1MzE1NTY5LTU3ZGEtNDk0ZS1iZGI5LWQ2MWYyNzhhMGY1YiJ9.fmMIcFjKgNVFim0UF79LazrSplUECpae2ET3t_3DrrVZ-sYJwEKNpK0T4CiKWahtx_uGLzvmllG7PX-7WbN7Cg",
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await client.execute('SELECT data FROM "AppContent" WHERE id = ?', ["main"]);
    if (res.rows.length === 0) return NextResponse.json({ content: {} });
    const content = JSON.parse(res.rows[0].data as string);
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
    const body = await req.json().catch(() => ({}));
    const data = JSON.stringify(body);
    const now = new Date().toISOString();
    await client.execute({
      sql: 'INSERT OR REPLACE INTO "AppContent" (id, data, updatedAt) VALUES (?, ?, ?)',
      args: ["main", data, now],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("content update error:", e);
    return NextResponse.json({ error: "Could not update content" }, { status: 500 });
  }
}
