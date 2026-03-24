import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { createWebhook, getWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const webhooks = getWebhooks(session.user.id);
    // Strip secrets from response
    const safe = webhooks.map(({ secret: _secret, ...rest }) => rest);

    return NextResponse.json({ webhooks: safe });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const { url, events } = await request.json();
    if (!url || typeof url !== "string") throw new BadRequestError("URL is required");

    try {
      new URL(url);
    } catch {
      throw new BadRequestError("Invalid URL");
    }

    if (!url.startsWith("https://") && !url.startsWith("http://localhost")) {
      throw new BadRequestError("Webhook URL must use HTTPS");
    }

    const webhook = createWebhook(
      session.user.id,
      url,
      Array.isArray(events) ? events : [],
    );

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
