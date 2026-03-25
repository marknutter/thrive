import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getSqliteDb } from "@/lib/db";

/** Return all valid table names from sqlite_master */
function getAllTableNames(db: ReturnType<typeof getSqliteDb>): Set<string> {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    )
    .all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

interface ColumnMeta {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/** Return full column info for a table (single PRAGMA call). */
function getColumnInfo(db: ReturnType<typeof getSqliteDb>, table: string): ColumnMeta[] {
  return db.prepare(`PRAGMA table_info("${table}")`).all() as ColumnMeta[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { table } = await params;
  const db = getSqliteDb();

  // Validate table name against sqlite_master
  const validTables = getAllTableNames(db);
  if (!validTables.has(table)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const sortParam = searchParams.get("sort");
  const order = searchParams.get("order") === "desc" ? "DESC" : "ASC";
  const filterParam = searchParams.get("filter");

  // Single PRAGMA call — derive column name set from the result
  const columnInfo = getColumnInfo(db, table);
  const validColumns = new Set(columnInfo.map((c) => c.name));

  // Validate sort column
  let sortClause = "";
  if (sortParam && validColumns.has(sortParam)) {
    sortClause = `ORDER BY "${sortParam}" ${order}`;
  }

  // Build WHERE clause from filter (JSON-encoded column->value map)
  let whereClause = "";
  const bindValues: unknown[] = [];
  if (filterParam) {
    try {
      const filters = JSON.parse(filterParam) as Record<string, string>;
      const conditions: string[] = [];
      for (const [col, val] of Object.entries(filters)) {
        if (validColumns.has(col) && val !== "") {
          conditions.push(`"${col}" LIKE ?`);
          bindValues.push(`%${val}%`);
        }
      }
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(" AND ")}`;
      }
    } catch {
      // Ignore malformed filter
    }
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM "${table}" ${whereClause}`)
    .get(...bindValues) as { total: number };

  const rows = db
    .prepare(
      `SELECT * FROM "${table}" ${whereClause} ${sortClause} LIMIT ? OFFSET ?`
    )
    .all(...bindValues, limit, page * limit);

  return NextResponse.json({
    data: {
      rows,
      total: countRow.total,
      page,
      limit,
      columns: columnInfo,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  const { table } = await params;
  const db = getSqliteDb();

  // Validate table name
  const validTables = getAllTableNames(db);
  if (!validTables.has(table)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  const body = (await request.json()) as { id: unknown; column: string; value: unknown };
  const { id, column, value } = body;

  if (id === undefined || id === null) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!column) {
    return NextResponse.json({ error: "Missing column" }, { status: 400 });
  }

  // Single PRAGMA call — validate column and find primary key
  const columnInfo = getColumnInfo(db, table);
  if (!columnInfo.some((c) => c.name === column)) {
    return NextResponse.json({ error: "Invalid column name" }, { status: 400 });
  }

  const pkCol = columnInfo.find((c) => c.pk === 1);
  if (!pkCol) {
    return NextResponse.json({ error: "Table has no primary key" }, { status: 400 });
  }

  // Perform the update using parameterized query (column name already validated above)
  const result = db
    .prepare(`UPDATE "${table}" SET "${column}" = ? WHERE "${pkCol.name}" = ?`)
    .run(value, id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  logAdminAction(session!.user.id, "db_edit", table, String(id), {
    column,
    value,
  });

  return NextResponse.json({ data: { success: true } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { session, error } = await requireAdmin(request);
  if (error) return error;

  const { table } = await params;
  const db = getSqliteDb();

  // Validate table name
  const validTables = getAllTableNames(db);
  if (!validTables.has(table)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  const body = (await request.json()) as { id: unknown; confirm?: string };
  const { id, confirm } = body;

  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  if (id === undefined || id === null) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Find primary key column
  const columnInfo = getColumnInfo(db, table);
  const pkCol = columnInfo.find((c) => c.pk === 1);
  if (!pkCol) {
    return NextResponse.json({ error: "Table has no primary key" }, { status: 400 });
  }

  const result = db
    .prepare(`DELETE FROM "${table}" WHERE "${pkCol.name}" = ?`)
    .run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  logAdminAction(session!.user.id, "db_delete", table, String(id), {});

  return NextResponse.json({ data: { success: true } });
}
