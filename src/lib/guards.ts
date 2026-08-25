import { NextRequest } from "next/server";
import { getAdminSession } from "./auth";

export async function requireAdmin(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session || session.kind !== "admin") return null;
  return session;
}
