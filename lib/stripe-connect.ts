import { getStripe } from "@/lib/stripe";
import { getSqliteDb } from "@/lib/db";
import { log as logger } from "@/lib/logger";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StripeConnection {
  id: string;
  user_id: string;
  stripe_account_id: string;
  access_token: string;
  refresh_token: string | null;
  scope: string;
  stripe_publishable_key: string | null;
  business_name: string | null;
  connected_at: string;
  last_synced_at: string | null;
}

// ---------------------------------------------------------------------------
// CSRF state tokens  (signed, short-lived)
// ---------------------------------------------------------------------------

const STATE_SECRET = process.env.BETTER_AUTH_SECRET || "fallback-secret";

export function generateStateToken(userId: string): string {
  const payload = JSON.stringify({ userId, ts: Date.now() });
  const sig = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function validateStateToken(
  state: string,
  maxAgeMs = 10 * 60 * 1000
): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const dotIdx = decoded.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const payload = decoded.slice(0, dotIdx);
    const sig = decoded.slice(dotIdx + 1);
    const expected = crypto
      .createHmac("sha256", STATE_SECRET)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
      return null;
    const data = JSON.parse(payload) as { userId: string; ts: number };
    if (Date.now() - data.ts > maxAgeMs) return null;
    return data.userId;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function getConnectAuthorizeUrl(state: string): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) throw new Error("STRIPE_CONNECT_CLIENT_ID not configured");

  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read_only");
  url.searchParams.set(
    "redirect_uri",
    `${process.env.APP_URL || process.env.BETTER_AUTH_URL}/api/stripe/callback`
  );
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(code: string) {
  const resp = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_secret: process.env.STRIPE_SECRET_KEY || "",
    }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    logger.error("Stripe token exchange failed", err);
    throw new Error(err.error_description || "Token exchange failed");
  }
  return resp.json() as Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    stripe_publishable_key: string;
    stripe_user_id: string;
    scope: string;
  }>;
}

export async function deauthorizeAccount(stripeAccountId: string) {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) throw new Error("STRIPE_CONNECT_CLIENT_ID not configured");

  await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      stripe_user_id: stripeAccountId,
    }),
  });
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

export function saveConnection(
  userId: string,
  data: {
    stripe_user_id: string;
    access_token: string;
    refresh_token: string;
    scope: string;
    stripe_publishable_key: string;
  }
) {
  const db = getSqliteDb();
  // Fetch business name from Stripe
  db.prepare(
    `INSERT INTO stripe_connections (user_id, stripe_account_id, access_token, refresh_token, scope, stripe_publishable_key)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, stripe_account_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       connected_at = CURRENT_TIMESTAMP`
  ).run(
    userId,
    data.stripe_user_id,
    data.access_token,
    data.refresh_token,
    data.scope,
    data.stripe_publishable_key
  );
  logger.info("Stripe account connected", {
    userId,
    stripeAccountId: data.stripe_user_id,
  });
}

export function getConnection(userId: string): StripeConnection | undefined {
  const db = getSqliteDb();
  return db
    .prepare("SELECT * FROM stripe_connections WHERE user_id = ?")
    .get(userId) as StripeConnection | undefined;
}

export function getConnectionByAccountId(
  stripeAccountId: string
): StripeConnection | undefined {
  const db = getSqliteDb();
  return db
    .prepare("SELECT * FROM stripe_connections WHERE stripe_account_id = ?")
    .get(stripeAccountId) as StripeConnection | undefined;
}

export function removeConnection(userId: string, stripeAccountId: string) {
  const db = getSqliteDb();
  db.prepare(
    "DELETE FROM stripe_connections WHERE user_id = ? AND stripe_account_id = ?"
  ).run(userId, stripeAccountId);
  logger.info("Stripe account disconnected", { userId, stripeAccountId });
}

export function updateLastSynced(userId: string, stripeAccountId: string) {
  const db = getSqliteDb();
  db.prepare(
    "UPDATE stripe_connections SET last_synced_at = CURRENT_TIMESTAMP WHERE user_id = ? AND stripe_account_id = ?"
  ).run(userId, stripeAccountId);
}

// ---------------------------------------------------------------------------
// Data fetching — uses platform key + stripeAccount header
// ---------------------------------------------------------------------------

export async function fetchRevenue(
  stripeAccountId: string,
  startDate: Date,
  endDate: Date
) {
  const stripe = getStripe();
  const charges: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    description: string | null;
  }> = [];

  for await (const charge of stripe.charges.list(
    {
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    },
    { stripeAccount: stripeAccountId }
  )) {
    charges.push({
      id: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      created: charge.created,
      description: charge.description,
    });
  }
  return charges;
}

export async function fetchSubscriptions(stripeAccountId: string) {
  const stripe = getStripe();
  const subs: Array<{
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    plan_amount: number | null;
    plan_currency: string | null;
    plan_interval: string | null;
    customer: string;
  }> = [];

  for await (const sub of stripe.subscriptions.list(
    { limit: 100, status: "all" },
    { stripeAccount: stripeAccountId }
  )) {
    const item = sub.items.data[0];
    subs.push({
      id: sub.id,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      plan_amount: item?.price?.unit_amount ?? null,
      plan_currency: item?.price?.currency ?? null,
      plan_interval: item?.price?.recurring?.interval ?? null,
      customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    });
  }
  return subs;
}

export async function fetchPayouts(
  stripeAccountId: string,
  startDate: Date,
  endDate: Date
) {
  const stripe = getStripe();
  const payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrival_date: number;
    created: number;
  }> = [];

  for await (const payout of stripe.payouts.list(
    {
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    },
    { stripeAccount: stripeAccountId }
  )) {
    payouts.push({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrival_date: payout.arrival_date,
      created: payout.created,
    });
  }
  return payouts;
}

export async function fetchBalance(stripeAccountId: string) {
  const stripe = getStripe();
  return stripe.balance.retrieve({}, { stripeAccount: stripeAccountId });
}

export async function fetchBalanceTransactions(
  stripeAccountId: string,
  startDate: Date,
  endDate: Date
) {
  const stripe = getStripe();
  const transactions: Array<{
    id: string;
    amount: number;
    fee: number;
    net: number;
    currency: string;
    type: string;
    created: number;
    description: string | null;
  }> = [];

  for await (const txn of stripe.balanceTransactions.list(
    {
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    },
    { stripeAccount: stripeAccountId }
  )) {
    transactions.push({
      id: txn.id,
      amount: txn.amount,
      fee: txn.fee,
      net: txn.net,
      currency: txn.currency,
      type: txn.type,
      created: txn.created,
      description: txn.description,
    });
  }
  return transactions;
}

export async function fetchCustomerCount(stripeAccountId: string) {
  const stripe = getStripe();
  // Use a single-item list to get total_count
  const result = await stripe.customers.list(
    { limit: 1 },
    { stripeAccount: stripeAccountId }
  );
  // Stripe doesn't return total_count on list, so count via iteration
  let count = 0;
  for await (const _ of stripe.customers.list(
    { limit: 100 },
    { stripeAccount: stripeAccountId }
  )) {
    count++;
  }
  void result;
  return count;
}

export async function fetchAccountInfo(stripeAccountId: string) {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    id: account.id,
    business_name:
      account.business_profile?.name ||
      account.settings?.dashboard?.display_name ||
      null,
    email: account.email,
    country: account.country,
    default_currency: account.default_currency,
  };
}
