import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getRawDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const db = getRawDb();

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all() as { name: string }[];

  const result = tables.map((t) => {
    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM "${t.name}"`)
      .get() as { count: number };
    return { name: t.name, rowCount: countRow.count };
  });

  return NextResponse.json({ data: result });
}
