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

    // Check if admin exists.
    const adminCount = await db.admin.count().catch(() => -1);
    if (adminCount > 0) return; // already seeded

    // Create master admin.
    await db.admin.create({
      data: {
        username: "master",
        email: "owner@dentalacademy.com",
        passwordHash: hashPassword("Admin@Dental#2024"),
        secretKey: "dental-master-2024",
        name: "Academy Owner",
      },
    });

    // Create sample courses + videos.
    const courses = [
      {
        title: "Foundation of Dental Anatomy",
        description:
          "Master the core anatomical structures of the human dentition.",
        color: "#10b981",
        videos: [
          {
            title: "Introduction to Tooth Anatomy",
            description: "Overview of primary and permanent dentition.",
            youtube: "https://www.youtube.com/watch?v=O2lW3xY4YxI",
          },
          {
            title: "Enamel & Dentin Structure",
            description: "Histology of hard dental tissues.",
            youtube: "https://youtu.be/SQy3l0O9e7I",
          },
          {
            title: "Root Morphology",
            description: "Understanding root canal systems.",
            youtube: "https://www.youtube.com/watch?v=p7mD-43PWHk",
          },
        ],
      },
      {
        title: "Modern Endodontics",
        description:
          "Step-by-step endodontic therapy — diagnosis, instrumentation, obturation.",
        color: "#0ea5e9",
        videos: [
          {
            title: "Diagnosis & Treatment Planning",
            description: "Pulp vitality tests and radiographic assessment.",
            youtube: "https://www.youtube.com/watch?v=2gRi3m9G3Rk",
          },
          {
            title: "Rotary Instrumentation Technique",
            description: "Hands-on rotary file systems.",
            youtube: "https://youtu.be/J2O5M5R5oW4",
          },
        ],
      },
      {
        title: "Aesthetic Dentistry Masterclass",
        description:
          "Veneers, smile design, and composite artistry.",
        color: "#f59e0b",
        videos: [
          {
            title: "Smile Design Principles",
            description: "Golden proportion and facial aesthetics.",
            youtube: "https://www.youtube.com/watch?v=5MgT4gS6l6g",
          },
          {
            title: "Veneer Preparation Protocol",
            description: "Minimally invasive prep technique.",
            youtube: "https://youtu.be/oY2k6q1R2hY",
          },
        ],
      },
    ];

    for (const [ci, c] of courses.entries()) {
      const course = await db.course.create({
        data: {
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
            courseId: course.id,
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

    // Create demo student.
    await db.student.create({
      data: {
        name: "Demo Student",
        email: "demo@student.com",
        phone: "9876543210",
        passwordHash: hashPassword("student123"),
        status: "pending",
      },
    });

    console.log("✓ Auto-seed complete");
  } catch (e) {
    console.error("auto-seed error:", e);
  }
}
