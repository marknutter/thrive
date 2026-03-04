export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return { userId: session.user.id };
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const conversations = getDb()
    .prepare(
      "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(user.userId);

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = generateId();
  const conversation = getDb()
    .prepare(
      "INSERT INTO conversations (id, user_id) VALUES (?, ?) RETURNING *"
    )
    .get(id, user.userId);

  return NextResponse.json({ conversation }, { status: 201 });
}
