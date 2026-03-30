"use client";

import { useMemo } from "react";

// Strip system tags that the AI injects for backend processing
const SYSTEM_TAG_REGEX = /\[PROFILE:\w+=[^\]]*\]|\[STEP_COMPLETE:\w+\]|\[STEP_STARTED:\w+\]/g;

function stripSystemTags(text: string): string {
  return text.replace(SYSTEM_TAG_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

// Lightweight markdown-to-JSX renderer
// Handles: **bold**, *italic*, `code`, headings, lists, links, paragraphs
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    const className = listType === "ol"
      ? "list-decimal ml-5 my-2 space-y-1"
      : "list-disc ml-5 my-2 space-y-1";
    elements.push(
      <Tag key={key++} className={className}>
        {listItems.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line — flush list, add spacing
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-sm font-bold mt-3 mb-1">{renderInline(trimmed.slice(4))}</h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-sm font-bold mt-3 mb-1">{renderInline(trimmed.slice(3))}</h2>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-base font-bold mt-3 mb-1">{renderInline(trimmed.slice(2))}</h1>
      );
      continue;
    }

    // Unordered list items
    if (/^[-*]\s/.test(trimmed)) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Ordered list items
    if (/^\d+[.)]\s/.test(trimmed)) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(trimmed.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={key++} className="my-3 border-current opacity-20" />);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-sm leading-relaxed mb-2">{renderInline(trimmed)}</p>
    );
  }

  flushList();
  return elements;
}

// Inline formatting: **bold**, *italic*, `code`, [links](url)
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Code: `text`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find the earliest match
    const matches = [
      boldMatch && { type: "bold", match: boldMatch },
      italicMatch && { type: "italic", match: italicMatch },
      codeMatch && { type: "code", match: codeMatch },
      linkMatch && { type: "link", match: linkMatch },
    ].filter(Boolean) as Array<{ type: string; match: RegExpMatchArray }>;

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    // Sort by index to process the earliest match first
    matches.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
    const earliest = matches[0];
    const idx = earliest.match.index ?? 0;

    // Text before the match
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    // The formatted element
    switch (earliest.type) {
      case "bold":
        parts.push(<strong key={key++}>{earliest.match[1]}</strong>);
        break;
      case "italic":
        parts.push(<em key={key++}>{earliest.match[1]}</em>);
        break;
      case "code":
        parts.push(
          <code key={key++} className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">
            {earliest.match[1]}
          </code>
        );
        break;
      case "link":
        parts.push(
          <a key={key++} href={earliest.match[2]} className="text-emerald-600 dark:text-emerald-400 underline" target="_blank" rel="noopener noreferrer">
            {earliest.match[1]}
          </a>
        );
        break;
    }

    remaining = remaining.slice(idx + earliest.match[0].length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// Main exported component
export function ChatMessageContent({ content, role }: { content: string; role: "user" | "assistant" }) {
  const rendered = useMemo(() => {
    if (role === "user") {
      // User messages: just strip tags, don't render markdown
      return <span>{stripSystemTags(content)}</span>;
    }
    // Assistant messages: strip tags + render markdown
    const cleaned = stripSystemTags(content);
    return <div>{renderMarkdown(cleaned)}</div>;
  }, [content, role]);

  return rendered;
}
