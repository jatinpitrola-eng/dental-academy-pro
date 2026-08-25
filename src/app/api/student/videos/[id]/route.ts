import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

// Returns the playable source for a single video if the student has access.
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

  // Confirm active grant.
  const grant = await db.accessGrant.findFirst({
    where: {
      studentId: session.id,
      courseId: video.courseId,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });
  if (!grant)
    return NextResponse.json(
      { error: "You do not have access to this video." },
      { status: 403 },
    );

  return NextResponse.json({
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      sourceType: video.sourceType,
      sourceUrl: video.sourceUrl,
      youtubeId: video.youtubeId,
      course: {
        id: video.course.id,
        title: video.course.title,
        color: video.course.color,
      },
      expiresAt: grant.expiresAt,
    },
  });
}
