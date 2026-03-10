import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONVERSATION_TITLE,
  deriveConversationTitle,
  shouldAutoRenameConversation,
  upsertConversation,
  type ConversationSummary,
} from "@/lib/conversations";

describe("deriveConversationTitle", () => {
  it("falls back to the default title for blank content", () => {
    expect(deriveConversationTitle("   \n  ")).toBe(DEFAULT_CONVERSATION_TITLE);
  });

  it("normalizes whitespace before creating the title", () => {
    expect(deriveConversationTitle("  First line\n\nsecond line  ")).toBe("First line second line");
  });

  it("truncates long titles with an ellipsis", () => {
    expect(deriveConversationTitle("a".repeat(80))).toBe(`${"a".repeat(59)}…`);
  });
});

describe("shouldAutoRenameConversation", () => {
  it("renames conversations that still use the new-chat default", () => {
    expect(shouldAutoRenameConversation(DEFAULT_CONVERSATION_TITLE)).toBe(true);
  });

  it("renames conversations that still use the legacy default", () => {
    expect(shouldAutoRenameConversation("GTM Intake Workshop")).toBe(true);
  });

  it("preserves custom titles", () => {
    expect(shouldAutoRenameConversation("Outbound messaging review")).toBe(false);
  });
});

describe("upsertConversation", () => {
  it("adds new conversations and sorts by updated_at descending", () => {
    const first: ConversationSummary = {
      id: "1",
      title: "Earlier",
      created_at: "2026-03-09T10:00:00.000Z",
      updated_at: "2026-03-09T10:00:00.000Z",
    };
    const second: ConversationSummary = {
      id: "2",
      title: "Later",
      created_at: "2026-03-10T10:00:00.000Z",
      updated_at: "2026-03-10T10:00:00.000Z",
    };

    expect(upsertConversation([first], second).map((conversation) => conversation.id)).toEqual(["2", "1"]);
  });

  it("replaces existing conversations in place", () => {
    const original: ConversationSummary = {
      id: "1",
      title: DEFAULT_CONVERSATION_TITLE,
      created_at: "2026-03-09T10:00:00.000Z",
      updated_at: "2026-03-09T10:00:00.000Z",
    };
    const renamed: ConversationSummary = {
      ...original,
      title: "Workshop follow-up",
      updated_at: "2026-03-10T10:00:00.000Z",
    };

    expect(upsertConversation([original], renamed)).toEqual([renamed]);
  });
});
