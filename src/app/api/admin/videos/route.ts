import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { extractYoutubeId } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  try {
    const videos = await db.video.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { course: { select: { title: true, color: true } } },
    });
    return NextResponse.json({ videos });
  } catch (e) {
    console.error("admin videos error:", e);
    return NextResponse.json({ videos: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  let title: string,
    description: string,
    courseId: string,
    sourceType: string,
    sourceUrl: string,
    youtubeId: string | null = null,
    duration: number;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || "").trim();
    description = String(form.get("description") || "").trim();
    courseId = String(form.get("courseId") || "");
    duration = Number(form.get("duration") || 0);
    const file = form.get("file") as File | null;
    const url = String(form.get("url") || "").trim();

    // Priority 1: YouTube URL (free unlimited hosting, hidden from student)
    const yt = extractYoutubeId(url);
    if (yt) {
      sourceType = "youtube";
      youtubeId = yt;
      sourceUrl = `https://www.youtube.com/watch?v=${yt}`;
    } else if (url) {
      // Priority 2: direct mp4 URL
      sourceType = "url";
      sourceUrl = url;
    } else if (file && file.size > 0) {
      // Priority 3: file upload (saved locally)
      const dir = join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const fname = `vid_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(join(dir, fname), buf);
      sourceType = "upload";
      sourceUrl = `/uploads/${fname}`;
    } else {
      return NextResponse.json(
        { error: "Provide a YouTube URL, a video URL, or a file." },
        { status: 400 },
      );
    }
  } else {
    const body = await req.json().catch(() => ({}));
    title = String(body.title || "").trim();
    description = String(body.description || "").trim();
    courseId = String(body.courseId || "");
    duration = Number(body.duration || 0);
    const url = String(body.sourceUrl || "").trim();
    const yt = extractYoutubeId(url);
    if (yt) {
      sourceType = "youtube";
      youtubeId = yt;
      sourceUrl = `https://www.youtube.com/watch?v=${yt}`;
    } else {
      sourceType = "url";
      sourceUrl = url;
    }
  }

  if (!title || !courseId || !sourceUrl)
    return NextResponse.json(
      { error: "Title, course and video source are required." },
      { status: 400 },
    );

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course)
    return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const count = await db.video.count({ where: { courseId } });
  const video = await db.video.create({
    data: {
      title,
      description,
      courseId,
      sourceType,
      sourceUrl,
      youtubeId,
      duration,
      sortOrder: count,
    },
  });
  return NextResponse.json({ video });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id)
    return NextResponse.json({ error: "Video id required." }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string")
    data.description = body.description.trim();
  if (typeof body.sourceUrl === "string") {
    const yt = extractYoutubeId(body.sourceUrl);
    if (yt) {
      data.sourceType = "youtube";
      data.youtubeId = yt;
      data.sourceUrl = `https://www.youtube.com/watch?v=${yt}`;
    } else {
      data.sourceUrl = body.sourceUrl;
    }
  }
  if (typeof body.duration === "number") data.duration = body.duration;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.courseId === "string") data.courseId = body.courseId;
  data.updatedAt = new Date().toISOString();
  try {
    const video = await db.video.update({ where: { id }, data });
    return NextResponse.json({ video });
  } catch (e) {
    console.error("video update error:", e);
    return NextResponse.json({ error: "Could not update video." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Video id required." }, { status: 400 });
  await db.video.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
