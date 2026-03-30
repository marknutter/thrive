export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";
import { parseDocx, parseXlsx, parsePptx } from "@/lib/document-parser";
import { getConnection, fetchRevenue, fetchSubscriptions, fetchPayouts, fetchBalance } from "@/lib/stripe-connect";
import { isDemoMode } from "@/lib/demo-data";
import { formatProfileForAI, processProfileTags, PROFILE_FIELDS, getProfileCompleteness } from "@/lib/business-profile";
import { getMilestones, completeMilestone, MILESTONES, type MilestoneWithStatus } from "@/lib/milestones";

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

## Session Structure (IMPORTANT)
You run structured coaching sessions with a CLEAR beginning, middle, and end. You do NOT ask questions forever. The session has 5 phases, and you should move through them purposefully. Aim to complete a session in roughly 15-25 exchanges.

### Phase 1: Business Snapshot (3-5 questions)
Get the basics:
- Business name, type, and location
- Services/memberships/classes that generate revenue
- How long they've been operating
- Who runs the business day to day

### Phase 2: Revenue & Costs (4-6 questions)
Understand the money:
- Main revenue streams and pricing
- Approximate monthly revenue
- Recurring vs one-time revenue
- Biggest costs (rent, payroll, software)
- How the owner currently pays themselves

### Phase 3: Systems & Operations (2-4 questions)
Understand their tools:
- Studio management software (PushPress, MindBody, OfferingTree, etc.)
- Payment processor (Stripe, Square, etc.)
- Accounting software (if any)
- What feels manual, confusing, or fragile

### Phase 4: Goals (2-3 questions)
Understand where they want to go:
- Revenue or income goals
- Biggest frustration right now
- What they most want to understand or improve

### Phase 5: Wrap Up and Deliver (MUST REACH THIS PHASE)
After covering the above areas, DO NOT keep asking more questions. Instead:
1. Provide a clear summary of what you learned about their business
2. Highlight 2-3 key observations or quick wins
3. Explain what Thrive can do for them next: "Based on what you've shared, here's what I'd recommend as your next steps..."
4. Point them to specific Thrive features:
   - "/app/launch for your business setup checklist"
   - "/app/dashboard to connect Stripe and see your financial dashboard"
   - "/app/insights for AI-powered analysis of your numbers"
   - "/app/forecast to project where your business is heading"
   - "/app/compass for monthly priorities and goals"
5. End with encouragement: "You're in a great position to build real financial clarity. I'm here whenever you need me."

## Extracting Structured Data
As you learn facts about the business, ALWAYS include [PROFILE:key=value] tags in your responses to store them. These are invisible to the user but critical for building their business profile. Valid keys: ${Object.keys(PROFILE_FIELDS).join(", ")}

Examples:
- When they say "I run a yoga studio in Minneapolis" → include [PROFILE:business_type=Yoga studio] [PROFILE:location=Minneapolis, MN]
- When they say "We have about 85 members" → include [PROFILE:member_count=85]
- When they say "We use PushPress" → include [PROFILE:studio_software=PushPress]
- When they say "Revenue is around $30k/month" → include [PROFILE:monthly_revenue=$30,000/month]

Extract EVERY relevant fact. This builds their business profile automatically.

## Coaching Style

### CRITICAL RULE: ONE QUESTION PER RESPONSE
You MUST end each response with exactly ONE question. Never two, never three. If you have multiple things to ask about, pick the most important one and save the rest for later. This is the single most important rule for the coaching experience. Multiple questions overwhelm studio owners and derail the conversation.

### Other guidelines:
- Default to Socratic questioning: "Your revenue dropped 8% last month. What do you think caused it?"
- If the owner is unsure, provide specific recommendations
- Always reference their actual data when available
- Compare to industry benchmarks naturally, not judgmentally
- Good: "Payroll is slightly higher than typical studio ranges at 52%. Many studios aim for 40-50%."
- Bad: "Your payroll is too high."
- Celebrate wins: "Personal training revenue grew 22% this quarter - that's excellent growth."
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

