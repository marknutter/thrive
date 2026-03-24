"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  DEFAULT_CONVERSATION_TITLE,
  type ConversationSummary,
  upsertConversation,
} from "@/lib/conversations";
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
  Mic,
  Volume2,
  Square,
  MessageSquare,
  PenSquare,
  Pause,
  Play,
  VolumeX,
  BarChart3,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useVoice } from "@/lib/use-voice";

interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  attachments_meta?: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

function parseStoredMessages(messages: StoredMessage[]): Message[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    attachments: message.attachments_meta ? JSON.parse(message.attachments_meta) : undefined,
  }));
}

function formatConversationTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function AppPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [audioResponsesEnabled, setAudioResponsesEnabled] = useState(true);
  const [isConversationLoading, setIsConversationLoading] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const saveMessage = useCallback(async (convId: string, msg: Message) => {
    const attachmentsMeta = msg.attachments?.map((attachment) => ({
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
    }));
    const response = await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: msg.role,
        content: msg.content,
        attachments_meta: attachmentsMeta || null,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save message");
    }

    const { conversation } = await response.json();
    if (conversation) {
      setConversations((current) => upsertConversation(current, conversation));
    }
  }, []);

  const sendMessage = useCallback(
    async (
      messagesToSend: Message[],
      convId: string | null,
      speakResponse = false,
      options?: { bootstrap?: boolean }
    ) => {
      setIsStreaming(true);

      const messagesForApi = messagesToSend.map((message, index) => {
        if (index === messagesToSend.length - 1) return message;
        if (message.attachments && message.attachments.length > 0) {
          const { attachments, ...rest } = message;
          return {
            ...rest,
            content: `${rest.content}\n[Previously attached: ${attachments.map((attachment) => attachment.name).join(", ")}]`,
          };
        }
        return message;
      });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesForApi, bootstrap: options?.bootstrap ?? false }),
        });

        if (!response.ok) throw new Error("Chat request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let assistantMessage = "";

        setMessages((current) => [...current, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantMessage += parsed.text;
                setMessages((current) => {
                  const updated = [...current];
                  updated[updated.length - 1] = { role: "assistant", content: assistantMessage };
                  return updated;
                });
              }
            } catch {}
          }
        }

        if (convId && assistantMessage) {
          await saveMessage(convId, { role: "assistant", content: assistantMessage });
        }

        if (speakResponse && assistantMessage) {
          await speak(assistantMessage);
        }
      } catch (error) {
        console.error("Stream error:", error);
        setMessages((current) => [
          ...current,
          { role: "assistant", content: "Sorry, something went wrong. Please try again." },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [saveMessage]
  );

  const loadConversation = useCallback(async (id: string) => {
    setIsConversationLoading(true);
    setConversationId(id);

    try {
      const response = await fetch(`/api/conversations/${id}/messages`);
      if (!response.ok) throw new Error("Failed to load conversation");

      const { messages: storedMessages } = await response.json();
      setMessages(parseStoredMessages(storedMessages ?? []));
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setMessages([]);
    } finally {
      setIsConversationLoading(false);
    }
  }, []);

  const createConversation = useCallback(
    async (activate = true, autoStart = false) => {
      setIsCreatingConversation(true);

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: DEFAULT_CONVERSATION_TITLE }),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const { conversation } = await response.json();
        setConversations((current) => upsertConversation(current, conversation));

        if (activate) {
          setConversationId(conversation.id);
          setMessages([]);
          setPendingAttachments([]);
          setInput("");
          setIsConversationLoading(false);

          if (autoStart) {
            await sendMessage([], conversation.id, audioResponsesEnabled, { bootstrap: true });
          }
        }

        return conversation as ConversationSummary;
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [audioResponsesEnabled, sendMessage]
  );

  const initializeConversations = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    setIsConversationLoading(true);

    try {
      const response = await fetch("/api/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");

      const { conversations: existingConversations } = await response.json();
      if (existingConversations?.length > 0) {
        setConversations(existingConversations);
        await loadConversation(existingConversations[0].id);
        return;
      }

      await createConversation(true, true);
    } catch (error) {
      console.error("Failed to initialize conversations:", error);
      setIsConversationLoading(false);
    }
  }, [createConversation, loadConversation]);

  const {
    isListening,
    voiceState,
    currentTranscript,
    toggleListening,
    speak,
    isSupported: isVoiceSupported,
    audioRef,
    playback,
    togglePlayback,
    seekTo,
    setPlaybackRate,
  } = useVoice({
    onTranscript: (text) => {
      setInput(text);
    },
    onTurnEnd: async (transcript) => {
      const trimmedTranscript = transcript.trim();
      if (!trimmedTranscript || !conversationId) return;

      const userMessage: Message = { role: "user", content: trimmedTranscript };
      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setInput("");

      await saveMessage(conversationId, userMessage);
      await sendMessage(updatedMessages, conversationId, audioResponsesEnabled);
    },
    onError: (error) => {
      console.error("Voice error:", error);
    },
  });

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

    void init();
  }, [router]);

  useEffect(() => {
    if (!authLoading && userEmail) {
      void initializeConversations();
    }
  }, [authLoading, initializeConversations, userEmail]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        setPendingAttachments((current) => [
          ...current,
          { name: file.name, type: file.type, size: file.size, data: base64 },
        ]);
      };
      reader.readAsDataURL(file);
    }

    event.target.value = "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!input.trim() && pendingAttachments.length === 0) || isStreaming || !conversationId) return;

    const userMessage: Message = {
      role: "user",
      content:
        input.trim() || (pendingAttachments.length > 0 ? `[Attached ${pendingAttachments.length} file(s)]` : ""),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setPendingAttachments([]);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    await saveMessage(conversationId, userMessage);
    await sendMessage(updatedMessages, conversationId, audioResponsesEnabled);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth");
  };

  const handleMicTap = async () => {
    if (voiceState === "speaking" || voiceState === "processing") return;
    if (!voiceModeActive) {
      setVoiceModeActive(true);
    }

    await toggleListening();
  };

  const handleNewConversation = async () => {
    if (isStreaming) return;
    await createConversation(true, true);
  };

  const activeConversation =
    conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0] ?? null;

  const controlsDisabled = isStreaming || isListening || voiceState === "processing";
  const showPlayer = Boolean(playback.sourceUrl);

  const getMicButtonStyle = () => {
    if (isListening) {
      return "bg-red-500 text-white animate-pulse";
    }
    if (voiceState === "speaking") {
      return "bg-emerald-500 text-white";
    }
    if (voiceState === "processing") {
      return "bg-yellow-500 text-white";
    }
    if (voiceModeActive) {
      return "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400";
    }
    return "text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Skeleton circle width="w-8" height="h-8" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 md:flex">
      <aside className="hidden md:flex md:w-80 md:flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => void handleNewConversation()}
            disabled={controlsDisabled || isCreatingConversation}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingConversation ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conversation) => {
            const isActive = conversation.id === conversationId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void loadConversation(conversation.id)}
                disabled={controlsDisabled || isActive}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                    : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-white dark:bg-gray-800 p-2 shadow-sm">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {conversation.title || DEFAULT_CONVERSATION_TITLE}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatConversationTimestamp(conversation.updated_at)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-gray-900 dark:text-gray-100">Thrive</div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {activeConversation?.title || DEFAULT_CONVERSATION_TITLE}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {(voiceModeActive || audioResponsesEnabled) && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs">
                  {isListening && (
                    <span className="text-red-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Listening...
                    </span>
                  )}
                  {voiceState === "processing" && <span className="text-yellow-500">Processing...</span>}
                  {voiceState === "speaking" && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      Speaking...
                    </span>
                  )}
                  {voiceState === "idle" && !isListening && voiceModeActive && (
                    <span className="text-gray-400">Tap mic to speak</span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setAudioResponsesEnabled((current) => !current)}
                className={`hidden rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex sm:items-center sm:gap-1.5 ${
                  audioResponsesEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
                title={audioResponsesEnabled ? "Audio responses on" : "Audio responses off"}
              >
                {audioResponsesEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Audio replies
              </button>

              <span className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">{userEmail}</span>
              <ThemeToggle compact />
              <button
                onClick={() => router.push("/app/dashboard")}
                className="text-gray-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                title="Financial Dashboard"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/settings")}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setAudioResponsesEnabled((current) => !current)}
                className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm ${
                  audioResponsesEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {audioResponsesEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Audio
              </button>

              <button
                type="button"
                onClick={() => void handleNewConversation()}
                disabled={controlsDisabled || isCreatingConversation}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingConversation ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
                New
              </button>

              {conversations.map((conversation) => {
                const isActive = conversation.id === conversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void loadConversation(conversation.id)}
                    disabled={controlsDisabled || isActive}
                    className={`max-w-[220px] flex-shrink-0 truncate rounded-full border px-4 py-2 text-sm ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {conversation.title || DEFAULT_CONVERSATION_TITLE}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6">
            {isConversationLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="max-w-md rounded-3xl border border-dashed border-gray-300 bg-white/70 px-8 py-10 text-center dark:border-gray-700 dark:bg-gray-900/70">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Start a new coaching session</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    Each conversation keeps its own history. Start with the owner, the business, or a document that needs review.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-emerald-600 text-white"
                          : "border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                        {isStreaming && index === messages.length - 1 && message.role === "assistant" && (
                          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-500" />
                        )}
                      </div>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.attachments.map((attachment, attachmentIndex) => (
                            <div
                              key={attachmentIndex}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-100 bg-emerald-700/30"
                            >
                              {attachment.type.startsWith("image/") ? (
                                <ImageIcon className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              <span className="max-w-[100px] truncate">{attachment.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isListening && currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-600/50 px-4 py-3 text-white">
                      <div className="text-sm italic whitespace-pre-wrap leading-relaxed">
                        {currentTranscript}
                        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-white" />
                      </div>
                    </div>
                  </div>
                )}

                {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-4xl px-4 py-3">
            {showPlayer && (
              <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <audio ref={audioRef} src={playback.sourceUrl ?? undefined} preload="metadata" className="hidden" />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <button
                    type="button"
                    onClick={() => void togglePlayback()}
                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                    title={playback.isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {playback.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-gray-900 dark:text-gray-100">Voice playback</span>
                      <span>
                        {formatPlaybackTime(playback.currentTime)} / {formatPlaybackTime(playback.duration)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={playback.duration || 0}
                      step={0.1}
                      value={Math.min(playback.currentTime, playback.duration || playback.currentTime)}
                      onChange={(event) => seekTo(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-emerald-200 accent-emerald-600 dark:bg-emerald-900"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span>Speed</span>
                    <select
                      value={playback.playbackRate}
                      onChange={(event) => setPlaybackRate(Number(event.target.value))}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                      {PLAYBACK_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}x
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingAttachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {attachment.type.startsWith("image/") ? (
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span className="max-w-[120px] truncate">{attachment.name}</span>
                    <span className="text-gray-400">({(attachment.size / 1024).toFixed(0)}KB)</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="ml-0.5 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={(event) => void handleSubmit(event)} className="flex items-end gap-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.docx,.doc,.xlsx,.xls,.pptx,.ppt"
                multiple
                onChange={handleFileSelect}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isConversationLoading}
                className="flex-shrink-0 rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={() => void handleMicTap()}
                  disabled={isStreaming || isConversationLoading || voiceState === "speaking" || voiceState === "processing"}
                  className={`flex-shrink-0 rounded-xl p-3 transition-all touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 sm:p-2.5 ${getMicButtonStyle()}`}
                  title={isListening ? "Tap to stop" : "Tap to speak"}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isListening ? <Square className="h-5 w-5 sm:h-4 sm:w-4" /> : <Mic className="h-5 w-5 sm:h-4 sm:w-4" />}
                </button>
              )}

              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? "Listening..."
                    : voiceModeActive && voiceState === "idle"
                      ? "Tap mic to speak..."
                      : "Type your response..."
                }
                rows={1}
                disabled={isStreaming || isListening || isConversationLoading}
                className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={(!input.trim() && pendingAttachments.length === 0) || isStreaming || isConversationLoading}
                className="flex-shrink-0 rounded-xl bg-emerald-600 p-2.5 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
