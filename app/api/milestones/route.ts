export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import {
  getMilestones,
  getMilestoneProgress,
  completeMilestone,
  isValidMilestoneKey,
  MILESTONES,
} from "@/lib/milestones";

// ---------------------------------------------------------------------------
// GET - Return all milestones with status + progress stats
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const milestones = getMilestones(session.user.id);
    const progress = getMilestoneProgress(session.user.id);

    return NextResponse.json({ milestones, progress });
  } catch (error) {
    log.error("Failed to fetch milestones", { error: String(error) });
    return errorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST - Manual milestone completion
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const body = await request.json();
    const { milestone_key, status } = body;

    if (!milestone_key || !status) {
      throw new BadRequestError("milestone_key and status are required");
    }

    if (!isValidMilestoneKey(milestone_key)) {
      throw new BadRequestError(
        `Invalid milestone_key: ${milestone_key}. Valid keys: ${MILESTONES.map((m) => m.key).join(", ")}`
      );
    }

    // Only allow manual-type milestones to be updated via this endpoint
    const milestone = MILESTONES.find((m) => m.key === milestone_key);
    if (milestone?.type === "auto") {
      throw new BadRequestError(
        `Cannot manually update auto milestone: ${milestone_key}. Auto milestones complete when profile fields are extracted.`
      );
    }

    if (status !== "completed" && status !== "pending") {
      throw new BadRequestError("Status must be 'completed' or 'pending'");
    }

    if (status === "completed") {
      completeMilestone(session.user.id, milestone_key);
    } else {
      // Reset to pending
      const { getRawDb } = await import("@/lib/db");
      const db = getRawDb();
      db.prepare(
        `UPDATE coaching_milestones SET status = 'pending', completed_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND milestone_key = ?`
      ).run(session.user.id, milestone_key);
    }

    const progress = getMilestoneProgress(session.user.id);

    return NextResponse.json({ success: true, milestone_key, status, progress });
  } catch (error) {
    log.error("Failed to update milestone", { error: String(error) });
    return errorResponse(error);
  }
}
