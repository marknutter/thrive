export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import {
  getProgress,
  updateStep,
  getCompletionPercentage,
  LAUNCH_STEPS,
  isValidStepKey,
  isValidStatus,
} from "@/lib/onboarding";

// ---------------------------------------------------------------------------
// GET - Return onboarding progress (always real data, even in demo mode)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const steps = getProgress(session.user.id);
    const completion = getCompletionPercentage(session.user.id);

    return NextResponse.json({ steps, completion });
  } catch (error) {
    log.error("Failed to fetch onboarding progress", { error: String(error) });
    return errorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST - Update a step
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const body = await request.json();
    const { step_key, status, notes } = body;

    if (!step_key || !status) {
      throw new BadRequestError("step_key and status are required");
    }

    if (!isValidStepKey(step_key)) {
      throw new BadRequestError(`Invalid step_key: ${step_key}. Valid keys: ${LAUNCH_STEPS.map((s) => s.key).join(", ")}`);
    }

    if (!isValidStatus(status)) {
      throw new BadRequestError(`Invalid status: ${status}. Valid statuses: pending, in_progress, completed, skipped`);
    }

    // Always persist onboarding progress, even in demo mode
    updateStep(session.user.id, step_key, status, notes);

    const completion = getCompletionPercentage(session.user.id);

    return NextResponse.json({ success: true, step_key, status, completion });
  } catch (error) {
    log.error("Failed to update onboarding step", { error: String(error) });
    return errorResponse(error);
  }
}
