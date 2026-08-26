import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get the student's grants (courses they have access to).
    const grants = await db.accessGrant.findMany({
      where: {
        studentId: session.id,
        revoked: false,
      },
    }).catch(() => []);

    // If no grants found, return empty (student sees "no courses yet").
    if (!grants || grants.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    // For each granted course, fetch course + videos.
    const courses = [];
    for (const g of grants) {
      const course = await db.course.findUnique({
        where: { id: g.courseId as string },
      }).catch(() => null);
      if (!course) continue;

      const videos = await db.video.findMany({
        where: { courseId: g.courseId as string },
        orderBy: { sortOrder: "asc" },
      }).catch(() => []);

      courses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        color: course.color,
        thumbnail: course.thumbnail,
        videoCount: (videos || []).length,
        videos: videos || [],
        grantedAt: g.grantedAt,
        expiresAt: g.expiresAt,
      });
    }

    return NextResponse.json({ courses });
  } catch (e) {
    console.error("courses query error:", e);
    return NextResponse.json({ courses: [] });
  }
}
