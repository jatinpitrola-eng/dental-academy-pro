import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Lightweight status check used by the student OTP screen to know when the
// admin has approved (without exposing the code).
export async function GET(req: NextRequest) {
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
