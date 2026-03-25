export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/schema";
import { enqueueJob } from "@/lib/jobs";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  void session;

  const db = getDb();

  const counts = db
    .select({ status: jobs.status, count: count() })
    .from(jobs)
    .groupBy(jobs.status)
    .all();

  const stats: Record<string, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
  };
  for (const row of counts) {
    stats[row.status] = row.count;
  }

  const recentJobs = db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .all();

  return NextResponse.json({ stats, jobs: recentJobs });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  void session;

  const body = (await req.json()) as { type?: string; payload?: Record<string, unknown> };
  if (!body.type || typeof body.type !== "string") {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const jobId = enqueueJob(body.type, body.payload);

  const job = getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .get();

  return NextResponse.json({ job }, { status: 201 });
}
