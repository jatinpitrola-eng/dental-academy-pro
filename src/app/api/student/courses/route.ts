import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only return courses the student has an active, non-expired grant for.
  const grants = await db.accessGrant.findMany({
    where: {
      studentId: session.id,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    include: {
      course: {
        include: {
          videos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              duration: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  });
  const courses = grants.map((g) => ({
    id: g.course.id,
    title: g.course.title,
    description: g.course.description,
    color: g.course.color,
    thumbnail: g.course.thumbnail,
    videoCount: g.course.videos.length,
    videos: g.course.videos,
    grantedAt: g.grantedAt,
    expiresAt: g.expiresAt,
  }));
  return NextResponse.json({ courses });
}
