import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();

  const user = db
    .prepare("SELECT id, email, emailVerified, createdAt FROM user WHERE id = ?")
    .get(session.user.id) as
    | { id: string; email: string; emailVerified: number | null; createdAt: string }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const account = db
    .prepare("SELECT providerId FROM account WHERE userId = ? LIMIT 1")
    .get(session.user.id) as { providerId: string } | undefined;

  return NextResponse.json({
    email: user.email,
    provider: account?.providerId || "credential",
    emailVerified: !!user.emailVerified,
    createdAt: user.createdAt,
  });
}
