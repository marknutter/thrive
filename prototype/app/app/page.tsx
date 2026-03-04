"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Zap,
  LogOut,
  Send,
  Settings,
  Loader2,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 (without data:...;base64, prefix)
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function AppPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasStarted = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Save a message to the database
  const saveMessage = useCallback(
    async (convId: string, msg: Message) => {
      const attachmentsMeta = msg.attachments?.map((a) => ({
        name: a.name,
        type: a.type,
        size: a.size,
      }));
      await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: msg.role,
          content: msg.content,
          attachments_meta: attachmentsMeta || null,
        }),
      });
    },
    []
  );

  // Send a message to the API and stream the response
  const sendMessage = useCallback(
    async (messagesToSend: Message[], convId: string | null) => {
      setIsStreaming(true);

      // Strip attachment binary data from previous messages to reduce payload
      const messagesForApi = messagesToSend.map((m, i) => {
        if (i === messagesToSend.length - 1) return m;
        if (m.attachments && m.attachments.length > 0) {
          const { attachments, ...rest } = m;
          return {
            ...rest,
            content:
              rest.content +
              `\n[Previously attached: ${attachments.map((a) => a.name).join(", ")}]`,
          };
        }
        return m;
      });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesForApi }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let assistantMessage = "";

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMessage += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantMessage,
                    };
                    return updated;
                  });
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }

        // Save assistant message to DB
        if (convId && assistantMessage) {
          await saveMessage(convId, {
            role: "assistant",
            content: assistantMessage,
          });
        }
      } catch (error) {
        console.error("Stream error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [saveMessage]
  );

  // Create a new conversation and start the intake
  const startConversation = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Create conversation in DB
    const res = await fetch("/api/conversations", { method: "POST" });
    if (!res.ok) {
      console.error("Failed to create conversation");
      return;
    }
    const { conversation } = await res.json();
    setConversationId(conversation.id);

    const initialMessages: Message[] = [
      {
        role: "user",
        content:
          "Hi, I'm ready to start building my go-to-market playbook. Let's begin the intake workshop.",
      },
    ];
    setMessages([]);

    // Save the initial user message
    await saveMessage(conversation.id, initialMessages[0]);

    await sendMessage(initialMessages, conversation.id);
  }, [sendMessage, saveMessage]);

  useEffect(() => {
    async function init() {
      try {
        const { data: session } = await authClient.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUserEmail(session.user.email);
      } catch {
        router.push("/auth");
      } finally {
        setAuthLoading(false);
      }
    }
    init();
  }, [router]);

  // Start conversation once auth is loaded
  useEffect(() => {
    if (!authLoading && userEmail) {
      startConversation();
    }
  }, [authLoading, userEmail, startConversation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        console.warn(`Unsupported file type: ${file.type}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File too large: ${file.name}`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        setPendingAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type, size: file.size, data: base64 },
        ]);
      };
      reader.readAsDataURL(file);
    }

    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || isStreaming) return;

    const userMessage: Message = {
      role: "user",
      content:
        input.trim() ||
        (pendingAttachments.length > 0
          ? `[Attached ${pendingAttachments.length} file(s)]`
          : ""),
      attachments:
        pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setPendingAttachments([]);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Save user message to DB
    if (conversationId) {
      await saveMessage(conversationId, userMessage);
    }

    await sendMessage(updatedMessages, conversationId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Skeleton circle width="w-8" height="h-8" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-gray-900 dark:text-gray-100">
              Sprintbook
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              GTM Intake Workshop
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {userEmail}
            </span>
            <ThemeToggle compact />
            <button
              onClick={() => router.push("/settings")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                  {isStreaming &&
                    i === messages.length - 1 &&
                    message.role === "assistant" && (
                      <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-0.5 animate-pulse" />
                    )}
                </div>
                {/* Attachment badges on user messages */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {message.attachments.map((att, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-1 bg-emerald-700/30 rounded px-2 py-1 text-xs text-emerald-100"
                      >
                        {att.type.startsWith("image/") ? (
                          <ImageIcon className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        <span className="max-w-[100px] truncate">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming indicator when no content yet */}
          {isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300"
                >
                  {att.type.startsWith("image/") ? (
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span className="max-w-[120px] truncate">{att.name}</span>
                  <span className="text-gray-400">
                    ({(att.size / 1024).toFixed(0)}KB)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingAttachments((prev) =>
                        prev.filter((_, j) => j !== i)
                      )
                    }
                    className="text-gray-400 hover:text-red-500 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
              multiple
              onChange={handleFileSelect}
            />

            {/* Paperclip button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 150) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                (!input.trim() && pendingAttachments.length === 0) || isStreaming
              }
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
