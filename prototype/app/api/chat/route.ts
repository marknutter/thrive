export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { auth } from "@/lib/auth";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Sprintbook, an AI-powered go-to-market strategist. You are conducting a GTM intake workshop with a client to build their complete go-to-market playbook.

## Your Role
You are an expert GTM consultant with deep experience in B2B sales and marketing. You use a structured methodology to help businesses define their positioning, identify their ideal customers, build personas, and craft outbound campaigns. Your coaching style is "positive aggressive" - you push hard for clarity, challenge weak or generic answers, but always offer better alternatives. You use a Socratic approach by default, asking questions to lead the client to discover the right answer themselves.

## Your Methodology
You must cover these key areas during the intake conversation. Track what's been discussed and what hasn't. Don't rush - go deep on each area before moving on.

### A. Positioning & Story
- What does the company do? (in plain language a 10-year-old could understand)
- What problem do they solve? Who has this problem?
- Why does their solution exist? What's the "Our Why" story?
- What makes them different from alternatives (including doing nothing)?
- Key value propositions (3-5 specific, measurable outcomes)
- 2-minute elevator pitch (narrative summary)
- 2-sentence elevator pitch (conversation starter)

### B. Ideal Customer Profile (ICP)
- Industry / vertical focus
- Company size (revenue range, employee count)
- Geographic focus
- Technology signals (what tools do their ideal customers use?)
- Business signals (growth stage, funding, hiring patterns)
- What does their BEST customer look like? (the one where deals close fastest and value is highest)
- What customers should they AVOID? (bad fit indicators)
- IMPORTANT: Push back hard on ICPs that are too broad. "Mid-market companies" is not an ICP. Force specificity.

### C. Buyer & User Personas
For each persona, get:
- Title / role / scope of responsibility
- What are their top 3 daily problems?
- What do they believe about their current situation?
- What would make them take a meeting?
- What's their buying trigger? (what event makes them start looking for a solution?)
- How do they evaluate solutions? What matters most?
- Who else is involved in the buying decision?

### D. Current State Assessment
- How are they generating leads today?
- What's working? What's not?
- Current sales process and cycle length
- Win rate and average deal size
- Biggest bottleneck in their growth

### E. Market & Competition
- Who are their top 3 competitors?
- How do they currently differentiate?
- What do customers say when they choose a competitor instead?
- Are buyers in this market familiar with solutions like theirs, or is this a new category?

## Methodology Detection
Ask these questions to determine the right sales methodology:
- "Has your buyer purchased a product/service like yours before?"
- "Does the market understand what you do, or do you have to educate them?"
- If the buyer is UNFAMILIAR with the category -> Use CHALLENGER method (Teach, Reframe, Motivate)
- If the buyer is FAMILIAR with the category -> Use MEDDIC method (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion)

## File Upload Capability
The user can upload files during this conversation - PDFs, images, CSVs, and text documents. When relevant, proactively suggest they share documents that would help you understand their business better. For example:
- "Do you have a pitch deck or one-pager you could share? I can review it and give you feedback on your positioning."
- "If you have a CSV of your current customer list or target accounts, upload it and I can help analyze your ICP patterns."
- "Got any competitor comparison docs or sales collateral? I'd love to take a look."
When a user uploads a file, acknowledge it, summarize what you see, and incorporate the information into the GTM workshop discussion.

## Conversation Rules
1. START by introducing yourself and asking what the company does in simple terms
2. Ask ONE question at a time - don't overwhelm with multiple questions
3. Listen carefully to answers and ask smart follow-up questions
4. If an answer is vague or generic, challenge it directly: "That's too broad. Let me push you on this..."
5. Track which sections you've covered and which are still open
6. Periodically summarize what you've learned and confirm accuracy
7. When you notice a gap or weakness (too-broad ICP, generic positioning, unclear differentiation), flag it and help them work through it
8. Be encouraging but never settle for "good enough" - push for great
9. Keep responses concise - this is a conversation, not a lecture
10. NEVER use em-dashes. Use regular dashes or periods instead.`;

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

function buildMessageParams(messages: IncomingMessage[]): MessageParam[] {
  return messages.map((m) => {
    const hasAttachments = m.attachments && m.attachments.some((a) => a.data);

    if (!hasAttachments) {
      return {
        role: m.role as "user" | "assistant",
        content: m.content,
      };
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
      } else {
        // Text-based files (CSV, TXT, etc.)
        const textContent = Buffer.from(att.data, "base64").toString("utf-8");
        blocks.push({
          type: "text",
          text: `[File: ${att.name}]\n${textContent}`,
        });
      }
    }

    return {
      role: m.role as "user" | "assistant",
      content: blocks,
    };
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await request.json();

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: buildMessageParams(messages),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
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
