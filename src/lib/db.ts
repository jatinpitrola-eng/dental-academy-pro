import { createClient, type Client } from "@libsql/client";

// Turso database credentials.
const TURSO_URL = "libsql://dental-academy-jatinpitrola-eng.aws-ap-south-1.turso.io";
const TURSO_AUTH_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc3MzM5NDcsImlkIjoiMDFhMDNkM2QtZjIwMS03ZDE2LWIwOTQtMzcyNmMxMDcwODNiIiwia2lkIjoiSUZMcWF5Z3dwYjRUd2lwZURrYUtaanpXTUJKSkxJMTIzaWFsWUhUZnIwayIsInJpZCI6Ijk1MzE1NTY5LTU3ZGEtNDk0ZS1iZGI5LWQ2MWYyNzhhMGY1YiJ9.fmMIcFjKgNVFim0UF79LazrSplUECpae2ET3t_3DrrVZ-sYJwEKNpK0T4CiKWahtx_uGLzvmllG7PX-7WbN7Cg";

const client: Client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// Generate a CUID-like ID (since we're not using Prisma's auto-generation).
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `c${timestamp}${random}`;
}

// Add createdAt to data if not present. Most tables have createdAt; some
// also have updatedAt. We add createdAt always, and updatedAt only if the
// data already doesn't have it AND the table likely has it (we try/catch
// the insert to handle tables without updatedAt).
function addTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const now = new Date().toISOString();
  if (!data.createdAt) data.createdAt = now;
  return data;
}


// Helper: convert snake_case DB rows to camelCase objects (like Prisma does).
function toCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = v;
  }
  return out;
}

// Helper: build WHERE clause from a filter object.
function buildWhere(filter: Record<string, unknown>): { sql: string; args: unknown[] } {
  const parts: string[] = [];
  const args: unknown[] = [];
  for (const [k, v] of Object.entries(filter)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && v !== null) {
      // Handle Prisma-like operators: { gt: value }, { lt: value }, etc.
      const ops = v as Record<string, unknown>;
      for (const [op, opVal] of Object.entries(ops)) {
        const sqlOp = op === "gt" ? ">" : op === "lt" ? "<" : op === "gte" ? ">=" : op === "lte" ? "<=" : "=";
        parts.push(`"${k}" ${sqlOp} ?`);
        args.push(opVal);
      }
    } else {
      parts.push(`"${k}" = ?`);
      args.push(v);
    }
  }
  const sql = parts.length > 0 ? " WHERE " + parts.join(" AND ") : "";
  return { sql, args };
}

