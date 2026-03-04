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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  // Verify conversation belongs to user
  const conversation = db
    .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
    .get(id, user.userId);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = db
    .prepare(
      "SELECT id, role, content, attachments_meta, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(id);

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  // Verify conversation belongs to user
  const conversation = db
    .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
    .get(id, user.userId);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { role, content, attachments_meta } = await request.json();

  const msgId = generateId();
  const message = db
    .prepare(
      "INSERT INTO messages (id, conversation_id, role, content, attachments_meta) VALUES (?, ?, ?, ?, ?) RETURNING *"
    )
    .get(msgId, id, role, content, attachments_meta ? JSON.stringify(attachments_meta) : null);

  // Update conversation timestamp
  db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

  return NextResponse.json({ message }, { status: 201 });
}
