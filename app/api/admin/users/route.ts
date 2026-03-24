import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSqliteDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  void session;

  // Dynamic WHERE with COALESCE/CASE WHEN — stays raw for readability
  const db = getSqliteDb();
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = page * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push("LOWER(u.email) LIKE ?");
    const term = `%${search.toLowerCase()}%`;
    params.push(term);
  }

  if (plan && plan !== "all") {
    if (plan === "override") {
      conditions.push("po.plan IS NOT NULL AND (po.expires_at IS NULL OR po.expires_at > datetime('now'))");
    } else {
      conditions.push("(COALESCE(CASE WHEN po.expires_at IS NULL OR po.expires_at > datetime('now') THEN po.plan END, u.plan)) = ?");
      params.push(plan);
    }
  }

  if (status === "disabled") {
    conditions.push("u.disabled = 1");
  } else if (status === "active") {
    conditions.push("(u.disabled IS NULL OR u.disabled = 0)");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM user u
    LEFT JOIN plan_overrides po
      ON po.user_id = u.id
    ${where}
  `).get(...params) as { total: number };

  const users = db.prepare(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.plan,
      u.createdAt,
      u.isAdmin,
      u.subscriptionStatus,
      u.disabled,
      po.plan AS override_plan,
      po.expires_at AS override_expires_at
    FROM user u
    LEFT JOIN plan_overrides po
      ON po.user_id = u.id
    ${where}
    ORDER BY u.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<{
    id: string;
    email: string;
    name: string | null;
    plan: string;
    createdAt: number;
    isAdmin: number;
    subscriptionStatus: string;
    disabled: number | null;
    override_plan: string | null;
    override_expires_at: string | null;
  }>;

  const data = users.map((u) => {
    const hasActiveOverride =
      u.override_plan != null &&
      (u.override_expires_at == null || new Date(u.override_expires_at) > new Date());
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      effectivePlan: hasActiveOverride ? u.override_plan : u.plan,
      hasOverride: hasActiveOverride,
      createdAt: u.createdAt,
      isAdmin: u.isAdmin === 1,
      subscriptionStatus: u.subscriptionStatus,
      disabled: u.disabled === 1,
    };
  });

  return NextResponse.json({
    data,
    total: countRow.total,
    page,
    limit,
    pages: Math.ceil(countRow.total / limit),
  });
}
