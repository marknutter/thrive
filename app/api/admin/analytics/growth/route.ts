import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSqliteDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const db = getSqliteDb();

  // Signups by day — last 30 days
  // createdAt is stored as Unix epoch milliseconds in Better Auth
  const signupsByDay = db
    .prepare(
      `SELECT
         date(createdAt / 1000, 'unixepoch') AS day,
         COUNT(*) AS count
       FROM user
       WHERE createdAt >= (unixepoch('now', '-30 days') * 1000)
       GROUP BY day
       ORDER BY day ASC`
    )
    .all() as { day: string; count: number }[];

  // DAU — distinct users who created items today
  const dau = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) AS cnt
         FROM items
         WHERE date(created_at) = date('now')`
      )
      .get() as { cnt: number }
  ).cnt;

  // WAU — distinct users who created items in last 7 days
  const wau = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) AS cnt
         FROM items
         WHERE created_at >= date('now', '-7 days')`
      )
      .get() as { cnt: number }
  ).cnt;

  // MAU — distinct users who created items in last 30 days
  const mau = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) AS cnt
         FROM items
         WHERE created_at >= date('now', '-30 days')`
      )
      .get() as { cnt: number }
  ).cnt;

  // Total users
  const totalUsers = (
    db.prepare("SELECT COUNT(*) AS cnt FROM user").get() as { cnt: number }
  ).cnt;

  // Pro users — check plan_overrides first, then user plan
  const proUsers = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT u.id) AS cnt
         FROM user u
         LEFT JOIN plan_overrides po
           ON po.user_id = u.id
           AND (po.expires_at IS NULL OR po.expires_at > datetime('now'))
         WHERE
           (po.plan = 'pro') OR
           (po.plan IS NULL AND u.plan = 'pro')`
      )
      .get() as { cnt: number }
  ).cnt;

  const conversionRate = totalUsers > 0 ? proUsers / totalUsers : 0;

  return NextResponse.json({
    data: {
      signupsByDay,
      dau,
      wau,
      mau,
      conversionRate,
      totalUsers,
      proUsers,
    },
  });
}
