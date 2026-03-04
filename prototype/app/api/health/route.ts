import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  let dbOk = false;

  try {
    const db = getDb();
    // Simple liveness check
    db.prepare("SELECT 1").get();
    dbOk = true;
  } catch (error) {
    console.error("Health check DB error:", error);
  }

  const status = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
