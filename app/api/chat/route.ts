export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { parseDocx, parseXlsx, parsePptx } from "@/lib/document-parser";
import { getConnection, fetchRevenue, fetchSubscriptions, fetchPayouts, fetchBalance } from "@/lib/stripe-connect";
import { getProgress, LAUNCH_STEPS, updateStep } from "@/lib/onboarding";
import { isDemoMode } from "@/lib/demo-data";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Thrive, an AI-powered business operations coach based on Kelly's approach to financial clarity for small service businesses. You are Kelly's associate consultant - you ask structured questions, help build financial models, and generate educational documents to help owners get their business foundations right.

## Personality (Based on Kelly)
Kelly has spent most of her career in finance and operations, helping organizations understand their numbers. She believes good financial systems are about giving people the information to make confident decisions. Business success and personal wellbeing should go hand in hand.

The tool should communicate in a way that is professional, warm, and reassuring. Small business owners should feel supported and cared for - as though they have a trusted guide who helps, advises, and simplifies what feels overwhelming.

Many owners lack confidence about finances. Never make them feel inadequate, behind, or judged. Build confidence, encourage progress, and make financial concepts feel approachable and manageable.

The voice should be friendly but direct, empathetic but honest, supportive while encouraging owners to stretch beyond their comfort zones. Kind, capable, and grounding.

## Your Role
You help small business owners, especially wellness and fitness businesses, understand how the business actually works. You are not a generic finance bot and you are not a GTM strategist. You act like a thoughtful, capable guide who helps owners organize messy business reality into clear decisions, simple systems, and calmer operating habits.

## Kelly's Financial Consulting Framework
Your coaching follows Kelly's proven methodology for small service businesses:
1. Business structure setup - ensure legal and financial foundation
2. Financial reporting - create visibility into what's actually happening
3. Goal planning - define where the business should go
4. Cash flow management - ensure the business can pay its bills
5. Profit optimization - find ways to increase margins
6. Growth forecasting - plan for sustainable expansion

## Fitness Studio Industry Benchmarks
Use these as reference points when analyzing studio finances:
- Payroll: 40-50% of revenue is healthy. Above 50% is a warning sign.
- Profit margin: 15-25% is strong for a studio. Below 10% needs attention.
- Cash reserves: 3+ months of expenses is recommended.
- Class capacity utilization: 65-80% is healthy.
- Membership churn: under 3.5% monthly is good. Above 5% is concerning.
- Revenue per member: $100-200/month depending on market.
- Personal training: highest margin service, typically 60%+ gross margin.

## Primary Workflow
You are usually running a business foundations session. Your job is to move through the right questions one step at a time and build clarity in these areas:

### 1. Business Snapshot
- What kind of business is this?
- What services, memberships, classes, or offers generate revenue?
- Who runs the business day to day?

### 2. Revenue Model
- Main revenue streams
- Pricing structure
- Recurring vs one-time revenue
- Capacity constraints, utilization, seasonality, or churn patterns

### 3. Cost Structure
- Biggest fixed costs
- Biggest variable costs
- Contractor or instructor costs
- Owner pay and how the owner currently takes money out

### 4. Systems and Operations
- Scheduling / booking software
- Payments
- Reporting habits
- Where information currently lives
- What feels manual, confusing, or fragile

### 5. Goals and Pressure Points
- Revenue goals
- Income goals
- Stability concerns
- Biggest current frustrations
- What the owner most wants to understand or improve

## Coaching Style
- Default to Socratic questioning: "Your revenue dropped 8% last month. What do you think caused it?"
- If the owner is unsure, provide specific recommendations
- Always reference their actual data when available
- Compare to industry benchmarks naturally, not judgmentally
- Good: "Payroll is slightly higher than typical studio ranges at 52%. Many studios aim for 40-50%."
- Bad: "Your payroll is too high."
- Celebrate wins: "Personal training revenue grew 22% this quarter - that's excellent growth."
- Ask one question at a time
- Start simple and concrete
- If an answer is vague, ask for a more specific example without sounding judgmental
- Summarize what you heard at useful moments
- Point out missing systems, unclear numbers, or decision blind spots when you notice them
- Prefer simple language over finance jargon
- Offer next-step structure, not just commentary
- Keep responses concise
- Never use em-dashes. Use regular dashes or periods instead.

## Document Generation
During onboarding workshops, you can help generate:
- LLC formation guidance (educational, not legal filing)
- Operating agreement templates (for reference)
- EIN application instructions
- Bank account setup checklists
- Accounting setup checklists
- Business structure comparison summaries

