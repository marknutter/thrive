import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getDb, getSqliteDb } from "@/lib/db";
import { user, planOverrides } from "@/lib/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body: { plan: string; reason: string; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { plan, reason, expiresAt } = body;

  if (!plan || typeof plan !== "string") {
    return NextResponse.json({ error: "plan is required" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string") {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const db = getDb();

  const existingUser = db.select({ id: user.id }).from(user).where(eq(user.id, id)).get();
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const adminId = session.user.id;

  // ON CONFLICT upsert — use raw for SQLite-specific syntax
  getSqliteDb().prepare(`
    INSERT INTO plan_overrides (user_id, plan, reason, granted_by, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      plan = excluded.plan,
      reason = excluded.reason,
      granted_by = excluded.granted_by,
      expires_at = excluded.expires_at,
      created_at = CURRENT_TIMESTAMP
  `).run(id, plan, reason, adminId, expiresAt ?? null);

  logAdminAction(adminId, "plan_override", "user", id, { plan, reason, expiresAt });

  return NextResponse.json({ data: { success: true, plan, reason, expiresAt } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const result = getDb()
    .delete(planOverrides)
    .where(eq(planOverrides.user_id, id))
    .run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "No override found for this user" }, { status: 404 });
  }

  const adminId = session.user.id;
  logAdminAction(adminId, "plan_override_removed", "user", id);

  return NextResponse.json({ data: { success: true } });
}
