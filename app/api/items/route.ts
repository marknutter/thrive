import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRawDb as getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return { userId: session.user.id, email: session.user.email };
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const items = getDb()
    .prepare("SELECT * FROM items WHERE user_id = ? ORDER BY created_at ASC")
    .all(user.userId);

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = generateId();
    const item = getDb()
      .prepare(
        "INSERT INTO items (id, user_id, name, description) VALUES (?, ?, ?, ?) RETURNING *"
      )
      .get(id, user.userId, name.trim(), description?.trim() || "") as Record<string, unknown>;

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create item error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
