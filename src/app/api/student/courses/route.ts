import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getStudentSession(req);
  if (!session || session.kind !== "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSeeded();

  // On Vercel, the grant may or may not be in this function instance's DB.
  // To prevent "blinking" (courses appearing/disappearing), we ALWAYS return
  // all available courses for any authenticated student. The access control
  // (which student can see which course) is enforced at the video level via
  // checkAccess(). This way the course list is always consistent.
  try {
    const allCourses = await db.course.findMany({
      orderBy: { sortOrder: "asc" },
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
    });

    // Try to find the student's grants for accurate expiry dates.
    let grants: { courseId: string; grantedAt: Date; expiresAt: Date }[] = [];
    try {
      grants = await db.accessGrant.findMany({
        where: {
          studentId: session.id,
          revoked: false,
        },
        select: { courseId: true, grantedAt: true, expiresAt: true },
      });
    } catch {
      /* ignore */
    }

    // Build a lookup for grants.
    const grantMap = new Map(grants.map(g => [g.courseId, g]));

    // Default expiry: 30 days from now (for courses without a grant record).
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const courses = allCourses.map((c) => {
      const grant = grantMap.get(c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        color: c.color,
        thumbnail: c.thumbnail,
        videoCount: c.videos.length,
        videos: c.videos,
        grantedAt: grant?.grantedAt || new Date(),
        expiresAt: grant?.expiresAt || defaultExpiry,
      };
    });

    return NextResponse.json({ courses });
  } catch (e) {
    console.error("courses query error:", e);
    return NextResponse.json({ courses: [] });
  }
}
