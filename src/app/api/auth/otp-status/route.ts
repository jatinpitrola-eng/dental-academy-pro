import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/auto-seed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });
  const otp = await db.otpRequest.findUnique({
    where: { id },
    select: { status: true, expiresAt: true },
  });
  if (!otp)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  let status = otp.status;
  if (status === "pending" && otp.expiresAt < new Date()) status = "expired";
  return NextResponse.json({ status });
}
