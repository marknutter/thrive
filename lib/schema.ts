/**
 * Schema barrel — conditionally re-exports from the correct dialect schema.
 *
 * Consumer imports stay unchanged: `import { user, conversations } from "@/lib/schema"`.
 *
 * TypeScript types are from the SQLite schema (the default/primary dialect).
 * When running against PG, the actual objects carry PG-specific metadata, but
 * the runtime column/table names are identical — Drizzle uses these at runtime
 * to generate dialect-correct SQL via the dialect-specific DB instance.
 */

import { getDialect } from "./db-dialect";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod: typeof import("./schema.sqlite") = getDialect() === "pg"
  ? require("./schema.pg")
  : require("./schema.sqlite");

export const user = mod.user;
export const session = mod.session;
export const account = mod.account;
export const verification = mod.verification;
export const twoFactor = mod.twoFactor;
export const items = mod.items;
export const conversations = mod.conversations;
export const messages = mod.messages;
export const adminLogs = mod.adminLogs;
export const planOverrides = mod.planOverrides;
export const newsletterSubscribers = mod.newsletterSubscribers;
export const blogPosts = mod.blogPosts;
export const jobs = mod.jobs;
export const files = mod.files;
export const notifications = mod.notifications;
export const webhooks = mod.webhooks;
export const webhookDeliveries = mod.webhookDeliveries;
export const roles = mod.roles;
export const userRoles = mod.userRoles;
export const waitlist = mod.waitlist;
export const inviteCodes = mod.inviteCodes;
export const _migrations = mod._migrations;
