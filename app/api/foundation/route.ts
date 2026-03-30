export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import { generateFoundation, saveFoundation, getFoundation } from "@/lib/foundation";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const userId = session.user.id;

    // Return saved doc, or generate on-the-fly if none saved
    let doc = getFoundation(userId);
    if (!doc) {
      doc = generateFoundation(userId);
    }

    return NextResponse.json(doc);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const userId = session.user.id;

    // Regenerate and save
    const doc = generateFoundation(userId);
    saveFoundation(userId, doc);

    return NextResponse.json(doc);
  } catch (error) {
    return errorResponse(error);
  }
}
