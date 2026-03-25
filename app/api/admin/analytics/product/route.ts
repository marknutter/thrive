import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getRawDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const db = getRawDb();

  // Users with at least 1 item
  const usersWithItems = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) AS cnt FROM items`
      )
      .get() as { cnt: number }
  ).cnt;

  // Total items
  const totalItems = (
    db.prepare("SELECT COUNT(*) AS cnt FROM items").get() as { cnt: number }
  ).cnt;

  const avgItemsPerUser =
    usersWithItems > 0 ? totalItems / usersWithItems : 0;

  // Total users
  const totalUsers = (
    db.prepare("SELECT COUNT(*) AS cnt FROM user").get() as { cnt: number }
  ).cnt;

  // Items created by day — last 30 days
  const itemsByDay = db
    .prepare(
      `SELECT
         date(created_at) AS day,
         COUNT(*) AS count
       FROM items
       WHERE created_at >= date('now', '-30 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all() as { day: string; count: number }[];

  // Top 10 item names by frequency
  const topItemNames = db
    .prepare(
      `SELECT name, COUNT(*) AS count
       FROM items
       GROUP BY name
       ORDER BY count DESC
       LIMIT 10`
    )
    .all() as { name: string; count: number }[];

  // Items per user distribution (how many users have 1, 2-5, 6-10, 10+ items)
  const itemCountDistribution = db
    .prepare(
      `SELECT
         CASE
           WHEN item_count = 1 THEN '1'
           WHEN item_count BETWEEN 2 AND 5 THEN '2-5'
           WHEN item_count BETWEEN 6 AND 10 THEN '6-10'
           ELSE '10+'
         END AS bucket,
         COUNT(*) AS users
       FROM (
         SELECT user_id, COUNT(*) AS item_count
         FROM items
         GROUP BY user_id
       )
       GROUP BY bucket
       ORDER BY MIN(item_count) ASC`
    )
    .all() as { bucket: string; users: number }[];

  return NextResponse.json({
    data: {
      avgItemsPerUser,
      usersWithItems,
      totalItems,
      totalUsers,
      itemsByDay,
      topItemNames,
      itemCountDistribution,
    },
  });
}
