import { ensureSeeded } from "@/lib/auto-seed";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSeeded();
  const courses = await db.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { videos: true, grants: true } } },
  });
  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const color = String(body.color || "#10b981").trim();
  if (!title)
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  const course = await db.course.create({
    data: { title, description, color },
  });
  return NextResponse.json({ course });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id)
    return NextResponse.json({ error: "Course id required." }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string")
    data.description = body.description.trim();
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.published === "boolean") data.published = body.published;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  const course = await db.course.update({ where: { id }, data });
  return NextResponse.json({ course });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Course id required." }, { status: 400 });
  await db.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