// Create a Prisma-like wrapper around the libsql client.
export const db = {
  admin: {
    async findUnique({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "Admin"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const w = where as Record<string, unknown>;
      if (w.OR) {
        const orConditions = w.OR as Record<string, unknown>[];
        const parts: string[] = [];
        const args: unknown[] = [];
        for (const cond of orConditions) {
          const { sql: condSql, args: condArgs } = buildWhere(cond);
          parts.push(condSql.replace(" WHERE ", "") || "1=1");
          args.push(...condArgs);
        }
        const res = await client.execute({ sql: `SELECT * FROM "Admin" WHERE ${parts.join(" OR ")} LIMIT 1`, args });
        return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
      }
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "Admin"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "Admin"`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "Admin" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
  },
  student: {
    async findUnique({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "Student"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
    async findMany({ where, orderBy, include }: { where?: Record<string, unknown>; orderBy?: Record<string, string>; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where || {});
      const orderSql = orderBy ? ` ORDER BY "${Object.keys(orderBy)[0]}" ${Object.values(orderBy)[0]}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "Student"${sql}${orderSql}`, args });
      let students = res.rows.map(r => toCamel(r as Record<string, unknown>));
      // If include.grants, fetch grants for each student.
      if (include?.grants) {
        for (const s of students) {
          const grantsRes = await client.execute({ sql: `SELECT * FROM "AccessGrant" WHERE "studentId" = ?`, args: [s.id] });
          s.grants = grantsRes.rows.map(r => toCamel(r as Record<string, unknown>));
          for (const g of s.grants) {
            const courseRes = await client.execute({ sql: `SELECT "title", "color" FROM "Course" WHERE "id" = ?`, args: [g.courseId] });
            g.course = courseRes.rows[0] ? toCamel(courseRes.rows[0] as Record<string, unknown>) : null;
          }
        }
        students = students.map(s => ({ ...s, _count: { violations: 0, activityLogs: 0, sessions: 0 } }));
      }
      return students;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "Student"`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "Student" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
    async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const setParts = Object.keys(data).map(k => `"${k}" = ?`).join(", ");
      const setArgs = Object.values(data);
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `UPDATE "Student" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
      const res = await client.execute({ sql: `SELECT * FROM "Student"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
  },
  course: {
    async findMany({ orderBy, include }: { orderBy?: Record<string, string>; include?: Record<string, unknown> }) {
      const orderSql = orderBy ? ` ORDER BY "${Object.keys(orderBy)[0]}" ${Object.values(orderBy)[0]}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "Course"${orderSql}` });
      let courses = res.rows.map(r => toCamel(r as Record<string, unknown>));
      if (include?._count) {
        for (const c of courses) {
          const vRes = await client.execute({ sql: `SELECT COUNT(*) as count FROM "Video" WHERE "courseId" = ?`, args: [c.id] });
          const gRes = await client.execute({ sql: `SELECT COUNT(*) as count FROM "AccessGrant" WHERE "courseId" = ?`, args: [c.id] });
          c._count = { videos: Number(vRes.rows[0]?.count || 0), grants: Number(gRes.rows[0]?.count || 0) };
        }
      }
      return courses;
    },
    async findUnique({ where, include }: { where: Record<string, unknown>; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "Course"${sql} LIMIT 1`, args });
      const course = res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
      if (course && include?.videos) {
        const vRes = await client.execute({ sql: `SELECT * FROM "Video" WHERE "courseId" = ? ORDER BY "sortOrder" ASC, "createdAt" ASC`, args: [course.id] });
        course.videos = vRes.rows.map(r => toCamel(r as Record<string, unknown>));
      }
      return course;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "Course" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
    async delete({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `DELETE FROM "Course"${sql}`, args });
    },
  },
  video: {
    async findUnique({ where, include }: { where: Record<string, unknown>; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "Video"${sql} LIMIT 1`, args });
      const video = res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
      if (video && include?.course) {
        const cRes = await client.execute({ sql: `SELECT * FROM "Course" WHERE "id" = ?`, args: [video.courseId] });
        video.course = toCamel(cRes.rows[0] as Record<string, unknown>);
      }
      if (video && include?.summaries) {
        const sRes = await client.execute({ sql: `SELECT * FROM "VideoSummary" WHERE "videoId" = ?`, args: [video.id] });
        video.summaries = sRes.rows.map(r => toCamel(r as Record<string, unknown>));
      }
      return video;
    },
    async findMany({ where, orderBy, include }: { where?: Record<string, unknown>; orderBy?: Record<string, string>; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where || {});
      const orderSql = orderBy ? ` ORDER BY ${Object.entries(orderBy).map(([k, v]) => `"${k}" ${v}`).join(", ")}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "Video"${sql}${orderSql}`, args });
      let videos = res.rows.map(r => toCamel(r as Record<string, unknown>));
      if (include?.course) {
        for (const v of videos) {
          const cRes = await client.execute({ sql: `SELECT "title", "color" FROM "Course" WHERE "id" = ?`, args: [v.courseId] });
          v.course = cRes.rows[0] ? toCamel(cRes.rows[0] as Record<string, unknown>) : null;
        }
      }
      return videos;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "Video"`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "Video" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
    async delete({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `DELETE FROM "Video"${sql}`, args });
    },
  },
  accessGrant: {
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "AccessGrant"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
    async findMany({ where, include }: { where?: Record<string, unknown>; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where || {});
      const res = await client.execute({ sql: `SELECT * FROM "AccessGrant"${sql}`, args });
      let grants = res.rows.map(r => toCamel(r as Record<string, unknown>));
      if (include?.course) {
        for (const g of grants) {
          const cRes = await client.execute({ sql: `SELECT * FROM "Course" WHERE "id" = ?`, args: [g.courseId] });
          const courseData = cRes.rows[0] ? toCamel(cRes.rows[0] as Record<string, unknown>) : null;
          if (courseData) {
            const vRes = await client.execute({ sql: `SELECT * FROM "Video" WHERE "courseId" = ? ORDER BY "sortOrder" ASC`, args: [g.courseId] });
            courseData.videos = vRes.rows.map(r => toCamel(r as Record<string, unknown>));
          }
          g.course = courseData;
        }
      }
      return grants;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "AccessGrant"`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async upsert({ where, update, create }: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }) {
      // Check if exists
      const { sql, args } = buildWhere(where);
      const existing = await client.execute({ sql: `SELECT * FROM "AccessGrant"${sql} LIMIT 1`, args });
      if (existing.rows.length > 0) {
        const setParts = Object.keys(update).map(k => `"${k}" = ?`).join(", ");
        const setArgs = Object.values(update);
        await client.execute({ sql: `UPDATE "AccessGrant" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
      } else {
        const keys = Object.keys(create).map(k => `"${k}"`).join(", ");
        const placeholders = Object.keys(create).map(() => "?").join(", ");
        const createArgs = Object.values(create);
        await client.execute({ sql: `INSERT INTO "AccessGrant" (${keys}) VALUES (${placeholders})`, args: createArgs });
      }
      return create;
    },
  },
  otpRequest: {
    async findUnique({ where, include }: { where: Record<string, unknown>; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "OtpRequest"${sql} LIMIT 1`, args });
      const otp = res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
      if (otp && include?.student) {
        const sRes = await client.execute({ sql: `SELECT * FROM "Student" WHERE "id" = ?`, args: [otp.studentId] });
        otp.student = toCamel(sRes.rows[0] as Record<string, unknown>);
      }
      return otp;
    },
    async findMany({ where, orderBy, take, include }: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; include?: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where || {});
      const orderSql = orderBy ? ` ORDER BY "${Object.keys(orderBy)[0]}" ${Object.values(orderBy)[0]}` : "";
      const limitSql = take ? ` LIMIT ${take}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "OtpRequest"${sql}${orderSql}${limitSql}`, args });
      let requests = res.rows.map(r => toCamel(r as Record<string, unknown>));
      if (include?.student) {
        for (const r of requests) {
          const sRes = await client.execute({ sql: `SELECT * FROM "Student" WHERE "id" = ?`, args: [r.studentId] });
          r.student = sRes.rows[0] ? toCamel(sRes.rows[0] as Record<string, unknown>) : null;
        }
      }
      return requests;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "OtpRequest"`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "OtpRequest" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
    async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const setParts = Object.keys(data).map(k => `"${k}" = ?`).join(", ");
      const setArgs = Object.values(data);
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `UPDATE "OtpRequest" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
      const res = await client.execute({ sql: `SELECT * FROM "OtpRequest"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
  },
  notification: {
    async findMany({ where, orderBy, take }: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number }) {
      const { sql, args } = buildWhere(where || {});
      const orderSql = orderBy ? ` ORDER BY "${Object.keys(orderBy)[0]}" ${Object.values(orderBy)[0]}` : "";
      const limitSql = take ? ` LIMIT ${take}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "Notification"${sql}${orderSql}${limitSql}`, args });
      const notifications = res.rows.map(r => toCamel(r as Record<string, unknown>));
      // Fetch student names
      for (const n of notifications) {
        if (n.studentId) {
          const sRes = await client.execute({ sql: `SELECT "name", "email" FROM "Student" WHERE "id" = ?`, args: [n.studentId] });
          n.student = sRes.rows[0] ? toCamel(sRes.rows[0] as Record<string, unknown>) : null;
        }
      }
      return notifications;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "Notification" WHERE "read" = 0`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "Notification" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const setParts = Object.keys(data).map(k => `"${k}" = ?`).join(", ");
      const setArgs = Object.values(data);
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `UPDATE "Notification" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
    },
  },
  activityLog: {
    async findMany({ orderBy, take }: { orderBy?: Record<string, string>; take?: number }) {
      const orderSql = orderBy ? ` ORDER BY "${Object.keys(orderBy)[0]}" ${Object.values(orderBy)[0]}` : "";
      const limitSql = take ? ` LIMIT ${take}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "ActivityLog"${orderSql}${limitSql}` });
      const logs = res.rows.map(r => toCamel(r as Record<string, unknown>));
      for (const l of logs) {
        if (l.studentId) {
          const sRes = await client.execute({ sql: `SELECT "name", "email" FROM "Student" WHERE "id" = ?`, args: [l.studentId] });
          l.student = sRes.rows[0] ? toCamel(sRes.rows[0] as Record<string, unknown>) : null;
        }
      }
      return logs;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "ActivityLog" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
  },
  violation: {
    async findMany({ orderBy, take }: { orderBy?: Record<string, string>; take?: number }) {
      const orderSql = orderBy ? ` ORDER BY "${Object.keys(orderBy)[0]}" ${Object.values(orderBy)[0]}` : "";
      const limitSql = take ? ` LIMIT ${take}` : "";
      const res = await client.execute({ sql: `SELECT * FROM "Violation"${orderSql}${limitSql}` });
      const violations = res.rows.map(r => toCamel(r as Record<string, unknown>));
      for (const v of violations) {
        if (v.studentId) {
          const sRes = await client.execute({ sql: `SELECT "name", "email" FROM "Student" WHERE "id" = ?`, args: [v.studentId] });
          v.student = sRes.rows[0] ? toCamel(sRes.rows[0] as Record<string, unknown>) : null;
        }
      }
      return violations;
    },
    async count() {
      const res = await client.execute(`SELECT COUNT(*) as count FROM "Violation"`);
      return Number((res.rows[0] as Record<string, unknown>).count);
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await client.execute({ sql: `INSERT INTO "Violation" (${keys}) VALUES (${placeholders})`, args });
      return data;
    },
  },
  videoSummary: {
    async findUnique({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "VideoSummary"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    },
    async upsert({ where, update, create }: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const existing = await client.execute({ sql: `SELECT * FROM "VideoSummary"${sql} LIMIT 1`, args });
      if (existing.rows.length > 0) {
        const setParts = Object.keys(update).map(k => `"${k}" = ?`).join(", ");
        const setArgs = Object.values(update);
        await client.execute({ sql: `UPDATE "VideoSummary" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
      } else {
        const keys = Object.keys(create).map(k => `"${k}"`).join(", ");
        const placeholders = Object.keys(create).map(() => "?").join(", ");
        const createArgs = Object.values(create);
        await client.execute({ sql: `INSERT INTO "VideoSummary" (${keys}) VALUES (${placeholders})`, args: createArgs });
      }
      return create;
    },
  },
  chatMessage: {
    async findMany({ where, orderBy, take, select }: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; select?: Record<string, boolean> }) {
      const selectSql = select ? Object.keys(select).map(k => `"${k}"`).join(", ") : "*";
      const { sql, args } = buildWhere(where || {});
      const orderSql = orderBy ? ` ORDER BY ${Object.entries(orderBy).map(([k, v]) => `"${k}" ${v}`).join(", ")}` : "";
      const limitSql = take ? ` LIMIT ${take}` : "";
      const res = await client.execute({ sql: `SELECT ${selectSql} FROM "ChatMessage"${sql}${orderSql}${limitSql}`, args });
      return res.rows.map(r => toCamel(r as Record<string, unknown>));
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      const res = await client.execute({ sql: `INSERT INTO "ChatMessage" (${keys}) VALUES (${placeholders}) RETURNING *`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : data;
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `DELETE FROM "ChatMessage"${sql}`, args });
    },
  },
  watchProgress: {
    async findMany({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "WatchProgress"${sql}`, args });
      return res.rows.map(r => toCamel(r as Record<string, unknown>));
    },
    async upsert({ where, update, create }: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const existing = await client.execute({ sql: `SELECT * FROM "WatchProgress"${sql} LIMIT 1`, args });
      if (existing.rows.length > 0) {
        const setParts = Object.keys(update).map(k => `"${k}" = ?`).join(", ");
        const setArgs = Object.values(update);
        await client.execute({ sql: `UPDATE "WatchProgress" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
      } else {
        const keys = Object.keys(create).map(k => `"${k}"`).join(", ");
        const placeholders = Object.keys(create).map(() => "?").join(", ");
        const createArgs = Object.values(create);
        await client.execute({ sql: `INSERT INTO "WatchProgress" (${keys}) VALUES (${placeholders})`, args: createArgs });
      }
      return create;
    },
  },
  videoNote: {
    async findMany({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      const res = await client.execute({ sql: `SELECT * FROM "VideoNote"${sql}`, args });
      return res.rows.map(r => toCamel(r as Record<string, unknown>));
    },
    async create({ data }: { data: Record<string, unknown> }) {
      if (!data.id) data.id = generateId(); addTimestamps(data);
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      const res = await client.execute({ sql: `INSERT INTO "VideoNote" (${keys}) VALUES (${placeholders}) RETURNING *`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : data;
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `DELETE FROM "VideoNote"${sql}`, args });
    },
  },
  // Raw SQL execution for schema creation.
  $executeRawUnsafe: async (sql: string) => {
    await client.execute(sql);
  },
  $disconnect: async () => {
    client.close();
  },
};

export type DB = typeof db;
