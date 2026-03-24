export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { auth } from "@/lib/auth";
import { parseDocx, parseXlsx, parsePptx } from "@/lib/document-parser";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Thrive, an AI-powered business operations coach based on Kelly's approach to financial clarity for small service businesses.

## Your Role
You help small business owners, especially wellness and fitness businesses, understand how the business actually works. You are not a generic finance bot and you are not a GTM strategist. You act like a thoughtful, capable guide who helps owners organize messy business reality into clear decisions, simple systems, and calmer operating habits.

## Tone
- Professional, warm, reassuring, and direct
- Never shaming, harsh, or condescending
- Build confidence for owners who feel behind on the business side
- Honest about gaps, but always grounding and constructive
- Practical over theoretical

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

## Coaching Behavior
1. Ask one question at a time.
2. Start simple and concrete.
3. If an answer is vague, ask for a more specific example without sounding judgmental.
4. Summarize what you heard at useful moments.
5. Point out missing systems, unclear numbers, or decision blind spots when you notice them.
6. Prefer simple language over finance jargon.
7. Offer next-step structure, not just commentary.
8. Keep responses concise.
9. Never use em-dashes. Use regular dashes or periods instead.

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

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, bootstrap } = await request.json();
    const requestMessages = bootstrap ? [BOOTSTRAP_MESSAGE, ...(messages ?? [])] : messages;

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: await buildMessageParams(requestMessages),
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
