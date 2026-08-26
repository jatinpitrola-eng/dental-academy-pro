import { db } from "./db";
import { hashPassword } from "./crypto";
import { ensureSchema } from "./ensure-schema";

let seedPromise: Promise<void> | null = null;

/**
 * Ensures the database schema exists and has the minimum required data.
 * Runs once per serverless instance lifecycle.
 */
export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = doSeed();
  return seedPromise;
}

async function doSeed(): Promise<void> {
  try {
    // First, create the schema (tables) if they don't exist.
    await ensureSchema();

    // Check if admin exists. If the table doesn't exist yet (race condition),
    // ensureSchema should have created it. The catch handles any residual error.
    const adminCount = await db.admin.count().catch((e) => {
      console.error("admin count error:", e);
      return -1;
    });
    if (adminCount > 0) return; // already seeded

    // Create master admin with FIXED ID so sessions survive cold starts.
    await db.admin.create({
      data: {
        id: "admin-master",
        username: "master",
        email: "owner@dentalacademy.com",
        passwordHash: hashPassword("Admin@Dental#2024"),
        secretKey: "dental-master-2024",
        name: "Academy Owner",
      },
    });

    // Create sample courses + videos with FIXED IDs.
    const courses = [
      {
        id: "course-1",
        title: "Foundation of Dental Anatomy",
        description:
          "Master the core anatomical structures of the human dentition.",
        color: "#10b981",
        videos: [
          { id: "video-1-1", title: "Introduction to Tooth Anatomy", description: "Overview of primary and permanent dentition.", youtube: "https://www.youtube.com/watch?v=O2lW3xY4YxI" },
          { id: "video-1-2", title: "Enamel & Dentin Structure", description: "Histology of hard dental tissues.", youtube: "https://youtu.be/SQy3l0O9e7I" },
          { id: "video-1-3", title: "Root Morphology", description: "Understanding root canal systems.", youtube: "https://www.youtube.com/watch?v=p7mD-43PWHk" },
        ],
      },
      {
        id: "course-2",
        title: "Modern Endodontics",
        description:
          "Step-by-step endodontic therapy — diagnosis, instrumentation, obturation.",
        color: "#0ea5e9",
        videos: [
          { id: "video-2-1", title: "Diagnosis & Treatment Planning", description: "Pulp vitality tests and radiographic assessment.", youtube: "https://www.youtube.com/watch?v=2gRi3m9G3Rk" },
          { id: "video-2-2", title: "Rotary Instrumentation Technique", description: "Hands-on rotary file systems.", youtube: "https://youtu.be/J2O5M5R5oW4" },
        ],
      },
      {
        id: "course-3",
        title: "Aesthetic Dentistry Masterclass",
        description: "Veneers, smile design, and composite artistry.",
        color: "#f59e0b",
        videos: [
          { id: "video-3-1", title: "Smile Design Principles", description: "Golden proportion and facial aesthetics.", youtube: "https://www.youtube.com/watch?v=5MgT4gS6l6g" },
          { id: "video-3-2", title: "Veneer Preparation Protocol", description: "Minimally invasive prep technique.", youtube: "https://youtu.be/oY2k6q1R2hY" },
        ],
      },
    ];

    for (const [ci, c] of courses.entries()) {
      await db.course.create({
        data: {
          id: c.id,
          title: c.title,
          description: c.description,
          color: c.color,
          sortOrder: ci,
        },
      });
      for (const [vi, v] of c.videos.entries()) {
        const yt =
          v.youtube.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
          )?.[1] || null;
        await db.video.create({
          data: {
            id: v.id,
            courseId: c.id,
            title: v.title,
            description: v.description,
            sourceType: yt ? "youtube" : "url",
            sourceUrl: yt
              ? `https://www.youtube.com/watch?v=${yt}`
              : v.youtube,
            youtubeId: yt,
            sortOrder: vi,
          },
        });
      }
    }

    // Create demo student with FIXED ID.
    await db.student.create({
      data: {
        id: "student-demo",
        name: "Demo Student",
        email: "demo@student.com",
        phone: "9876543210",
        passwordHash: hashPassword("student123"),
        status: "pending",
      },
    });

    console.log("✓ Auto-seed complete (fixed IDs)");
  } catch (e) {
    console.error("auto-seed error:", e);
  }
}
