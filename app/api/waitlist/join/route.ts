import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSqliteDb } from "@/lib/db";
import { BadRequestError, ConflictError, errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const referralCode = (body.referralCode ?? "").trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError("A valid email address is required");
    }

    const db = getSqliteDb();

    // Check if already on waitlist
    const existing = db.prepare("SELECT id, referral_code FROM waitlist WHERE email = ?").get(email) as
      | { id: number; referral_code: string }
      | undefined;

    if (existing) {
      // Return their existing position and referral code
      const position = db.prepare(
        "SELECT COUNT(*) as pos FROM waitlist WHERE id <= ? AND status = 'waiting'"
      ).get(existing.id) as { pos: number };

      return NextResponse.json({
        message: "You're already on the waitlist",
        position: position.pos,
        referralCode: existing.referral_code,
      });
    }

    // Generate a unique referral code for this user
    const newReferralCode = crypto.randomBytes(6).toString("hex");

    // Validate referral code if provided
    if (referralCode) {
      const referrer = db.prepare("SELECT id FROM waitlist WHERE referral_code = ?").get(referralCode) as
        | { id: number }
        | undefined;
      if (!referrer) {
        throw new BadRequestError("Invalid referral code");
      }
    }

    // Insert into waitlist
    const result = db.prepare(
      "INSERT INTO waitlist (email, referral_code, referred_by) VALUES (?, ?, ?)"
    ).run(email, newReferralCode, referralCode);

    // Credit the referrer
    if (referralCode) {
      db.prepare(
        "UPDATE waitlist SET referral_count = referral_count + 1 WHERE referral_code = ?"
      ).run(referralCode);
    }

    // Calculate position (waiting entries before this one)
    const position = db.prepare(
      "SELECT COUNT(*) as pos FROM waitlist WHERE id <= ? AND status = 'waiting'"
    ).get(result.lastInsertRowid) as { pos: number };

    return NextResponse.json({
      message: "You've been added to the waitlist!",
      position: position.pos,
      referralCode: newReferralCode,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError || error instanceof BadRequestError) {
      return errorResponse(error);
    }
    return errorResponse(error);
  }
}
