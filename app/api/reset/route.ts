export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRawDb } from "@/lib/db";
import { log } from "@/lib/logger";
import { UnauthorizedError, errorResponse } from "@/lib/errors";

// ---------------------------------------------------------------------------
// POST - Reset coaching data (conversations, messages, profile, milestones)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const userId = session.user.id;
    const db = getRawDb();

    // Delete messages for this user's conversations
    db.prepare(
      `DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE user_id = ?
      )`
    ).run(userId);

    // Delete conversations
    db.prepare("DELETE FROM conversations WHERE user_id = ?").run(userId);

    // Reset business profile
    db.prepare("DELETE FROM business_profiles WHERE user_id = ?").run(userId);

    // Reset coaching milestones to pending
    db.prepare(
      "UPDATE coaching_milestones SET status = 'pending', completed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).run(userId);

    log.info("User reset coaching data", { userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to reset coaching data", { error: String(error) });
    return errorResponse(error);
  }
}
