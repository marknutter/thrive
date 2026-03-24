import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getDb, getSqliteDb } from "@/lib/db";
import { user } from "@/lib/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomBytes } from "crypto";

const APP_URL = process.env.APP_URL || "https://YOUR_DOMAIN";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const row = getDb()
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, id))
    .get();

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Generate a reset token and store it in Better Auth's verification table
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600_000).toISOString(); // 1 hour

    // Use raw DB for verification table insert (Better Auth managed table with specific format)
    getSqliteDb().prepare(
      `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(
      randomBytes(16).toString("hex"),
      `reset-password:${row.email}`,
      token,
      expiresAt
    );

    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(row.email, resetUrl);
  } catch (err) {
    console.error("[admin] Failed to send password reset email:", err);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }

  const adminId = session.user.id;
  logAdminAction(adminId, "password_reset_sent", "user", id);

  return NextResponse.json({ data: { success: true } });
}