Always note: "This is educational guidance. Consult a legal professional for specific legal advice."

## File Uploads
The user can upload PDFs, images, CSVs, text files, Word documents, Excel spreadsheets, and PowerPoint files.
When documents would help, invite them naturally. Good examples:
- "If you have a pricing sheet, monthly report, or studio summary, upload it and I can review it with you."
- "If your numbers live in a spreadsheet, send it over and I can help organize what matters."
- "If you have notes about the business setup or owner goals, I can work from those too."
When a file is uploaded:
- Acknowledge it
- Briefly summarize what it appears to contain
- Pull useful facts into the coaching conversation

## Constraints
- Do not present yourself as bookkeeping software, a CPA, or legal counsel
- Do not overstate certainty when the numbers are incomplete
- Do not jump straight to advanced forecasting unless enough context exists
- Do not default to startup or SaaS language unless the user clearly runs that kind of business`;

interface IncomingAttachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface IncomingMessage {
  role: string;
  content: string;
  attachments?: IncomingAttachment[];
}

const BOOTSTRAP_MESSAGE: IncomingMessage = {
  role: "user",
  content:
    "Begin a business foundations session now. Introduce yourself briefly as Thrive, explain that you help small business owners build financial and operational clarity, and ask your first question about what kind of business they run.",
};

const OFFICE_DOCX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word",
  "application/msword",
]);

const OFFICE_XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const OFFICE_PPTX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

async function buildMessageParams(messages: IncomingMessage[]): Promise<MessageParam[]> {
  const results: MessageParam[] = [];

  for (const m of messages) {
    const hasAttachments = m.attachments && m.attachments.some((a) => a.data);

    if (!hasAttachments) {
      results.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
      continue;
    }

    const blocks: ContentBlockParam[] = [];

    if (m.content) {
      blocks.push({ type: "text", text: m.content });
    }

    for (const att of m.attachments!) {
      if (!att.data) continue;

      if (att.type.startsWith("image/")) {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            data: att.data,
            media_type: att.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          },
        });
      } else if (att.type === "application/pdf") {
        blocks.push({
          type: "document",
          source: {
            type: "base64",
            data: att.data,
            media_type: "application/pdf",
          },
          title: att.name,
        } as ContentBlockParam);
      } else if (OFFICE_DOCX_TYPES.has(att.type)) {
        const text = await parseDocx(att.data);
        blocks.push({ type: "text", text: `[File: ${att.name}]\n${text}` });
      } else if (OFFICE_XLSX_TYPES.has(att.type)) {
        const text = await parseXlsx(att.data);
        blocks.push({ type: "text", text: `[File: ${att.name}]\n${text}` });
      } else if (OFFICE_PPTX_TYPES.has(att.type)) {
        const text = await parsePptx(att.data);
        blocks.push({ type: "text", text: `[File: ${att.name}]\n${text}` });
      } else {
        // Text-based files (CSV, TXT, etc.)
        const textContent = Buffer.from(att.data, "base64").toString("utf-8");
        blocks.push({
          type: "text",
          text: `[File: ${att.name}]\n${textContent}`,
        });
      }
    }

    results.push({
      role: m.role as "user" | "assistant",
      content: blocks,
    });
  }

  return results;
}

function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

async function buildFinancialContext(userId: string): Promise<string> {
  // Demo mode: inject realistic mock financial data
  if (process.env.DEMO_MODE === "true") {
    const { generateDemoFinancialData } = await import("@/lib/demo-data");
    const demo = generateDemoFinancialData(30);
    const s = demo.summary;
    return `

## Current Financial Context
The following is financial data from the studio's connected Stripe account (last 30 days). Use this to provide specific, data-driven coaching.

- Business: Sunrise Yoga & Wellness
- Revenue (last 30 days): ${formatCents(s.total_revenue)} from ${demo.charges.length} successful charge(s)
- MRR (Monthly Recurring Revenue): ${formatCents(s.mrr)}
- Active subscriptions: ${s.active_subscriptions}
- Payouts (last 30 days): ${formatCents(s.total_payouts)}
- Available balance: ${formatCents(s.available_balance)}
- Pending balance: ${formatCents(s.pending_balance)}

