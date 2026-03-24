import { NextRequest, NextResponse } from "next/server";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { blogPosts, user } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const offset = (page - 1) * limit;
  const status = searchParams.get("status");

  const where = status ? eq(blogPosts.status, status) : undefined;

  const totalRow = db
    .select({ count: count() })
    .from(blogPosts)
    .where(where)
    .get();
  const total = totalRow?.count ?? 0;

  const posts = db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      status: blogPosts.status,
      author_id: blogPosts.author_id,
      author_email: user.email,
      published_at: blogPosts.published_at,
      created_at: blogPosts.created_at,
      updated_at: blogPosts.updated_at,
    })
    .from(blogPosts)
    .leftJoin(user, eq(user.id, blogPosts.author_id))
    .where(where)
    .orderBy(desc(blogPosts.created_at))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ data: posts, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;

  const body = await req.json();
  const { title, slug, content, status } = body;

  if (!title || !slug || !content) {
    return NextResponse.json({ error: "title, slug, and content are required" }, { status: 400 });
  }

  const postStatus = status === "published" ? "published" : "draft";
  const publishedAt = postStatus === "published" ? new Date().toISOString() : null;
  const authorId = session.user.id;

  const db = getDb();
  try {
    db.insert(blogPosts).values({
      title,
      slug,
      content,
      status: postStatus,
      author_id: authorId,
      published_at: publishedAt,
    }).run();
  } catch {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const post = db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).get();

  logAdminAction(session.user.id, "blog_post_create", "blog_post", slug, { title, status: postStatus });

  return NextResponse.json({ data: post }, { status: 201 });
}
