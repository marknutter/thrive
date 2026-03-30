/**
 * Business Foundation document — a saveable summary generated from
 * coaching session data (business profile + milestones).
 *
 * No AI call needed — this is pure structured data assembly.
 */

import { getRawDb } from "@/lib/db";
import { getProfile, type ProfileEntry } from "@/lib/business-profile";
import { getMilestones, type MilestoneWithStatus } from "@/lib/milestones";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FoundationDoc {
  businessSnapshot: {
    name: string | null;
    type: string | null;
    location: string | null;
    yearsInBusiness: string | null;
    owner: string | null;
  } | null;
  revenueModel: {
    streams: string | null;
    monthlyRevenue: string | null;
    pricing: string | null;
    memberCount: string | null;
  } | null;
  costStructure: {
    biggestCosts: string | null;
    ownerPay: string | null;
  } | null;
  systems: {
    studioSoftware: string | null;
    paymentProcessor: string | null;
    accountingSoftware: string | null;
  } | null;
  goals: {
    primaryGoal: string | null;
    revenueGoal: string | null;
    biggestFrustration: string | null;
  } | null;
  milestoneProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  milestones: Array<{
    key: string;
    label: string;
    status: string;
  }>;
  recommendations: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fieldValue(profile: ProfileEntry[], key: string): string | null {
  const entry = profile.find((p) => p.key === key);
  return entry?.value ?? null;
}

function hasAnyField(profile: ProfileEntry[], keys: string[]): boolean {
  return keys.some((k) => fieldValue(profile, k) !== null);
}

function buildRecommendations(
  profile: ProfileEntry[],
  milestones: MilestoneWithStatus[]
): string[] {
  const recs: string[] = [];
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;

  const stripeConnected = milestones.find((m) => m.key === "stripe_connected");
  if (!stripeConnected || stripeConnected.status !== "completed") {
    recs.push("Connect your payment processor for financial insights");
  }

  if (!fieldValue(profile, "accounting_software")) {
    recs.push("Consider setting up QuickBooks or Wave for expense tracking");
  }

  const llcMilestone = milestones.find((m) => m.key === "llc_filed");
  if (!llcMilestone || llcMilestone.status !== "completed") {
    recs.push("Setting up an LLC provides liability protection");
  }

  const einMilestone = milestones.find((m) => m.key === "ein_obtained");
  if (!einMilestone || einMilestone.status !== "completed") {
    recs.push("Apply for an EIN - it's free and takes about 15 minutes online");
  }

  const bankMilestone = milestones.find((m) => m.key === "bank_account_opened");
  if (!bankMilestone || bankMilestone.status !== "completed") {
    recs.push("Open a dedicated business bank account to separate personal and business finances");
  }

  if (completedCount === totalCount) {
    // Clear previous recs if everything is done
    recs.length = 0;
    recs.push("Your business foundation is complete!");
  } else if (totalCount > 0 && (completedCount / totalCount) * 100 >= 60) {
    recs.push("Great progress! Your business foundation is taking shape.");
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

export function generateFoundation(userId: string): FoundationDoc {
  const profile = getProfile(userId);
  const milestones = getMilestones(userId);
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;

  // Business Snapshot — only include section if we have any relevant fields
  const snapshotFields = ["business_name", "business_type", "location", "years_in_business", "owner_name"];
  const businessSnapshot = hasAnyField(profile, snapshotFields)
    ? {
        name: fieldValue(profile, "business_name"),
        type: fieldValue(profile, "business_type"),
        location: fieldValue(profile, "location"),
        yearsInBusiness: fieldValue(profile, "years_in_business"),
        owner: fieldValue(profile, "owner_name"),
      }
    : null;

  // Revenue Model
  const revenueFields = ["revenue_streams", "monthly_revenue", "pricing_structure", "member_count"];
  const revenueModel = hasAnyField(profile, revenueFields)
    ? {
        streams: fieldValue(profile, "revenue_streams"),
        monthlyRevenue: fieldValue(profile, "monthly_revenue"),
        pricing: fieldValue(profile, "pricing_structure"),
        memberCount: fieldValue(profile, "member_count"),
      }
    : null;

  // Cost Structure
  const costFields = ["biggest_costs", "owner_pay"];
  const costStructure = hasAnyField(profile, costFields)
    ? {
        biggestCosts: fieldValue(profile, "biggest_costs"),
        ownerPay: fieldValue(profile, "owner_pay"),
      }
    : null;

  // Systems
  const systemFields = ["studio_software", "payment_processor", "accounting_software"];
  const systems = hasAnyField(profile, systemFields)
    ? {
        studioSoftware: fieldValue(profile, "studio_software"),
        paymentProcessor: fieldValue(profile, "payment_processor"),
        accountingSoftware: fieldValue(profile, "accounting_software"),
      }
    : null;

  // Goals
  const goalFields = ["primary_goal", "revenue_goal", "biggest_frustration"];
  const goals = hasAnyField(profile, goalFields)
    ? {
        primaryGoal: fieldValue(profile, "primary_goal"),
        revenueGoal: fieldValue(profile, "revenue_goal"),
        biggestFrustration: fieldValue(profile, "biggest_frustration"),
      }
    : null;

  const recommendations = buildRecommendations(profile, milestones);

  return {
    businessSnapshot,
    revenueModel,
    costStructure,
    systems,
    goals,
    milestoneProgress: {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    },
    milestones: milestones.map((m) => ({
      key: m.key,
      label: m.label,
      status: m.status,
    })),
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

export function saveFoundation(userId: string, doc: FoundationDoc): void {
  const db = getRawDb();
  const content = JSON.stringify(doc);

  db.prepare(
    `INSERT INTO foundation_docs (user_id, content, generated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       content = excluded.content,
       generated_at = CURRENT_TIMESTAMP`
  ).run(userId, content);

  log.info("Foundation doc saved", { userId });
}

export function getFoundation(userId: string): FoundationDoc | null {
  const db = getRawDb();
  const row = db
    .prepare("SELECT content FROM foundation_docs WHERE user_id = ?")
    .get(userId) as { content: string } | undefined;

  if (!row) return null;

  try {
    return JSON.parse(row.content) as FoundationDoc;
  } catch {
    log.error("Failed to parse foundation doc", { userId });
    return null;
  }
}

export function hasFoundation(userId: string): boolean {
  const db = getRawDb();
  const row = db
    .prepare("SELECT 1 FROM foundation_docs WHERE user_id = ?")
    .get(userId);
  return !!row;
}
