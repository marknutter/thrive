export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { getProfile, getProfileCompleteness, setProfileField, PROFILE_FIELDS } from "@/lib/business-profile";
import { checkAutoMilestones } from "@/lib/milestones";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const profile = getProfile(session.user.id);
    const completeness = getProfileCompleteness(session.user.id);

    return NextResponse.json({ profile, completeness });
  } catch (error) {
    log.error("Failed to fetch business profile", { error: String(error) });
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const { field_key, field_value } = await request.json();
    if (!field_key || !field_value) {
      throw new BadRequestError("field_key and field_value are required");
    }

    setProfileField(session.user.id, field_key, field_value);

    // Check if any auto milestones should complete
    const newlyCompleted = checkAutoMilestones(session.user.id);

    return NextResponse.json({
      success: true,
      field_key,
      newlyCompletedMilestones: newlyCompleted,
    });
  } catch (error) {
    log.error("Failed to update business profile", { error: String(error) });
    return errorResponse(error);
  }
}
