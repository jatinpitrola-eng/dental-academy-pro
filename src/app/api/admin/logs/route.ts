import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { createClient } from "@libsql/client";

export const runtime = "nodejs";

// Use direct libsql client for faster queries.
const client = createClient({
  url: "libsql://dental-academy-jatinpitrola-eng.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc3MzM5NDcsImlkIjoiMDFhMDNkM2QtZjIwMS03ZDE2LWIwOTQtMzcyNmMxMDcwODNiIiwia2lkIjoiSUZMcWF5Z3dwYjRUd2lwZURrYUtaanpXTUJKSkxJMTIzaWFsWUhUZnIwayIsInJpZCI6Ijk1MzE1NTY5LTU3ZGEtNDk0ZS1iZGI5LWQ2MWYyNzhhMGY1YiJ9.fmMIcFjKgNVFim0UF79LazrSplUECpae2ET3t_3DrrVZ-sYJwEKNpK0T4CiKWahtx_uGLzvmllG7PX-7WbN7Cg',
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Use direct SQL for speed — single queries, not N+1.
    const [logsRes, violationsRes, studentsCount, activeCount, pendingCount, disabledCount, coursesCount, videosCount, pendingOtpsCount, violationsCount, grantsCount] = await Promise.all([
      client.execute('SELECT * FROM "ActivityLog" ORDER BY "createdAt" DESC LIMIT 50'),
      client.execute('SELECT * FROM "Violation" ORDER BY "createdAt" DESC LIMIT 50'),
      client.execute('SELECT COUNT(*) as c FROM "Student"'),
      client.execute('SELECT COUNT(*) as c FROM "Student" WHERE "status" = \'active\''),
      client.execute('SELECT COUNT(*) as c FROM "Student" WHERE "status" = \'pending\''),
      client.execute('SELECT COUNT(*) as c FROM "Student" WHERE "status" = \'disabled\''),
      client.execute('SELECT COUNT(*) as c FROM "Course"'),
      client.execute('SELECT COUNT(*) as c FROM "Video"'),
      client.execute('SELECT COUNT(*) as c FROM "OtpRequest" WHERE "status" = \'pending\''),
      client.execute('SELECT COUNT(*) as c FROM "Violation"'),
      client.execute('SELECT COUNT(*) as c FROM "AccessGrant" WHERE "revoked" = 0'),
    ]);

    // Build student lookup map (single query).
    const studentsRes = await client.execute('SELECT "id", "name", "email" FROM "Student"');
    const studentMap = new Map<string, { name: string; email: string }>();
    for (const row of studentsRes.rows) {
      const r = row as Record<string, unknown>;
      studentMap.set(r.id as string, { name: r.name as string, email: r.email as string });
    }

    // Attach student info to logs and violations.
    const logs = logsRes.rows.map((r) => {
      const row = r as Record<string, unknown>;
      const studentId = row.studentId as string | null;
      return {
        ...row,
        student: studentId ? studentMap.get(studentId) || null : null,
      };
    });

    const violations = violationsRes.rows.map((r) => {
      const row = r as Record<string, unknown>;
      const studentId = row.studentId as string | null;
      return {
        ...row,
        student: studentId ? studentMap.get(studentId) || null : null,
      };
    });

    const stats = {
      students: Number((studentsCount.rows[0] as Record<string, unknown>).c),
      activeStudents: Number((activeCount.rows[0] as Record<string, unknown>).c),
      pendingStudents: Number((pendingCount.rows[0] as Record<string, unknown>).c),
      disabledStudents: Number((disabledCount.rows[0] as Record<string, unknown>).c),
      courses: Number((coursesCount.rows[0] as Record<string, unknown>).c),
      videos: Number((videosCount.rows[0] as Record<string, unknown>).c),
      pendingOtps: Number((pendingOtpsCount.rows[0] as Record<string, unknown>).c),
      violations: Number((violationsCount.rows[0] as Record<string, unknown>).c),
      grants: Number((grantsCount.rows[0] as Record<string, unknown>).c),
    };

    return NextResponse.json({ logs, violations, stats });
  } catch (e) {
    console.error("admin logs error:", e);
    return NextResponse.json({
      logs: [],
      violations: [],
      stats: { students: 0, activeStudents: 0, pendingStudents: 0, disabledStudents: 0, courses: 0, videos: 0, pendingOtps: 0, violations: 0, grants: 0 },
    });
  }
}
