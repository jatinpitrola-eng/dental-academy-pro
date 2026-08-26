import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST — mark a video as watched (or update last position).
export async function POST(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const videoId = String(body.videoId || "");
  const watched = body.watched === true;
  const lastPosition = Number(body.lastPosition || 0);
  if (!videoId)
    return NextResponse.json({ error: "videoId required." }, { status: 400 });

  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video)
    return NextResponse.json({ error: "Video not found." }, { status: 404 });

  const progress = await db.watchProgress.upsert({
    where: {
      studentId_videoId: { studentId: session.id, videoId },
    },
    update: {
      watched: watched || undefined,
      lastPosition: lastPosition || undefined,
    },
    create: {
      studentId: session.id,
      videoId,
      watched,
      lastPosition,
    },
  });
  return NextResponse.json({ progress });
}

// GET — list all watched video ids for the logged-in student.
export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.watchProgress.findMany({
    where: { studentId: session.id, watched: true },
    select: { videoId: true, lastPosition: true, updatedAt: true },
  });
  return NextResponse.json({
    watched: rows.map((r) => r.videoId),
    progress: rows,
  });
}
