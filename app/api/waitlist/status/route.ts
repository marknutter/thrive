import { NextRequest, NextResponse } from "next/server";
import { getSqliteDb } from "@/lib/db";
import { BadRequestError, errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") ?? "").trim().toLowerCase();

    if (!email) {
      throw new BadRequestError("Email is required");
    }

    const db = getSqliteDb();

    const entry = db.prepare(
      "SELECT id, referral_code, referral_count, status, created_at FROM waitlist WHERE email = ?"
    ).get(email) as
      | { id: number; referral_code: string; referral_count: number; status: string; created_at: string }
      | undefined;

    if (!entry) {
      return NextResponse.json({ onWaitlist: false });
    }

    const position = db.prepare(
      "SELECT COUNT(*) as pos FROM waitlist WHERE id <= ? AND status = 'waiting'"
    ).get(entry.id) as { pos: number };

    const totalWaiting = db.prepare(
      "SELECT COUNT(*) as total FROM waitlist WHERE status = 'waiting'"
    ).get() as { total: number };

    return NextResponse.json({
      onWaitlist: true,
      position: entry.status === "waiting" ? position.pos : null,
      totalWaiting: totalWaiting.total,
      referralCode: entry.referral_code,
      referralCount: entry.referral_count,
      status: entry.status,
      joinedAt: entry.created_at,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
