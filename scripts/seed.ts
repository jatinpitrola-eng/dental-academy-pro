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

  // Sample courses + videos
  const courses = [
    {
      title: "Foundation of Dental Anatomy",
      description:
        "Master the core anatomical structures of the human dentition — from enamel microstructure to root morphology.",
      color: "#10b981",
      videos: [
        {
          title: "Introduction to Tooth Anatomy",
          description: "Overview of primary and permanent dentition.",
          sourceUrl: "/videos/lesson-1.mp4",
          duration: 12,
        },
        {
          title: "Enamel & Dentin Structure",
          description: "Histology of hard dental tissues.",
          sourceUrl: "/videos/lesson-2.mp4",
          duration: 12,
        },
        {
          title: "Root Morphology",
          description: "Understanding root canal systems.",
          sourceUrl: "/videos/lesson-3.mp4",
          duration: 20,
        },
      ],
    },
    {
      title: "Modern Endodontics",
      description:
        "Step-by-step endodontic therapy — diagnosis, instrumentation, obturation and modern rotary systems.",
      color: "#0ea5e9",
      videos: [
        {
          title: "Diagnosis & Treatment Planning",
          description: "Pulp vitality tests and radiographic assessment.",
          sourceUrl: "/videos/lesson-2.mp4",
          duration: 12,
        },
        {
          title: "Rotary Instrumentation Technique",
          description: "Hands-on rotary file systems.",
          sourceUrl: "/videos/lesson-3.mp4",
          duration: 20,
        },
      ],
    },
    {
      title: "Aesthetic Dentistry Masterclass",
      description:
        "Veneers, smile design, and composite artistry taught by leading aesthetic dentists.",
      color: "#f59e0b",
      videos: [
        {
          title: "Smile Design Principles",
          description: "Golden proportion and facial aesthetics.",
          sourceUrl: "/videos/lesson-1.mp4",
          duration: 12,
        },
        {
          title: "Veneer Preparation Protocol",
          description: "Minimally invasive prep technique.",
          sourceUrl: "/videos/lesson-3.mp4",
          duration: 20,
        },
      ],
    },
  ];

  for (const [ci, c] of courses.entries()) {
    const course = await db.course.upsert({
      where: { id: `course-seed-${ci + 1}` },
      update: {
        title: c.title,
        description: c.description,
        color: c.color,
      },
      create: {
        id: `course-seed-${ci + 1}`,
        title: c.title,
        description: c.description,
        color: c.color,
        sortOrder: ci,
      },
    });
    for (const [vi, v] of c.videos.entries()) {
      await db.video.upsert({
        where: { id: `video-seed-${ci + 1}-${vi + 1}` },
        update: {
          courseId: course.id,
          title: v.title,
          description: v.description,
          sourceUrl: v.sourceUrl,
          duration: v.duration,
        },
        create: {
          id: `video-seed-${ci + 1}-${vi + 1}`,
          courseId: course.id,
          title: v.title,
          description: v.description,
          sourceType: "url",
          sourceUrl: v.sourceUrl,
          duration: v.duration,
          sortOrder: vi,
        },
      });
    }
  }

  // A demo student so the owner can test the full flow immediately.
  // NOTE: the demo student starts with NO course access — the owner must
  // approve a login and select course(s) during approval (or via the Students
  // tab) before any course unlocks. This matches the real flow.
  const demo = await db.student.upsert({
    where: { email: "demo@student.com" },
    update: {},
    create: {
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
