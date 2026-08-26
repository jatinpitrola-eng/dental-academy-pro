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

// Add createdAt/updatedAt to data if not present. If the table doesn't have
// updatedAt, the insert will fail and the calling code should handle it.
function addTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const now = new Date().toISOString();
  if (!data.createdAt) data.createdAt = now;
  if (!data.updatedAt) data.updatedAt = now;
  return data;
}

// Execute an insert. If it fails due to a missing column (updatedAt/createdAt),
// retry without that column. Returns the inserted row if RETURNING is supported.
async function safeInsert(table: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  // Ensure data has an id — many tables require it.
  if (!data.id) data.id = generateId();
  addTimestamps(data);
  const tryInsert = async (d: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    const keys = Object.keys(d).map(k => `"${k}"`).join(", ");
    const placeholders = Object.keys(d).map(() => "?").join(", ");
    const args = Object.values(d);
    try {
      const res = await client.execute({ sql: `INSERT INTO "${table}" (${keys}) VALUES (${placeholders}) RETURNING *`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
    } catch (e) {
      const err = e as Error;
      if (err.message.includes("updatedAt")) {
        const filtered = { ...d };
        delete filtered.updatedAt;
        return tryInsert(filtered);
      }
      if (err.message.includes("createdAt")) {
        const filtered = { ...d };
        delete filtered.createdAt;
        return tryInsert(filtered);
      }
      throw e;
    }
  };
  return tryInsert(data);
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
    // Handle compound keys (e.g., studentId_courseId: { studentId, courseId }).
    if (k.includes("_") && typeof v === "object" && v !== null && !Array.isArray(v)) {
      const compound = v as Record<string, unknown>;
      const isCompoundKey = Object.keys(compound).every(
        (ck) => typeof compound[ck] === "string" || typeof compound[ck] === "number",
      );
      if (isCompoundKey) {
        for (const [ck, cv] of Object.entries(compound)) {
          parts.push(`"${ck}" = ?`);
          args.push(cv);
        }
        continue;
      }
    }
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("Admin", data);
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
      const orderParts = Array.isArray(orderBy) ? orderBy.map((o: Record<string, string>) => Object.entries(o).map(([k, v]) => `\"${k}\" ${v}`).join(", ")).join(", ") : (orderBy ? Object.entries(orderBy).map(([k, v]) => `\"${k}\" ${v}`).join(", ") : ""); const orderSql = orderParts ? ` ORDER BY ${orderParts}` : "";
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("Student", data);
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
      const orderParts = Array.isArray(orderBy) ? orderBy.map((o: Record<string, string>) => Object.entries(o).map(([k, v]) => `\"${k}\" ${v}`).join(", ")).join(", ") : (orderBy ? Object.entries(orderBy).map(([k, v]) => `\"${k}\" ${v}`).join(", ") : ""); const orderSql = orderParts ? ` ORDER BY ${orderParts}` : "";
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("Course", data);
      return data;
    },
    async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const setParts = Object.keys(data).map(k => `"${k}" = ?`).join(", ");
      const setArgs = Object.values(data);
      const { sql, args } = buildWhere(where);
      await client.execute({ sql: `UPDATE "Course" SET ${setParts}${sql}`, args: [...setArgs, ...args] });
      const res = await client.execute({ sql: `SELECT * FROM "Course"${sql} LIMIT 1`, args });
      return res.rows[0] ? toCamel(res.rows[0] as Record<string, unknown>) : null;
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("Video", data);
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
      // Handle compound key (studentId_courseId) — split into individual columns.
      let whereParts: string[] = [];
      let whereArgs: unknown[] = [];
      for (const [k, v] of Object.entries(where)) {
        if (k.includes("_") && typeof v === "object" && v !== null) {
          const compound = v as Record<string, unknown>;
          for (const [ck, cv] of Object.entries(compound)) {
            whereParts.push(`"${ck}" = ?`);
            whereArgs.push(cv);
          }
        } else if (v !== null && v !== undefined) {
          whereParts.push(`"${k}" = ?`);
          whereArgs.push(v);
        }
      }
      const whereSql = whereParts.length > 0 ? " WHERE " + whereParts.join(" AND ") : "";
      const existing = await client.execute({ sql: `SELECT * FROM "AccessGrant"${whereSql} LIMIT 1`, args: whereArgs }).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        const setParts = Object.keys(update).map(k => `"${k}" = ?`).join(", ");
        const setArgs = Object.values(update);
        await client.execute({ sql: `UPDATE "AccessGrant" SET ${setParts}${whereSql}`, args: [...setArgs, ...whereArgs] }).catch(() => {});
      } else {
        await safeInsert("AccessGrant", create);
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
      const orderParts = Array.isArray(orderBy) ? orderBy.map((o: Record<string, string>) => Object.entries(o).map(([k, v]) => `\"${k}\" ${v}`).join(", ")).join(", ") : (orderBy ? Object.entries(orderBy).map(([k, v]) => `\"${k}\" ${v}`).join(", ") : ""); const orderSql = orderParts ? ` ORDER BY ${orderParts}` : "";
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("OtpRequest", data);
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
      const orderParts = Array.isArray(orderBy) ? orderBy.map((o: Record<string, string>) => Object.entries(o).map(([k, v]) => `\"${k}\" ${v}`).join(", ")).join(", ") : (orderBy ? Object.entries(orderBy).map(([k, v]) => `\"${k}\" ${v}`).join(", ") : ""); const orderSql = orderParts ? ` ORDER BY ${orderParts}` : "";
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("Notification", data);
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
      const orderParts = Array.isArray(orderBy) ? orderBy.map((o: Record<string, string>) => Object.entries(o).map(([k, v]) => `\"${k}\" ${v}`).join(", ")).join(", ") : (orderBy ? Object.entries(orderBy).map(([k, v]) => `\"${k}\" ${v}`).join(", ") : ""); const orderSql = orderParts ? ` ORDER BY ${orderParts}` : "";
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("ActivityLog", data);
      return data;
    },
  },
  violation: {
    async findMany({ orderBy, take }: { orderBy?: Record<string, string>; take?: number }) {
      const orderParts = Array.isArray(orderBy) ? orderBy.map((o: Record<string, string>) => Object.entries(o).map(([k, v]) => `\"${k}\" ${v}`).join(", ")).join(", ") : (orderBy ? Object.entries(orderBy).map(([k, v]) => `\"${k}\" ${v}`).join(", ") : ""); const orderSql = orderParts ? ` ORDER BY ${orderParts}` : "";
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      await safeInsert("Violation", data);
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
        await safeInsert("VideoSummary", create);
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      const result = await safeInsert("ChatMessage", data);
      return result || data;
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
        await safeInsert("WatchProgress", create);
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
      
      const keys = Object.keys(data).map(k => `"${k}"`).join(", ");
      const placeholders = Object.keys(data).map(() => "?").join(", ");
      const args = Object.values(data);
      const result = await safeInsert("VideoNote", data);
      return result || data;
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