## Inline Actions and Links
You can include clickable buttons and links in your responses using markdown link syntax. These render as styled buttons in the chat UI.

**Internal app links (render as emerald buttons):**
- Connect Stripe: [Connect Stripe](/api/stripe/connect)
- Financial Dashboard: [View Dashboard](/app/dashboard)
- Financial Insights: [View Insights](/app/insights)
- Revenue Forecast: [View Forecast](/app/forecast)
- Monthly Priorities: [View Compass](/app/compass)
- Business Setup: [Complete Setup](/app/launch)
- Account Settings: [Open Settings](/settings)

**External resource links (render as text links):**
- LLC filing: [File LLC in Minnesota](https://mblsportal.sos.state.mn.us/Business/Search) (use the user's state)
- EIN application: [Apply for EIN at IRS.gov](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online)
- QuickBooks: [QuickBooks Online](https://quickbooks.intuit.com)
- Wave: [Wave Accounting (free)](https://www.waveapps.com)

**When to use these:**
- When discussing Stripe connection, include the [Connect Stripe](/api/stripe/connect) button
- When discussing LLC formation, include the IRS/state filing links
- When wrapping up a session, include buttons to relevant Thrive features
- When the user asks "what should I do next", give specific action buttons
- Don't overuse - max 1-2 action buttons per message, links as needed
- Always pair buttons with explanatory text, never just a bare button

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
// Milestone context builder (replaces old onboarding context)
// ---------------------------------------------------------------------------

function buildMilestoneContext(userId: string): string {
  const manualDescriptions: Record<string, string> = {
    stripe_connected: "Guide them to connect their Stripe account so Thrive can provide data-driven financial coaching. They can do this from the dashboard at /app/dashboard.",
    business_structure: "Help them compare LLC vs sole proprietorship vs S-corp. Explain trade-offs simply. Offer to generate a business structure comparison summary.",
    llc_filed: "Walk them through the LLC filing process for their state. Offer to generate LLC formation guidance. Remind them this is educational - they should consult a legal professional for specific legal advice.",
    ein_obtained: "Explain what an EIN is and why they need one. Walk them through the IRS application process (free, online, takes ~15 minutes). Offer to generate EIN application instructions.",
    bank_account_opened: "Explain why separating business and personal finances matters. Help them think about what to look for in a business bank account. Offer to generate a bank account setup checklist.",
  };

  function formatMilestoneBlock(milestones: MilestoneWithStatus[]): string {
    const autoMilestones = milestones.filter((m) => m.type === "auto");
    const manualMilestones = milestones.filter((m) => m.type === "manual");
    const completedCount = milestones.filter((m) => m.status === "completed").length;
    const totalCount = milestones.length;

    // Auto milestones section
    const autoLines = autoMilestones.map((m) => {
      const checked = m.status === "completed" ? "x" : " ";
      return `- [${checked}] ${m.label} (${m.status})`;
    });

    // For pending auto milestones, tell the AI which fields are still needed
    let autoGuidance = "";
    const pendingAuto = autoMilestones.filter((m) => m.status !== "completed");
    if (pendingAuto.length > 0) {
      const missingInfo = pendingAuto.map((m) => {
        const def = MILESTONES.find((d) => d.key === m.key);
        if (!def) return "";
        const missingFields = def.requiredFields.filter((f) => {
          // Check if the field is already present via fieldsPresent count
          return true; // We list all required fields for clarity
        });
        return `- ${m.label}: needs profile fields [${def.requiredFields.join(", ")}]`;
      }).filter(Boolean);
      autoGuidance = `
## Profile Fields Still Needed
These auto milestones will complete when the required profile fields are captured through conversation:
${missingInfo.join("\n")}
Continue asking questions to fill these in naturally.`;
    }

    // Manual milestones section
    const manualLines = manualMilestones.map((m) => {
      const checked = m.status === "completed" ? "x" : " ";
      return `- [${checked}] ${m.label} (${m.status})`;
    });

    // Find next manual milestone to guide on
    const nextManual = manualMilestones.find((m) => m.status !== "completed");
    let manualGuidance = "";
    if (nextManual) {
      const desc = manualDescriptions[nextManual.key] || "";
      manualGuidance = `
## Next Business Setup Step
The next business setup step for this user is: **${nextManual.label}** (currently ${nextManual.status}).
${desc}
Proactively ask about this step when the conversation allows. Use Socratic questioning: ask what they know or have already done before providing guidance.`;
    }

    const validKeys = MILESTONES.map((m) => m.key).join(", ");

    return `

## Milestone Progress (${completedCount}/${totalCount} complete)

### Coaching Progress (auto-completing)
${autoLines.join("\n")}
${autoGuidance}

### Business Setup
${manualLines.join("\n")}
${manualGuidance}

When the user completes a business setup step through conversation (e.g., they say "I filed my LLC yesterday" or "I chose to go with an LLC"), acknowledge it, celebrate the progress, and note it in your response with the tag [STEP_COMPLETE:milestone_key] so the system can update the milestone tracker. Valid milestone keys: ${validKeys}.`;
  }

  if (isDemoMode()) {
    // In demo mode, show most milestones completed
    const demoMilestones: MilestoneWithStatus[] = MILESTONES.map((m) => ({
      key: m.key,
      label: m.label,
      description: m.description,
      type: m.type,
      requiredFields: m.requiredFields,
      order: m.order,
      status: m.key === "stripe_connected" ? "pending" as const : "completed" as const,
      completedAt: m.key === "stripe_connected" ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return formatMilestoneBlock(demoMilestones);
  }

  try {
    const milestones = getMilestones(userId);
    return formatMilestoneBlock(milestones);
  } catch (error) {
    log.error("Failed to build milestone context", { error: String(error) });
    return "";
  }
}

// ---------------------------------------------------------------------------
// Step tag processing (uses milestone keys)
// ---------------------------------------------------------------------------

const STEP_TAG_REGEX = /\[STEP_COMPLETE:(\w+)\]|\[STEP_STARTED:(\w+)\]/g;

function processStepTags(text: string, userId: string): string {
  const matches = [...text.matchAll(STEP_TAG_REGEX)];
  for (const match of matches) {
    const completeKey = match[1];
    const startedKey = match[2];

    if (completeKey && MILESTONES.some((m) => m.key === completeKey)) {
      try {
        completeMilestone(userId, completeKey);
        log.info("Auto-completed milestone from chat", { userId, milestoneKey: completeKey });
      } catch (error) {
        log.error("Failed to auto-complete milestone", { userId, milestoneKey: completeKey, error: String(error) });
      }
    }

    // For STEP_STARTED, we don't have an in_progress state in the new system,
    // but we can log it for awareness
    if (startedKey && MILESTONES.some((m) => m.key === startedKey)) {
      log.info("Milestone started (noted)", { userId, milestoneKey: startedKey });
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
    const milestoneContext = buildMilestoneContext(userId);
    const profileContext = formatProfileForAI(userId);
    const profileCompleteness = getProfileCompleteness(userId);

    // Tell the AI how far along the profile is
    const progressHint = profileCompleteness.filled > 0
      ? `\n\n## Session Progress\nBusiness profile: ${profileCompleteness.filled}/${profileCompleteness.total} fields captured (${profileCompleteness.percentage}%). ${profileCompleteness.percentage >= 60 ? "You have enough information to start wrapping up. Move to Phase 5 (Wrap Up) soon." : "Continue gathering information."}`
      : "";

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + financialContext + milestoneContext + profileContext + progressHint,
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
          STEP_TAG_REGEX.lastIndex = 0;
          processStepTags(fullResponseText, userId);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ milestonesUpdated: true })}\n\n`)
          );
        }

        // Process profile tags from the completed response
        processProfileTags(fullResponseText, userId);

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
