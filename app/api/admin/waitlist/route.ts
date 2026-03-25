import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getRawDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  void session;

  const db = getRawDb();
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = page * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push("LOWER(w.email) LIKE ?");
    params.push(`%${search.toLowerCase()}%`);
  }

  if (statusFilter && statusFilter !== "all") {
    conditions.push("w.status = ?");
    params.push(statusFilter);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'invited' THEN 1 ELSE 0 END) as invited,
      SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as registered
    FROM waitlist
  `).get() as { total: number; waiting: number; invited: number; registered: number };

  // Count for pagination
  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM waitlist w ${where}
  `).get(...params) as { total: number };

  // Paginated results
  const entries = db.prepare(`
    SELECT
      w.id,
      w.email,
      w.referral_code,
      w.referred_by,
      w.referral_count,
      w.status,
      w.created_at,
      w.invited_at
    FROM waitlist w
    ${where}
    ORDER BY w.created_at ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<{
    id: number;
    email: string;
    referral_code: string;
    referred_by: string | null;
    referral_count: number;
    status: string;
    created_at: string;
    invited_at: string | null;
  }>;

  return NextResponse.json({
    data: entries,
    stats,
    total: countRow.total,
    page,
    limit,
    pages: Math.ceil(countRow.total / limit),
  });
}
