export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { isDemoMode } from "@/lib/demo-data";
import {
  getProgress,
  updateStep,
  getCompletionPercentage,
  LAUNCH_STEPS,
  isValidStepKey,
  isValidStatus,
} from "@/lib/onboarding";
import type { StepProgress, StepStatus } from "@/lib/onboarding";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

function getDemoProgress(): StepProgress[] {
  return LAUNCH_STEPS.map((step) => {
    const isStripe = step.key === "connect_stripe";
    return {
      key: step.key,
      label: step.label,
      description: step.description,
      order: step.order,
      status: (isStripe ? "in_progress" : "completed") as StepStatus,
      notes: null,
      completedAt: isStripe ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// GET - Return onboarding progress
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    if (isDemoMode()) {
      const steps = getDemoProgress();
      const completed = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
      return NextResponse.json({
        steps,
        completion: {
          completed,
          total: steps.length,
          percentage: Math.round((completed / steps.length) * 100),
        },
      });
    }

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

    if (isDemoMode()) {
      // In demo mode, accept but don't persist
      return NextResponse.json({ success: true, step_key, status });
    }

    updateStep(session.user.id, step_key, status, notes);

    const completion = getCompletionPercentage(session.user.id);

    return NextResponse.json({ success: true, step_key, status, completion });
  } catch (error) {
    log.error("Failed to update onboarding step", { error: String(error) });
    return errorResponse(error);
  }
}
