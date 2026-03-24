export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import {
  generateStateToken,
  getConnectAuthorizeUrl,
} from "@/lib/stripe-connect";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const state = generateStateToken(session.user.id);
    const url = getConnectAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error);
  }
}
