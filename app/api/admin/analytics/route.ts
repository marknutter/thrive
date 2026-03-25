import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getRawDb } from "@/lib/db";

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  planBreakdown: { free: number; pro: number };
  totalItems: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  type: "signup" | "admin_action";
  description: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const db = getRawDb();

  // Total users
  const { totalUsers } = db.prepare("SELECT COUNT(*) AS totalUsers FROM user").get() as {
    totalUsers: number;
  };

  // Active users: users who have items created in the last 30 days
  const { activeUsers } = db
    .prepare(
      `SELECT COUNT(DISTINCT user_id) AS activeUsers
       FROM items
       WHERE created_at >= datetime('now', '-30 days')`
    )
    .get() as { activeUsers: number };

  // Plan breakdown: check plan_overrides for effective plan
  const planRows = db
    .prepare(
      `SELECT
         CASE WHEN po.plan IS NOT NULL THEN po.plan ELSE COALESCE(u.plan, 'free') END AS effective_plan,
         COUNT(*) AS cnt
       FROM user u
       LEFT JOIN plan_overrides po
         ON po.user_id = u.id
         AND (po.expires_at IS NULL OR po.expires_at > datetime('now'))
       GROUP BY effective_plan`
    )
    .all() as { effective_plan: string; cnt: number }[];

  const planBreakdown = { free: 0, pro: 0 };
  for (const row of planRows) {
    if (row.effective_plan === "pro") {
      planBreakdown.pro += row.cnt;
    } else {
      planBreakdown.free += row.cnt;
    }
  }

  // Total items
  const { totalItems } = db
    .prepare("SELECT COUNT(*) AS totalItems FROM items")
    .get() as { totalItems: number };

  // Recent activity: last 20 entries combining signups and admin logs
  const recentSignups = db
    .prepare(
      `SELECT email, createdAt
       FROM user
       WHERE createdAt >= unixepoch('now', '-7 days') * 1000
       ORDER BY createdAt DESC
       LIMIT 20`
    )
    .all() as { email: string; createdAt: number }[];

  const recentAdminActions = db
    .prepare(
      `SELECT al.action, al.target_type, al.target_id, al.created_at, u.email AS admin_email
       FROM admin_logs al
       LEFT JOIN user u ON u.id = al.admin_id
       ORDER BY al.created_at DESC
       LIMIT 20`
    )
    .all() as {
    action: string;
    target_type: string | null;
    target_id: string | null;
    created_at: string;
    admin_email: string | null;
  }[];

  // Combine and sort by timestamp
  const activityItems: ActivityItem[] = [
    ...recentSignups.map((row) => ({
      type: "signup" as const,
      description: `New user signed up: ${row.email}`,
      timestamp: new Date(row.createdAt).toISOString(),
    })),
    ...recentAdminActions.map((row) => ({
      type: "admin_action" as const,
      description: `${row.admin_email ?? "Admin"} performed ${row.action}${
        row.target_type ? ` on ${row.target_type}${row.target_id ? ` #${row.target_id}` : ""}` : ""
      }`,
      timestamp: row.created_at,
    })),
  ];

  activityItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recentActivity = activityItems.slice(0, 20);

  const data: AnalyticsData = {
    totalUsers,
    activeUsers,
    planBreakdown,
    totalItems,
    recentActivity,
  };

  return NextResponse.json({ data });
}
