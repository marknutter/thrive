export const DEFAULT_CONVERSATION_TITLE = "New chat";
const LEGACY_DEFAULT_TITLES = new Set([DEFAULT_CONVERSATION_TITLE, "GTM Intake Workshop"]);
const MAX_CONVERSATION_TITLE_LENGTH = 60;

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function deriveConversationTitle(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return DEFAULT_CONVERSATION_TITLE;

  if (normalized.length <= MAX_CONVERSATION_TITLE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_CONVERSATION_TITLE_LENGTH - 1).trimEnd()}…`;
}

export function shouldAutoRenameConversation(title: string | null | undefined): boolean {
  return !title || LEGACY_DEFAULT_TITLES.has(title);
}

export function upsertConversation(
  conversations: ConversationSummary[],
  conversation: ConversationSummary
): ConversationSummary[] {
  return [...conversations.filter((item) => item.id !== conversation.id), conversation].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  );
}
