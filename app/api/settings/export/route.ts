import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRawDb as getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();

  const user = db
    .prepare("SELECT id, email, emailVerified, createdAt, plan FROM user WHERE id = ?")
    .get(session.user.id) as Record<string, unknown> | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const items = db
    .prepare("SELECT id, name, description, created_at FROM items WHERE user_id = ? ORDER BY created_at ASC")
    .all(session.user.id);

  const exportData = {
    account: {
      email: user.email,
      emailVerified: !!user.emailVerified,
      plan: user.plan || "free",
      createdAt: user.createdAt,
    },
    items,
    exportedAt: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="thrive-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
