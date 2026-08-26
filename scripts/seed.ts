import { db } from "../src/lib/db";
import { hashPassword, generateToken } from "../src/lib/crypto";

async function main() {
  // Master admin (secret portal)
  const adminPassword = "Admin@Dental#2024";
  const secretKey = "dental-master-2024"; // portal access key (change in production)
  const adminEmail = "owner@dentalacademy.com";
  const admin = await db.admin.upsert({
    where: { username: "master" },
    update: {
      passwordHash: hashPassword(adminPassword),
      secretKey,
      email: adminEmail,
    },
    create: {
      username: "master",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      secretKey,
      name: "Academy Owner",
    },
  });

  console.log("✓ Master admin created");
  console.log("  Username:", admin.username);
  console.log("  Password:", adminPassword);
  console.log("  Secret admin portal key:", admin.secretKey);

  // Sample courses + videos with FIXED IDs that match auto-seed.ts.
  const courses = [
    {
      id: "course-1",
      title: "Foundation of Dental Anatomy",
      description: "Master the core anatomical structures of the human dentition — from enamel microstructure to root morphology.",
      color: "#10b981",
      videos: [
        { id: "video-1-1", title: "Introduction to Tooth Anatomy", description: "Overview of primary and permanent dentition.", youtube: "https://www.youtube.com/watch?v=O2lW3xY4YxI", duration: 0 },
        { id: "video-1-2", title: "Enamel & Dentin Structure", description: "Histology of hard dental tissues.", youtube: "https://youtu.be/SQy3l0O9e7I", duration: 0 },
        { id: "video-1-3", title: "Root Morphology", description: "Understanding root canal systems.", youtube: "https://www.youtube.com/watch?v=p7mD-43PWHk", duration: 0 },
      ],
    },
    {
      id: "course-2",
      title: "Modern Endodontics",
      description: "Step-by-step endodontic therapy — diagnosis, instrumentation, obturation.",
      color: "#0ea5e9",
      videos: [
        { id: "video-2-1", title: "Diagnosis & Treatment Planning", description: "Pulp vitality tests and radiographic assessment.", youtube: "https://www.youtube.com/watch?v=2gRi3m9G3Rk", duration: 0 },
        { id: "video-2-2", title: "Rotary Instrumentation Technique", description: "Hands-on rotary file systems.", youtube: "https://youtu.be/J2O5M5R5oW4", duration: 0 },
      ],
    },
    {
      id: "course-3",
      title: "Aesthetic Dentistry Masterclass",
      description: "Veneers, smile design, and composite artistry taught by leading aesthetic dentists.",
      color: "#f59e0b",
      videos: [
        { id: "video-3-1", title: "Smile Design Principles", description: "Golden proportion and facial aesthetics.", youtube: "https://www.youtube.com/watch?v=5MgT4gS6l6g", duration: 0 },
        { id: "video-3-2", title: "Veneer Preparation Protocol", description: "Minimally invasive prep technique.", youtube: "https://youtu.be/oY2k6q1R2hY", duration: 0 },
      ],
    },
  ];

  for (const [ci, c] of courses.entries()) {
    const courseId = c.id || `course-seed-${ci + 1}`;
    const course = await db.course.upsert({
      where: { id: courseId },
      update: {
        title: c.title,
        description: c.description,
        color: c.color,
      },
      create: {
        id: courseId,
        title: c.title,
        description: c.description,
        color: c.color,
        sortOrder: ci,
      },
    });
    for (const [vi, v] of c.videos.entries()) {
      const videoId = v.id || `video-seed-${ci + 1}-${vi + 1}`;
      // Extract a YouTube id if a youtube link was provided, else use a local URL.
      const yt =
        v.youtube &&
        (v.youtube.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] ||
          null);
      const sourceType = yt ? "youtube" : "url";
      const sourceUrl = yt
        ? `https://www.youtube.com/watch?v=${yt}`
        : v.sourceUrl || "";
      await db.video.upsert({
        where: { id: videoId },
        update: {
          courseId: course.id,
          title: v.title,
          description: v.description,
          sourceType,
          sourceUrl,
          youtubeId: yt,
          duration: v.duration,
        },
        create: {
          id: videoId,
          courseId: course.id,
          title: v.title,
          description: v.description,
          sourceType,
          sourceUrl,
          youtubeId: yt,
          duration: v.duration,
          sortOrder: vi,
        },
      });
    }
  }

  // A demo student with FIXED ID (matches auto-seed.ts).
  const demo = await db.student.upsert({
    where: { email: "demo@student.com" },
    update: {},
    create: {
      id: "student-demo",
      name: "Demo Student",
      email: "demo@student.com",
      phone: "9876543210",
      passwordHash: hashPassword("student123"),
      status: "pending",
    },
  });

  console.log("✓ Sample courses, videos and a demo student created");
  console.log("  Demo student: demo@student.com / student123");
  console.log("  (no courses granted — owner must approve + select course)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
