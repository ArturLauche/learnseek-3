import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { permissions, rolePermissions, roles, userRoles } from "@/lib/db/schema/identity";
import { eq } from "drizzle-orm";

export const PERMISSIONS = [
  "admin:access",
  "admin:users",
  "admin:moderation",
  "admin:content",
  "admin:ai_ops",
  "admin:reco",
  "admin:flags",
  "admin:audit",
  "admin:destructive",
  "content:create",
  "content:publish",
  "moderation:review",
] as const;

export type PermissionSlug = (typeof PERMISSIONS)[number];

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getUserPermissionSlugs(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ slug: permissions.slug })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));
  return new Set(rows.map((row) => row.slug));
}

export async function userHasPermission(userId: string, permission: PermissionSlug) {
  const slugs = await getUserPermissionSlugs(userId);
  return slugs.has(permission) || slugs.has("admin:destructive");
}

export async function requirePermission(permission: PermissionSlug) {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  const allowed = await userHasPermission(session.user.id, permission);
  if (!allowed) {
    redirect("/home");
  }
  return session;
}

export const ROLE_PERMISSIONS: Record<string, PermissionSlug[]> = {
  learner: ["content:create"],
  creator: ["content:create", "content:publish"],
  moderator: ["content:create", "moderation:review", "admin:access", "admin:moderation"],
  admin: [
    "admin:access",
    "admin:users",
    "admin:moderation",
    "admin:content",
    "admin:ai_ops",
    "admin:reco",
    "admin:flags",
    "admin:audit",
    "content:create",
    "content:publish",
    "moderation:review",
  ],
  superadmin: [
    "admin:access",
    "admin:users",
    "admin:moderation",
    "admin:content",
    "admin:ai_ops",
    "admin:reco",
    "admin:flags",
    "admin:audit",
    "admin:destructive",
    "content:create",
    "content:publish",
    "moderation:review",
  ],
};
