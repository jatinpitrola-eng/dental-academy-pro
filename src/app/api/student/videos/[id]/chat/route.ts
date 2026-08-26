import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { checkAccess } from "@/lib/access";

export const runtime = "nodejs";

// GET — load conversation history for this video.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!video)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const access = await checkAccess(session.id, video.courseId);

  const messages = await db.chatMessage.findMany({
    where: { studentId: session.id, videoId: video.id },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}

// POST — send a message and get an AI reply.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    include: { course: true, summaries: true },
  });
  if (!video)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const access = await checkAccess(session.id, video.courseId);

  const body = await req.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  if (!message)
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > 2000)
    return NextResponse.json(
      { error: "Message is too long (max 2000 characters)." },
      { status: 400 },
    );

  // Build the per-video context for the AI — keep it SHORT for speed.
  const summary = video.summaries[0];
  const contextBits: string[] = [
    `Student: ${session.name}. Video: "${video.title}" in course "${video.course.title}".`,
  ];
  if (video.description)
    contextBits.push(`Description: ${video.description.slice(0, 300)}`);
  if (summary?.summary) {
    // Only send a short excerpt of the summary (not the full thing).
    const s = summary.summary.slice(0, 1500);
    contextBits.push(`Lesson summary:\n${s}`);
  }

  // Load recent history — only last 6 messages for speed.
  const historyRows = await db.chatMessage.findMany({
    where: { studentId: session.id, videoId: video.id },
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { role: true, content: true },
  });
  const history = historyRows.map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  // Save the user's message first.
  await db.chatMessage.create({
    data: {
      studentId: session.id,
      videoId: video.id,
      role: "user",
      content: message,
    },
  });

  try {
    // Lazy-import AI module to avoid build-time issues on Vercel.
    const { llmChat, DENTAL_EXPERT_SYSTEM } = await import("@/lib/ai");
    const system = `${DENTAL_EXPERT_SYSTEM}\n\n--- VIDEO CONTEXT ---\n${contextBits.join("\n\n")}`;
    const reply = await llmChat(system, history, message);
    // Save the AI reply.
    const saved = await db.chatMessage.create({
      data: {
        studentId: session.id,
        videoId: video.id,
        role: "assistant",
        content: reply,
      },
    });
    return NextResponse.json({
      reply,
      message: {
        id: saved.id,
        role: saved.role,
        content: saved.content,
        createdAt: saved.createdAt,
      },
    });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json(
      { error: "The assistant could not respond. Please try again." },
      { status: 500 },
    );
  }
}

// DELETE — clear conversation history for this video.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.chatMessage.deleteMany({
    where: { studentId: session.id, videoId: id },
  });
  return NextResponse.json({ ok: true });
}
// force rebuild
// rebuild 1787723048