## How Their Numbers Compare to Benchmarks
Use these comparisons naturally in conversation when relevant. Do not dump them all at once.
- MRR per active subscription: ${s.active_subscriptions > 0 ? formatCents(Math.round(s.mrr / s.active_subscriptions)) : "N/A"}/month (benchmark: $100-200/month per member)
- Cash runway data available: check available balance vs monthly expenses when discussed`;
  }

  const connection = getConnection(userId);
  if (!connection) {
    return "\n\nNote: The user has not connected their Stripe account yet. When relevant, suggest they connect it at /app/dashboard for data-driven insights.";
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const accountId = connection.stripe_account_id;

    const [charges, subscriptions, payouts, balance] = await Promise.all([
      fetchRevenue(accountId, thirtyDaysAgo, now),
      fetchSubscriptions(accountId),
      fetchPayouts(accountId, thirtyDaysAgo, now),
      fetchBalance(accountId),
    ]);

    // Revenue summary (successful charges only)
    const successfulCharges = charges.filter((c) => c.status === "succeeded");
    const revenueTotal = successfulCharges.reduce((sum, c) => sum + c.amount, 0);
    const currency = successfulCharges[0]?.currency || "usd";

    // Active subscriptions and MRR
    const activeSubs = subscriptions.filter((s) => s.status === "active");
    const mrr = activeSubs.reduce((sum, s) => {
      const amount = s.plan_amount ?? 0;
      if (s.plan_interval === "year") return sum + Math.round(amount / 12);
      if (s.plan_interval === "month") return sum + amount;
      if (s.plan_interval === "week") return sum + amount * 4;
      return sum + amount;
    }, 0);

    // Payout summary
    const paidPayouts = payouts.filter((p) => p.status === "paid");
    const payoutTotal = paidPayouts.reduce((sum, p) => sum + p.amount, 0);

    // Balance
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0);

    return `

## Current Financial Context
The following is real financial data from the user's connected Stripe account (last 30 days). Use this to provide specific, data-driven coaching.

- Revenue (last 30 days): ${formatCents(revenueTotal, currency)} from ${successfulCharges.length} successful charge(s)
- MRR (Monthly Recurring Revenue): ${formatCents(mrr, currency)}
- Active subscriptions: ${activeSubs.length}
- Payouts (last 30 days): ${formatCents(payoutTotal, currency)} across ${paidPayouts.length} payout(s)
- Available balance: ${formatCents(availableBalance, currency)}
- Pending balance: ${formatCents(pendingBalance, currency)}

## How Their Numbers Compare to Benchmarks
Use these comparisons naturally in conversation when relevant. Do not dump them all at once.
- MRR per active subscription: ${activeSubs.length > 0 ? formatCents(Math.round(mrr / activeSubs.length), currency) : "N/A"}/month (benchmark: $100-200/month per member)
- Cash runway data available: check available balance vs monthly expenses when discussed`;
  } catch (error) {
    console.error("Failed to fetch financial context:", error);
    return "\n\nNote: The user has connected their Stripe account but financial data could not be loaded at this time.";
  }
}

// ---------------------------------------------------------------------------
// Onboarding context builder
// ---------------------------------------------------------------------------

function buildOnboardingContext(userId: string): string {
  const stepDescriptions: Record<string, string> = {
    business_structure: "Help them compare LLC vs sole proprietorship vs S-corp. Explain trade-offs simply. Offer to generate a business structure comparison summary.",
    create_llc: "Walk them through the LLC filing process for their state. Offer to generate LLC formation guidance. Remind them this is educational - they should consult a legal professional for specific legal advice.",
    get_ein: "Explain what an EIN is and why they need one. Walk them through the IRS application process (free, online, takes ~15 minutes). Offer to generate EIN application instructions.",
    bank_account: "Explain why separating business and personal finances matters. Help them think about what to look for in a business bank account. Offer to generate a bank account setup checklist.",
    accounting_setup: "Help them choose between QuickBooks, Xero, Wave, or other tools based on their needs and budget. Offer to generate an accounting setup checklist.",
    connect_studio: "Help them think about connecting their studio management software (OfferingTree, PushPress, MindBody, etc.) for better data visibility.",
    connect_stripe: "Guide them to connect their Stripe account so Thrive can provide data-driven financial coaching. They can do this from the dashboard.",
  };

  function formatOnboardingBlock(steps: Array<{key: string; label: string; status: string}>, isDemoContext: boolean): string {
    const lines = steps.map((step) => {
      const checked = step.status === "completed" || step.status === "skipped" ? "x" : " ";
      return `- [${checked}] ${step.label} (${step.status})`;
    });

    const completedCount = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
    const totalCount = steps.length;

    // Find the next step to work on (first pending or in_progress)
    const nextStep = steps.find((s) => s.status === "in_progress") || steps.find((s) => s.status === "pending");
    const inProgressSteps = steps.filter((s) => s.status === "in_progress");

    let nextStepGuidance = "";
    if (nextStep) {
      const desc = stepDescriptions[nextStep.key] || "";
      nextStepGuidance = `
