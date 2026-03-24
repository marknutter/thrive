import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError, BadRequestError, errorResponse } from "@/lib/errors";
import { searchItems } from "@/lib/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError();

    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    if (!q) throw new BadRequestError("Query parameter 'q' is required");

    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const results = searchItems(session.user.id, q, limit);

    return NextResponse.json({ results, query: q });
  } catch (error) {
    return errorResponse(error);
  }
}
