/**
 * RBAC (Role-Based Access Control) server utilities.
 *
 * Provides permission checking, role CRUD, and user-role assignment.
 * Works alongside the existing requireAdmin() — does NOT replace it.
 */

import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { roles, userRoles, user } from "@/lib/schema";
import { type Permission, PERMISSIONS } from "@/lib/permissions";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import crypto from "crypto";

// ─── Permission Checking ─────────────────────────────────────────────────────

/**
 * Get all permissions for a user by aggregating their assigned roles.
 * Returns a deduplicated array of permission strings.
 */
export function getUserPermissions(userId: string): string[] {
  const db = getDb();
  const assignments = db
    .select({ permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(eq(userRoles.user_id, userId))
    .all();

  const permSet = new Set<string>();
  for (const row of assignments) {
    const perms: string[] = JSON.parse(row.permissions);
    for (const p of perms) {
      permSet.add(p);
    }
  }

  return Array.from(permSet);
}

/**
 * Check if a user has a specific permission.
 * The wildcard "*" grants all permissions.
 */
export function hasPermission(userId: string, permission: Permission): boolean {
  const perms = getUserPermissions(userId);
  return perms.includes(PERMISSIONS.ALL) || perms.includes(permission);
}

/**
 * Require a specific permission for an API route.
 * Returns the session on success, or a JSON error response.
 */
export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<
  | { session: { user: { id: string; email: string } }; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  if (!hasPermission(session.user.id, permission)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { session: { user: { id: session.user.id, email: session.user.email } } };
}

// ─── Role CRUD ───────────────────────────────────────────────────────────────

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: number;
  created_at: string | null;
  updated_at: string | null;
}

function toRoleRow(raw: typeof roles.$inferSelect): RoleRow {
  return {
    ...raw,
    permissions: JSON.parse(raw.permissions),
  };
}

export function listRoles(): RoleRow[] {
  const db = getDb();
  const rows = db.select().from(roles).all();
  return rows.map(toRoleRow);
}

export function getRole(id: string): RoleRow | null {
  const db = getDb();
  const row = db.select().from(roles).where(eq(roles.id, id)).get();
  return row ? toRoleRow(row) : null;
}

export function createRole(data: {
  name: string;
  description?: string;
  permissions: string[];
}): RoleRow {
  const db = getDb();
  const id = `role_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const now = new Date().toISOString();

  db.insert(roles)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
      permissions: JSON.stringify(data.permissions),
      is_system: 0,
      created_at: now,
      updated_at: now,
    })
    .run();

  return getRole(id)!;
}

export function updateRole(
  id: string,
  data: { name?: string; description?: string; permissions?: string[] }
): RoleRow {
  const db = getDb();
  const existing = db.select().from(roles).where(eq(roles.id, id)).get();
  if (!existing) throw new NotFoundError("Role not found");
  if (existing.is_system === 1) throw new BadRequestError("Cannot modify system roles");

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.permissions !== undefined) updates.permissions = JSON.stringify(data.permissions);

  db.update(roles)
    .set(updates as Partial<typeof roles.$inferInsert>)
    .where(eq(roles.id, id))
    .run();

  return getRole(id)!;
}

export function deleteRole(id: string): void {
  const db = getDb();
  const existing = db.select().from(roles).where(eq(roles.id, id)).get();
  if (!existing) throw new NotFoundError("Role not found");
  if (existing.is_system === 1) throw new BadRequestError("Cannot delete system roles");

  db.delete(userRoles).where(eq(userRoles.role_id, id)).run();
  db.delete(roles).where(eq(roles.id, id)).run();
}

// ─── User Role Assignment ────────────────────────────────────────────────────

export function getUserRoles(userId: string): RoleRow[] {
  const db = getDb();
  const rows = db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      permissions: roles.permissions,
      is_system: roles.is_system,
      created_at: roles.created_at,
      updated_at: roles.updated_at,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(eq(userRoles.user_id, userId))
    .all();

  return rows.map(toRoleRow);
}

export function assignRole(userId: string, roleId: string, assignedBy?: string): void {
  const db = getDb();

  // Verify user exists
  const u = db.select({ id: user.id }).from(user).where(eq(user.id, userId)).get();
  if (!u) throw new NotFoundError("User not found");

  // Verify role exists
  const r = db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)).get();
  if (!r) throw new NotFoundError("Role not found");

  // Insert (ignore if already assigned)
  db.insert(userRoles)
    .values({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy ?? null,
    })
    .onConflictDoNothing()
    .run();
}

export function removeRole(userId: string, roleId: string): void {
  const db = getDb();
  db.delete(userRoles)
    .where(and(eq(userRoles.user_id, userId), eq(userRoles.role_id, roleId)))
    .run();
}
