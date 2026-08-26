import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const notes = await db.videoNote.findMany({
    where: { studentId: session.id, videoId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "").trim();
  if (!content)
    return NextResponse.json({ error: "Note cannot be empty." }, { status: 400 });
  if (content.length > 2000)
    return NextResponse.json({ error: "Note too long." }, { status: 400 });
  const note = await db.videoNote.create({
    data: { studentId: session.id, videoId: id, content },
  });
  return NextResponse.json({ note });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");
  if (noteId) {
    await db.videoNote.deleteMany({
      where: { id: noteId, studentId: session.id },
    });
  } else {
    // Delete all notes for this video.
    await db.videoNote.deleteMany({
      where: { videoId: id, studentId: session.id },
    });
  }
  return NextResponse.json({ ok: true });
}
