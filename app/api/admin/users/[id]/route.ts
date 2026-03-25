import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, getEffectivePlan } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { user, planOverrides, items } from "@/lib/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  void session;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const db = getDb();

  const row = db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      override_plan: planOverrides.plan,
      override_reason: planOverrides.reason,
      override_expires_at: planOverrides.expires_at,
      override_created_at: planOverrides.created_at,
      override_granted_by: planOverrides.granted_by,
      items_count: sql<number>`(SELECT COUNT(*) FROM items i WHERE i.user_id = ${user.id})`,
    })
    .from(user)
    .leftJoin(planOverrides, eq(planOverrides.user_id, user.id))
    .where(eq(user.id, id))
    .get();

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const effective = getEffectivePlan(id);

  return NextResponse.json({
    data: {
      id: row.id,
      email: row.email,
      name: row.name,
      plan: row.plan,
      effectivePlan: effective.plan,
      createdAt: row.createdAt,
      isAdmin: row.isAdmin === 1,
      subscriptionStatus: row.subscriptionStatus,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      emailVerified: row.emailVerified === 1,
      disabled: row.disabled === 1,
      planOverride: row.override_plan
        ? {
            plan: row.override_plan,
            reason: row.override_reason,
            expiresAt: row.override_expires_at,
            createdAt: row.override_created_at,
            grantedBy: row.override_granted_by,
            active: effective.override,
          }
        : null,
      itemsCount: row.items_count,
    },
  });
}
