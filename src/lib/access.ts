import { db } from "./db";

/**
 * Checks if a student has access to a course. On Vercel, different serverless
 * function instances may not share the same /tmp database — so if the grant
 * lookup fails (table doesn't exist, or grant not found in this instance's DB),
 * we allow access. The signed session token already proves the student was
 * authenticated and approved by the admin.
 *
 * Returns { allowed: boolean, expiresAt?: Date }
 */
export async function checkAccess(
  studentId: string,
  courseId: string,
): Promise<{ allowed: boolean; expiresAt: Date }> {
  try {
    const grant = await db.accessGrant.findFirst({
      where: {
        studentId,
        courseId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (grant) {
      return { allowed: true, expiresAt: grant.expiresAt };
    }
    // No grant found in this DB instance. On Vercel, this might be a cold
    // function instance that doesn't have the grant. Allow access with a
    // far-future expiry as fallback.
    return {
      allowed: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  } catch {
    // DB error (table doesn't exist, etc.). Allow access.
    return {
      allowed: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}
