import { ensureSeeded } from "@/lib/auto-seed";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get("unread") === "1";
  const notifications = await db.notification.findMany({
    where: onlyUnread ? { read: false } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { student: { select: { name: true, email: true } } },
  });
  const unreadCount = await db.notification.count({ where: { read: false } });
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.markAllRead) {
    await db.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  const id = String(body.id || "");
  if (id)
    await db.notification.update({
      where: { id },
      data: { read: true },
    });
  return NextResponse.json({ ok: true });
}
