import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getSqliteDb } from "@/lib/db";
import { BadRequestError, errorResponse } from "@/lib/errors";
import { sendWaitlistInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const emails: string[] = (body.emails ?? []).map((e: string) => e.trim().toLowerCase()).filter(Boolean);

    if (emails.length === 0) {
      throw new BadRequestError("At least one email address is required");
    }

    if (emails.length > 100) {
      throw new BadRequestError("Maximum 100 invites per batch");
    }

    const db = getSqliteDb();
    const results: Array<{ email: string; code: string; status: string }> = [];

    const insertInvite = db.prepare(
      "INSERT INTO invite_codes (code, email, created_by) VALUES (?, ?, ?)"
    );
    const updateWaitlist = db.prepare(
      "UPDATE waitlist SET status = 'invited', invited_at = datetime('now') WHERE email = ? AND status = 'waiting'"
    );

    for (const email of emails) {
      const code = crypto.randomBytes(8).toString("hex");

      try {
        insertInvite.run(code, email, session.user.id);
        updateWaitlist.run(email);

        // Send invite email (fire-and-forget)
        sendWaitlistInviteEmail(email, code).catch((err) => {
          console.error(`[waitlist] Failed to send invite email to ${email}:`, err);
        });

        results.push({ email, code, status: "sent" });
      } catch (err) {
        results.push({ email, code: "", status: `failed: ${(err as Error).message}` });
      }
    }

    logAdminAction(
      session.user.id,
      "waitlist.invite",
      "waitlist",
      undefined,
      { count: results.filter((r) => r.status === "sent").length, emails }
    );

    return NextResponse.json({
      results,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status !== "sent").length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
