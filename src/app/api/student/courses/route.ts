import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get all courses.
    const allCourses = await db.course.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // For each course, get its videos separately.
    const coursesWithVideos = [];
    for (const c of allCourses) {
      const videos = await db.video.findMany({
        where: { courseId: c.id },
        orderBy: { sortOrder: "asc" },
      }).catch(() => []);
      coursesWithVideos.push({
        id: c.id,
        title: c.title,
        description: c.description,
        color: c.color,
        thumbnail: c.thumbnail,
        videoCount: (videos || []).length,
        videos: videos || [],
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return NextResponse.json({ courses: coursesWithVideos });
  } catch (e) {
    console.error("courses query error:", e);
    return NextResponse.json({ courses: [] });
  }
}