## Next Step to Guide
The next step for this user is: **${nextStep.label}** (currently ${nextStep.status}).
${desc}
Proactively ask about this step if the conversation allows. Use Socratic questioning: ask what they know or have already done before providing guidance.`;
    }

    let inProgressGuidance = "";
    if (inProgressSteps.length > 0) {
      const ipLabels = inProgressSteps.map((s) => s.label).join(", ");
      inProgressGuidance = `
Steps currently in progress: ${ipLabels}. Check in on these - ask how it's going and if they need help completing them.`;
    }

    return `

## Onboarding Progress (${completedCount}/${totalCount} complete)
The user is going through the Thrive Launch business setup process. Here is their current progress:
${lines.join("\n")}
${nextStepGuidance}${inProgressGuidance}

When the user completes a step through conversation (e.g., they say "I filed my LLC yesterday"), acknowledge it, celebrate the progress, and note it in your response with the tag [STEP_COMPLETE:${nextStep?.key || "step_key"}] so the system can update the progress tracker. Similarly use [STEP_STARTED:step_key] when a user begins working on a step. Only use valid step keys: ${LAUNCH_STEPS.map((s) => s.key).join(", ")}.`;
  }

  if (isDemoMode()) {
    // In demo mode, show all steps completed except connect_stripe
    const demoSteps = LAUNCH_STEPS.map((step) => ({
      key: step.key,
      label: step.label,
      status: step.key === "connect_stripe" ? "in_progress" : "completed",
    }));
    return formatOnboardingBlock(demoSteps, true);
  }

  try {
    const steps = getProgress(userId);
    const simplifiedSteps = steps.map((step) => ({
      key: step.key,
      label: step.label,
      status: step.status,
    }));
    return formatOnboardingBlock(simplifiedSteps, false);
  } catch (error) {
    log.error("Failed to build onboarding context", { error: String(error) });
    return "";
  }
}

// ---------------------------------------------------------------------------
// Step tag processing
// ---------------------------------------------------------------------------

const STEP_TAG_REGEX = /\[STEP_COMPLETE:(\w+)\]|\[STEP_STARTED:(\w+)\]/g;

function processStepTags(text: string, userId: string): string {
  const matches = [...text.matchAll(STEP_TAG_REGEX)];
  for (const match of matches) {
    const completeKey = match[1];
    const startedKey = match[2];

    if (completeKey && LAUNCH_STEPS.some((s) => s.key === completeKey)) {
      try {
        updateStep(userId, completeKey, "completed");
        log.info("Auto-completed onboarding step from chat", { userId, stepKey: completeKey });
      } catch (error) {
        log.error("Failed to auto-complete onboarding step", { userId, stepKey: completeKey, error: String(error) });
      }
    }

    if (startedKey && LAUNCH_STEPS.some((s) => s.key === startedKey)) {
      try {
        updateStep(userId, startedKey, "in_progress");
        log.info("Auto-started onboarding step from chat", { userId, stepKey: startedKey });
      } catch (error) {
        log.error("Failed to auto-start onboarding step", { userId, stepKey: startedKey, error: String(error) });
      }
    }
  }

  // Strip tags from the response text
  return text.replace(STEP_TAG_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, bootstrap } = await request.json();
    const requestMessages = bootstrap ? [BOOTSTRAP_MESSAGE, ...(messages ?? [])] : messages;

    const userId = session.user.id;
    const financialContext = await buildFinancialContext(userId);
    const onboardingContext = buildOnboardingContext(userId);

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + financialContext + onboardingContext,
      messages: await buildMessageParams(requestMessages),
    });

    const encoder = new TextEncoder();
    let fullResponseText = "";
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponseText += event.delta.text;
            // Stream the text as-is; tags will be processed after the full response
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }

        // Process step tags from the completed response
        if (STEP_TAG_REGEX.test(fullResponseText)) {
          // Reset regex lastIndex since it's global
          STEP_TAG_REGEX.lastIndex = 0;
          processStepTags(fullResponseText, userId);
          // Send a special event so the client knows to refresh onboarding state
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ onboardingUpdated: true })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
