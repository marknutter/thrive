import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSqliteDb } from "@/lib/db";

export interface AuditLog {
  id: number;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  void session;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const offset = (page - 1) * limit;

  const action = searchParams.get("action") ?? "";
  const adminId = searchParams.get("adminId") ?? "";
  const targetType = searchParams.get("targetType") ?? "";
  const search = searchParams.get("search") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  // Dynamic WHERE with many optional filters — stays raw for readability
  const db = getSqliteDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (action) {
    conditions.push("l.action = ?");
    params.push(action);
  }
  if (adminId) {
    conditions.push("l.admin_id = ?");
    params.push(adminId);
  }
  if (targetType) {
    conditions.push("l.target_type = ?");
    params.push(targetType);
  }
  if (search) {
    conditions.push("l.details LIKE ?");
    params.push(`%${search}%`);
  }
  if (startDate) {
    conditions.push("l.created_at >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("l.created_at <= ?");
    params.push(`${endDate}T23:59:59`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db.prepare(
    `SELECT COUNT(*) as total
     FROM admin_logs l
     JOIN user u ON u.id = l.admin_id
     ${whereClause}`
  ).get(...params) as { total: number };

  const rows = db.prepare(
    `SELECT l.id, l.admin_id, u.email AS admin_email, l.action,
            l.target_type, l.target_id, l.details, l.created_at
     FROM admin_logs l
     JOIN user u ON u.id = l.admin_id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as {
    id: number;
    admin_id: string;
    admin_email: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: string | null;
    created_at: string;
  }[];

  const logs: AuditLog[] = rows.map((row) => ({
    ...row,
    details: row.details ? (JSON.parse(row.details) as Record<string, unknown>) : null,
  }));

  return NextResponse.json({
    data: logs,
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  });
}
