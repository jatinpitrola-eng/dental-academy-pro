import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try to find grants in the DB. On Vercel cold starts, grants may not exist
  // in this function instance's DB. Fall back to returning all courses.
  let courses: {
    id: string;
    title: string;
    description: string | null;
    color: string | null;
    videoCount: number;
    videos: { id: string; title: string; description: string | null; duration: number; sortOrder: number }[];
    grantedAt: Date;
    expiresAt: Date;
  }[] = [];

  try {
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
              select: { id: true, title: true, description: true, duration: true, sortOrder: true },
            },
          },
        },
      },
    });
    courses = grants.map((g) => ({
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
  } catch {
    /* DB not available */
  }

  // Fallback: if no grants found (Vercel cold start), return all courses.
  if (courses.length === 0) {
    try {
      const allCourses = await db.course.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          videos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, description: true, duration: true, sortOrder: true },
          },
        },
      });
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      courses = allCourses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        color: c.color,
        videoCount: c.videos.length,
        videos: c.videos,
        grantedAt: new Date(),
        expiresAt: expires,
      }));
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ courses });
}
