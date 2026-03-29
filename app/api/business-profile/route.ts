export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import { getProfile, getProfileCompleteness } from "@/lib/business-profile";

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
