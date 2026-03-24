import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, BadRequestError, errorResponse } from "@/lib/errors";
import { getWebhook, updateWebhook, deleteWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const { id } = await params;
    const webhook = getWebhook(session.user.id, id);
    if (!webhook) throw new NotFoundError("Webhook not found");

    // Strip secret from response
    const { secret, ...safe } = webhook;
    return NextResponse.json({ webhook: safe });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json();

    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        throw new BadRequestError("Invalid URL");
      }
    }

    const updated = updateWebhook(session.user.id, id, body);
    if (!updated) throw new NotFoundError("Webhook not found");

    const webhook = getWebhook(session.user.id, id);
    const { secret, ...safe } = webhook!;
    return NextResponse.json({ webhook: safe });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const { id } = await params;
    const deleted = deleteWebhook(session.user.id, id);
    if (!deleted) throw new NotFoundError("Webhook not found");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
