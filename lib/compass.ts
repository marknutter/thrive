/**
 * Thrive Compass — AI-powered monthly priorities and guidance engine.
 *
 * Fetches Stripe data for the last 90 days, builds a financial summary,
 * then calls Claude to produce actionable priorities, goals, opportunities,
 * and risk signals for the studio owner.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildFinancialSummary, formatSummaryAsText } from "@/lib/insights";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompassPriority {
  title: string;
  why: string;
  actions: string[];
}

export interface CompassGoal {
  label: string;
  current: string;
  target: string;
  progress: number; // 0-100
}

export interface CompassSignal {
  title: string;
  body: string;
}

export interface CompassResult {
  month: string; // "March 2026"
  priorities: CompassPriority[]; // 3-5 items
  goals: CompassGoal[];
  opportunities: CompassSignal[];
  risks: CompassSignal[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Claude prompt
// ---------------------------------------------------------------------------

const COMPASS_PROMPT = `You are a trusted financial advisor and business strategist for small service businesses — specifically fitness studios, wellness centers, and similar owner-operated businesses. You are preparing a monthly Compass — a calm, focused guide that answers the question: "What should I focus on right now?"

This is not a dashboard or analytics page. Think of it as a monthly meeting with a trusted advisor who gives clear, practical direction.

Your tone should be supportive, practical, and calm. Never alarmist. Use language like "Keeping an eye on scheduling may help maintain strong margins" rather than "Payroll costs are dangerously high." You are a partner, not a critic.

Analyze the financial data and produce a structured monthly Compass with these sections:

1. **Priorities** — 3-5 clear, actionable priorities for this month. Each priority needs:
   - A short, clear title (e.g., "Improve membership retention")
   - A "why" paragraph explaining why this matters, referencing specific data
   - 2-4 specific, practical suggested actions the owner can take

2. **Strategic Goals** — 3-5 measurable goals with:
   - A label (e.g., "Monthly Revenue")
   - Current value (formatted with $ or % as appropriate)
   - Target value (a realistic stretch goal based on trends)
   - Progress percentage (0-100, representing how close current is to target)

3. **Opportunity Signals** — 2-4 growth opportunities based on the data. Frame positively. Examples: "Evening classes are near capacity, suggesting potential demand for additional sessions." Each has a title and body.

4. **Risk Signals** — 2-4 areas to watch. These are NOT alarms — they are gentle, supportive observations. Frame as "worth watching" or "keeping an eye on." Each has a title and body. Example: "Payroll costs are trending slightly upward. Keeping an eye on scheduling may help maintain strong margins."

Rules:
- Be specific with numbers. Reference actual dollar amounts and percentages.
- Keep explanations concise but substantive (2-4 sentences each).
- Only include items where the data supports them. Do not fabricate.
- Priorities should be ordered by importance/urgency.
- Goals should be realistic stretch targets, not fantasy numbers.
- Progress percentages should reflect actual current-to-target ratios.

Respond with ONLY valid JSON in this exact format:
{
  "priorities": [
    {
      "title": "Short priority title",
      "why": "Why this matters, with specific data references.",
      "actions": ["Action 1", "Action 2", "Action 3"]
    }
  ],
  "goals": [
    {
      "label": "Monthly Revenue",
      "current": "$32,000",
      "target": "$40,000",
      "progress": 80
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity title",
      "body": "Description of the opportunity with supporting data."
    }
  ],
  "risks": [
    {
      "title": "Risk title",
      "body": "Supportive description of what to watch."
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Generate Compass from live Stripe data
// ---------------------------------------------------------------------------

const client = new Anthropic();

export async function generateCompass(
  stripeAccountId: string
): Promise<CompassResult> {
  const summary = await buildFinancialSummary(stripeAccountId);
  const summaryText = formatSummaryAsText(summary);

  const now = new Date();
  const month = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  log.info("Generating Compass for user", { stripeAccountId, month });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Here is the financial data for analysis:\n\n${summaryText}\n\nPlease analyze this data and produce a monthly Compass — clear priorities, goals, opportunities, and risks for this month.`,
      },
    ],
    system: COMPASS_PROMPT,
  });

  // Extract text from the response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    log.error("No text in Claude Compass response");
    throw new Error("Failed to generate Compass: no response text");
  }

  // Parse JSON from the response - handle potential markdown code fences
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: {
    priorities: CompassPriority[];
    goals: CompassGoal[];
    opportunities: CompassSignal[];
    risks: CompassSignal[];
  };

  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    log.error("Failed to parse Compass JSON", {
      error: err instanceof Error ? err.message : String(err),
      raw: jsonText.slice(0, 500),
    });
    throw new Error("Failed to parse Compass response");
  }

  return {
    month,
    priorities: parsed.priorities || [],
    goals: parsed.goals || [],
    opportunities: parsed.opportunities || [],
    risks: parsed.risks || [],
    generatedAt: new Date().toISOString(),
  };
}
