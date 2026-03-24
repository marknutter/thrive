import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSqliteDb as getDb } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return { userId: session.user.id, email: session.user.email };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const result = getDb()
    .prepare("DELETE FROM items WHERE id = ? AND user_id = ?")
    .run(id, user.userId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const item = getDb()
      .prepare(
        "UPDATE items SET name = ?, description = ? WHERE id = ? AND user_id = ? RETURNING *"
      )
      .get(name.trim(), description?.trim() || "", id, user.userId) as Record<string, unknown> | undefined;

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
