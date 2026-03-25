import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRawDb as getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { confirmation } = await request.json();

    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Please type "DELETE" to confirm account deletion' },
        { status: 400 }
      );
    }

    const db = getDb();
    const userId = session.user.id;

    // Delete in order respecting foreign keys
    db.prepare("DELETE FROM items WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM twoFactor WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM session WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM account WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM verification WHERE identifier = ?").run(session.user.email);
    db.prepare("DELETE FROM user WHERE id = ?").run(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
