// src/components/layout/AIAssistant.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bot, Send, X, ChevronDown, Zap, Calendar, Users } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/Feedback";
import { type ClubConfigPublic } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroqMessage {
  role: "user" | "assistant";
  content: string;
}

interface StructuredDataItem {
  title: string;
  subtitle?: string;
  badge?: string;
  link?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  structured?: {
    type: string;
    items: StructuredDataItem[];
  };
  createdAt: Date;
}

interface AIAssistantProps {
  config: Pick<
    ClubConfigPublic,
    "aiEnabled" | "aiChatHistory" | "clubName" | "logoUrl"
  >
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "gstu-ai-chat";
const MAX_MESSAGES = 20;
const MAX_CHARS = 500;

const STARTER_CHIPS = [
  { label: "Tell me about upcoming events", icon: Calendar },
  { label: "How do I join the club?", icon: Users },
  { label: "Show me recent projects", icon: Zap },
];

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator(): JSX.Element {
  return (
    <div className="flex items-end gap-2 px-4 py-2">
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)" }}
      >
        <Bot size={14} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
      </div>
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full"
            style={{
              background: "var(--color-text-secondary)",
              animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Structured Card ─────────────────────────────────────────────────────────

function StructuredCard({ item }: { item: StructuredDataItem }): JSX.Element {
  const Wrapper = item.link ? "a" : "div";
  const wrapperProps = item.link
    ? { href: item.link, target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "block rounded-lg p-3 transition-all duration-150",
        "border",
        item.link
          ? "hover:border-[var(--color-accent)] hover:shadow-[0_0_8px_var(--color-glow-accent)] cursor-pointer"
          : ""
      )}
      style={{
        background: "var(--color-bg-base)",
        borderColor: "var(--color-border)",
      }}
    >
      <p
        className="text-xs font-semibold leading-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {item.title}
      </p>
      {item.subtitle && (
        <p
          className="text-xs mt-0.5 leading-tight"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {item.subtitle}
        </p>
      )}
      {item.badge && (
        <span
          className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
          style={{
            background: "var(--color-accent)/15",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)/30",
          }}
        >
          {item.badge}
        </span>
      )}
    </Wrapper>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  clubName,
}: {
  message: ChatMessage;
  clubName: string;
}): JSX.Element {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <div
      className={cn(
        "flex items-end gap-2 px-4 py-1.5 animate-[fadeSlideUp_0.25s_ease-out_both]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isUser && (
        <div
          className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 self-start mt-0.5"
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
          }}
          aria-hidden="true"
        >
          <Bot size={14} style={{ color: "var(--color-accent)" }} />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5 max-w-[78%]", isUser ? "items-end" : "items-start")}>
        {/* Text bubble */}
        <div
          className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
          style={
            isUser
              ? {
                  background: "var(--color-primary)",
                  color: "var(--color-text-inverse)",
                  borderRadius: "18px 18px 4px 18px",
                }
              : isError
              ? {
                  background: "var(--color-error)/10",
                  border: "1px solid var(--color-error)/30",
                  color: "var(--color-error)",
                  borderRadius: "18px 18px 18px 4px",
                }
              : {
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  borderRadius: "18px 18px 18px 4px",
                }
          }
        >
          {message.content}
        </div>

        {/* Structured data cards */}
        {message.structured && message.structured.items.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {message.structured.items.map((item, idx) => (
              <StructuredCard key={idx} item={item} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <time
          className="text-[10px] px-1"
          style={{ color: "var(--color-text-secondary)" }}
          dateTime={message.createdAt.toISOString()}
        >
          {formatDate(message.createdAt, "relative")}
        </time>
      </div>
    </div>
  );
}

// ─── Chat Panel Header ────────────────────────────────────────────────────────

function ChatHeader({
  clubName,
  onClose,
}: {
  clubName: string;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 flex-shrink-0"
      style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-elevated)",
        borderRadius: "12px 12px 0 0",
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: "var(--color-primary)/15", border: "1px solid var(--color-primary)/30" }}
        >
          <Bot size={16} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
        </div>
        <div>
          <p
            className="text-sm font-semibold leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {clubName} AI
          </p>
          <p className="text-xs" style={{ color: "var(--color-success)" }}>
            • Online
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close AI chat"
        className="rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-2"
        style={{
          color: "var(--color-text-secondary)",
          outlineColor: "var(--color-accent)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--color-text-primary)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--color-text-secondary)")
        }
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Starter Chips ────────────────────────────────────────────────────────────

function StarterChips({
  onSelect,
}: {
  onSelect: (text: string) => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl mb-2"
        style={{
          background: "var(--color-primary)/10",
          border: "1px solid var(--color-primary)/20",
        }}
      >
        <Bot size={24} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
      </div>
      <p
        className="text-sm font-medium text-center"
        style={{ color: "var(--color-text-primary)" }}
      >
        How can I help you?
      </p>
      <p
        className="text-xs text-center mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Ask me anything about the club
      </p>
      <div className="flex flex-col gap-2 w-full">
        {STARTER_CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => onSelect(chip.label)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-left",
                "transition-all duration-150 w-full",
                "focus:outline-none focus:ring-2"
              )}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                outlineColor: "var(--color-accent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)/60";
                e.currentTarget.style.background = "var(--color-bg-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "var(--color-bg-elevated)";
              }}
            >
              <Icon
                size={15}
                style={{ color: "var(--color-accent)", flexShrink: 0 }}
                aria-hidden="true"
              />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistant({ config }: AIAssistantProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (config.aiChatHistory === "session" || config.aiChatHistory === "persistent") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Array<Omit<ChatMessage, "createdAt"> & { createdAt: string }> =
            JSON.parse(stored);
          const restored: ChatMessage[] = parsed.map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }));
          setMessages(restored.slice(-MAX_MESSAGES));
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [config.aiChatHistory]);

  // Persist messages to localStorage
  useEffect(() => {
    if (
      (config.aiChatHistory === "session" || config.aiChatHistory === "persistent") &&
      messages.length > 0
    ) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
      } catch {
        // ignore storage errors
      }
    }
  }, [messages, config.aiChatHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const generateId = () =>
    `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      };

      setMessages((prev) => {
        const updated = [...prev, userMessage];
        return updated.slice(-MAX_MESSAGES);
      });
      setInputValue("");
      setIsTyping(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        // Build messages for API (exclude error messages)
        const apiMessages = [...messages, userMessage]
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-MAX_MESSAGES)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        let assistantMessage: ChatMessage;

        if (data.type === "structured" && data.data) {
          // Parse structured response into items
          const structured = data.data as Record<string, unknown>;
          const items: StructuredDataItem[] = [];

          if (Array.isArray(structured.events)) {
            (structured.events as Array<Record<string, string>>).forEach((ev) => {
              items.push({
                title: ev.title ?? ev.name ?? "Event",
                subtitle: ev.date ? formatDate(ev.date, "short") : ev.venue,
                badge: "Event",
                link: ev.slug ? `/events/${ev.slug}` : undefined,
              });
            });
          } else if (Array.isArray(structured.projects)) {
            (structured.projects as Array<Record<string, string>>).forEach((pr) => {
              items.push({
                title: pr.title ?? pr.name ?? "Project",
                subtitle: Array.isArray(pr.technologies)
                  ? (pr.technologies as string[]).join(", ")
                  : pr.status,
                badge: pr.status ?? "Project",
                link: pr.slug ? `/projects/${pr.slug}` : undefined,
              });
            });
          } else if (Array.isArray(structured.items)) {
            (structured.items as Array<Record<string, string>>).forEach((it) => {
              items.push({
                title: it.title ?? it.name ?? String(it),
                subtitle: it.subtitle ?? it.description,
                badge: it.badge ?? it.type,
                link: it.link ?? it.url,
              });
            });
          }

          const textContent =
            typeof structured.message === "string"
              ? structured.message
              : items.length > 0
              ? `Here are ${items.length} result(s) I found:`
              : "Here is what I found:";

          assistantMessage = {
            id: generateId(),
            role: "assistant",
            content: textContent,
            structured: items.length > 0 ? { type: String(structured.type ?? "list"), items } : undefined,
            createdAt: new Date(),
          };
        } else {
          const content =
            typeof data.content === "string" && data.content.trim()
              ? data.content
              : "I'm sorry, I couldn't process your request right now. Please try again later.";

          assistantMessage = {
            id: generateId(),
            role: "assistant",
            content,
            createdAt: new Date(),
          };
        }

        setMessages((prev) => [...prev, assistantMessage].slice(-MAX_MESSAGES));
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "error",
          content: "Sorry, I couldn't reach the server. Please try again.",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage].slice(-MAX_MESSAGES));
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length > MAX_CHARS) return;
      setInputValue(val);
      // Auto grow
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(120, el.scrollHeight)}px`;
    },
    []
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  if (!config.aiEnabled) return null;

  const charsLeft = MAX_CHARS - inputValue.length;
  const isNearLimit = charsLeft <= 50;

  // ─── Chat Panel Content ─────────────────────────────────────────────────────

  const chatPanelContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--color-bg-surface)" }}
    >
      <ChatHeader clubName={config.clubName} onClose={() => setIsOpen(false)} />

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto py-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-border) transparent" }}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <StarterChips onSelect={sendMessage} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} clubName={config.clubName} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg-elevated)" }}
      >
        {messages.length > 0 && (
          <div className="flex justify-end mb-1.5">
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs px-2 py-0.5 rounded transition-colors focus:outline-none"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-error)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
            >
              Clear chat
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything…"
              rows={1}
              aria-label="Chat message input"
              className="block w-full resize-none rounded-xl px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 disabled:opacity-50"
              style={{
                background: "var(--color-bg-base)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                minHeight: "40px",
                maxHeight: "120px",
                outlineColor: "var(--color-accent)",
                scrollbarWidth: "none",
              }}
              disabled={isTyping}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send message"
            className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--color-primary)",
              color: "#fff",
              outlineColor: "var(--color-accent)",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled)
                e.currentTarget.style.background = "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-primary)";
            }}
          >
            {isTyping ? (
              <Spinner size="sm" />
            ) : (
              <Send size={15} aria-hidden="true" />
            )}
          </button>
        </form>
        <div className="flex justify-end mt-1">
          <span
            className="text-xs"
            style={{ color: isNearLimit ? "var(--color-warning)" : "var(--color-text-secondary)" }}
          >
            {charsLeft}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );

  // ─── Trigger Button ─────────────────────────────────────────────────────────

  const triggerButton = (
    <button
      type="button"
      onClick={() => setIsOpen((prev) => !prev)}
      aria-label={isOpen ? "Close AI chat" : "Open AI chat assistant"}
      aria-expanded={isOpen}
      className={cn(
        "fixed z-40 flex items-center justify-center w-14 h-14 rounded-full",
        "shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
        "md:bottom-6 bottom-[88px]",
        "right-5"
      )}
      style={{
        background: "var(--color-primary)",
        boxShadow: "0 0 20px var(--color-glow-primary), 0 4px 24px rgba(0,0,0,0.4)",
        outlineColor: "var(--color-accent)",
        outlineOffset: "2px",
        animation: isOpen ? "none" : "pulseGlow 2.5s ease-in-out infinite",
      }}
    >
      {isOpen ? (
        <ChevronDown size={22} color="#fff" aria-hidden="true" />
      ) : (
        <Bot size={22} color="#fff" aria-hidden="true" />
      )}
    </button>
  );

  // ─── Desktop Chat Card ──────────────────────────────────────────────────────

  const desktopCard = isOpen && !isMobile && (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="AI chat assistant"
      aria-modal="false"
      className="fixed z-40 overflow-hidden"
      style={{
        width: "380px",
        height: "520px",
        bottom: "88px",
        right: "24px",
        borderRadius: "16px",
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        backdropFilter: "blur(32px) saturate(200%)",
        animation: "fadeSlideUp 0.25s ease-out both",
      }}
    >
      {chatPanelContent}
    </div>
  );

  // ─── Mobile Drawer ──────────────────────────────────────────────────────────

  const mobileDrawer = isOpen && isMobile && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "var(--color-bg-overlay)" }}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="AI chat assistant"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 overflow-hidden"
        style={{
          height: "85dvh",
          borderRadius: "16px 16px 0 0",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          animation: "slideInUp 0.3s ease-out both",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-0.5">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--color-border)" }}
            aria-hidden="true"
          />
        </div>
        <div className="h-full pb-safe">
          {chatPanelContent}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px var(--color-glow-primary), 0 4px 24px rgba(0,0,0,0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 32px var(--color-glow-primary), 0 8px 32px rgba(0,0,0,0.5); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {triggerButton}
      {desktopCard}
      {mobileDrawer}
    </>
  );
}