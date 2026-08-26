import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { checkAccess } from "@/lib/access";

export const runtime = "nodejs";

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
      expiresAt: access.expiresAt,
    },
  });
}
