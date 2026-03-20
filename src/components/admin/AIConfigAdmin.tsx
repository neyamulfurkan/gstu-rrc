// src/components/admin/AIConfigAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bot, Send, Zap, RotateCcw, ChevronRight, Info } from "lucide-react";
import useSWR from "swr";

import { cn, formatDate } from "@/lib/utils";
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  PasswordInput,
  FormLabel,
} from "@/components/ui/Forms";
import {
  Badge,
  Alert,
  Spinner,
  Skeleton,
  toast,
} from "@/components/ui/Feedback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIConfig {
  aiEnabled: boolean;
  groqApiKey: string;
  groqModel: string;
  groqTemperature: number;
  groqMaxTokens: number;
  aiSystemPrompt: string;
  aiContextItems: {
    events: boolean;
    projects: boolean;
    committee: boolean;
    advisors: boolean;
    announcements: boolean;
    membershipInfo: boolean;
  };
  aiChatHistory: "session" | "none";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const PLACEHOLDER_VARS = [
  { key: "{{CLUB_NAME}}", description: "Club name from config" },
  { key: "{{UNIVERSITY_NAME}}", description: "University name" },
  { key: "{{EVENTS}}", description: "Upcoming events list" },
  { key: "{{PROJECTS}}", description: "Recent projects list" },
  { key: "{{COMMITTEE}}", description: "Current committee members" },
  { key: "{{ADVISORS}}", description: "Current advisors" },
  { key: "{{ANNOUNCEMENTS}}", description: "Active announcements" },
  { key: "{{MEMBERSHIP_INFO}}", description: "Membership fee and status" },
  { key: "{{MEMBER_COUNT}}", description: "Total active members count" },
  { key: "{{INSTRUMENTS_AVAILABLE}}", description: "Available instruments count" },
];

const MODEL_OPTIONS = [
  { value: "llama3-70b-8192", label: "LLaMA 3 70B (8192 context)" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B (32768 context)" },
  { value: "llama3-8b-8192", label: "LLaMA 3 8B (8192 context)" },
];

const HISTORY_OPTIONS = [
  { value: "session", label: "Session (localStorage)" },
  { value: "none", label: "No persistence" },
];

const DEFAULT_AI_CONFIG: AIConfig = {
  aiEnabled: false,
  groqApiKey: "",
  groqModel: "llama3-70b-8192",
  groqTemperature: 0.7,
  groqMaxTokens: 1000,
  aiSystemPrompt:
    "You are a helpful assistant for {{CLUB_NAME}} at {{UNIVERSITY_NAME}}. You help students and visitors learn about the club, its events, projects, and membership.\n\nCurrent Context:\n{{EVENTS}}\n{{PROJECTS}}\n{{COMMITTEE}}\n{{ANNOUNCEMENTS}}\n{{MEMBERSHIP_INFO}}",
  aiContextItems: {
    events: true,
    projects: true,
    committee: true,
    advisors: false,
    announcements: true,
    membershipInfo: true,
  },
  aiChatHistory: "session",
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// ─── Switch Component (inline) ────────────────────────────────────────────────

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  const switchId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : "switch");
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-elevated)]",
          disabled ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0",
            "transition duration-200 ease-in-out",
            "bg-white",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Temperature Slider ───────────────────────────────────────────────────────

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function TemperatureSlider({ value, onChange }: TemperatureSliderProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <FormLabel>Temperature</FormLabel>
        <span className="text-sm font-mono font-semibold text-[var(--color-accent)]">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-[var(--color-bg-elevated)]",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-[var(--color-accent)]",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:bg-[var(--color-accent)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
          )}
          aria-label={`Temperature: ${value.toFixed(1)}`}
        />
        <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mt-1">
          <span>Precise (0.0)</span>
          <span>Creative (1.0)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Test Chat ───────────────────────────────────────────────────────────

interface MiniTestChatProps {
  disabled: boolean;
}

function MiniTestChat({ disabled }: MiniTestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isLoading || disabled) return;

    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: "user", content },
          ],
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantContent =
        data.type === "text"
          ? data.content
          : JSON.stringify(data.data, null, 2);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantContent ?? "No response received.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reach the AI endpoint.";
      setError(message);
      // Remove the user message on error so it's not left hanging
      setMessages((prev) => prev.filter((m) => m !== userMessage));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, disabled, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-[var(--color-accent)]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Test Chat
          </span>
          {disabled && (
            <Badge variant="warning" size="sm">
              AI Disabled
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={clearChat}
          aria-label="Clear chat"
          className={cn(
            "flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]",
            "hover:text-[var(--color-text-primary)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded px-2 py-1"
          )}
        >
          <RotateCcw size={12} aria-hidden="true" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Bot size={32} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {disabled
                ? "Enable AI to start testing."
                : "Send a message to test the AI configuration."}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-2.5",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                msg.role === "user"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
              )}
              aria-hidden="true"
            >
              {msg.role === "user" ? "U" : <Bot size={14} />}
            </div>
            <div
              className={cn(
                "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-[var(--color-primary)] text-white rounded-tr-sm"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-tl-sm border border-[var(--color-border)]"
              )}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
              </p>
              <p
                className={cn(
                  "text-xs mt-1",
                  msg.role === "user"
                    ? "text-white/60 text-right"
                    : "text-[var(--color-text-secondary)]"
                )}
              >
                {formatDate(msg.timestamp, "relative")}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
              <Bot size={14} className="text-[var(--color-accent)]" aria-hidden="true" />
            </div>
            <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert
            variant="error"
            message={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-bg-elevated)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder={disabled ? "Enable AI first…" : "Type a test message… (Enter to send)"}
            rows={1}
            aria-label="Test message input"
            className={cn(
              "flex-1 min-h-[36px] max-h-24 resize-none rounded-lg px-3 py-2 text-sm",
              "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "overflow-hidden"
            )}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(96, el.scrollHeight)}px`;
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || disabled}
            aria-label="Send test message"
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
              "bg-[var(--color-accent)] text-[var(--color-text-inverse)]",
              "transition-opacity duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Spinner size="sm" className="text-[var(--color-text-inverse)]" />
            ) : (
              <Send size={15} aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
          Press <kbd className="font-mono bg-[var(--color-bg-surface)] px-1 rounded border border-[var(--color-border)]">Enter</kbd> to send,{" "}
          <kbd className="font-mono bg-[var(--color-bg-surface)] px-1 rounded border border-[var(--color-border)]">Shift+Enter</kbd> for newline
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIConfigAdmin(): JSX.Element {
  const { data, error: fetchError, isLoading, mutate } = useSWR<{
    data: {
      aiEnabled: boolean;
      groqModel: string;
      groqTemperature: number;
      aiSystemPrompt: string;
      aiContextItems: AIConfig["aiContextItems"];
      aiChatHistory: "session" | "none";
    };
  }>("/api/config?admin=true&fields=ai", fetcher, {
    revalidateOnFocus: false,
  });

  const [formState, setFormState] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqMaxTokens, setGroqMaxTokens] = useState("1000");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Populate form state from fetched data
  useEffect(() => {
    if (data?.data && !initialized) {
      const d = data.data;
      setFormState({
        aiEnabled: d.aiEnabled ?? false,
        groqApiKey: "",
        groqModel: d.groqModel ?? DEFAULT_AI_CONFIG.groqModel,
        groqTemperature: d.groqTemperature ?? DEFAULT_AI_CONFIG.groqTemperature,
        groqMaxTokens: DEFAULT_AI_CONFIG.groqMaxTokens,
        aiSystemPrompt: d.aiSystemPrompt ?? DEFAULT_AI_CONFIG.aiSystemPrompt,
        aiContextItems: {
          events: d.aiContextItems?.events ?? true,
          projects: d.aiContextItems?.projects ?? true,
          committee: d.aiContextItems?.committee ?? true,
          advisors: d.aiContextItems?.advisors ?? false,
          announcements: d.aiContextItems?.announcements ?? true,
          membershipInfo: d.aiContextItems?.membershipInfo ?? true,
        },
        aiChatHistory: d.aiChatHistory ?? "session",
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  const updateField = useCallback(
    <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateContextItem = useCallback(
    (key: keyof AIConfig["aiContextItems"], value: boolean) => {
      setFormState((prev) => ({
        ...prev,
        aiContextItems: { ...prev.aiContextItems, [key]: value },
      }));
    },
    []
  );

  const insertPlaceholder = useCallback((placeholder: string) => {
    setFormState((prev) => ({
      ...prev,
      aiSystemPrompt: prev.aiSystemPrompt + " " + placeholder,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);

    try {
      const maxTokensParsed = parseInt(groqMaxTokens, 10);
      const body: Record<string, unknown> = {
        tab: "ai",
        aiEnabled: formState.aiEnabled,
        groqModel: formState.groqModel,
        groqTemperature: formState.groqTemperature,
        // groqMaxTokens is not a DB field — omitted from payload
        aiSystemPrompt: formState.aiSystemPrompt,
        aiContextItems: formState.aiContextItems,
        aiChatHistory: formState.aiChatHistory,
      };

      // Only send the API key if it was changed (not empty)
      if (groqApiKey.trim()) {
        body.groqApiKey = groqApiKey.trim();
      }

      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message ?? `Save failed (HTTP ${response.status})`);
      }

      await mutate();
      toast("AI configuration saved successfully.", "success");

      // Clear the API key field after successful save
      if (groqApiKey.trim()) {
        setGroqApiKey("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save configuration.";
      setSaveError(message);
      toast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }, [formState, groqApiKey, groqMaxTokens, mutate]);

  const contextItemLabels: Record<keyof AIConfig["aiContextItems"], string> = {
    events: "Upcoming Events",
    projects: "Recent Projects",
    committee: "Committee Members",
    advisors: "Club Advisors",
    announcements: "Active Announcements",
    membershipInfo: "Membership Information",
  };

  const contextItemDescriptions: Record<keyof AIConfig["aiContextItems"], string> = {
    events: "Inject next 5 upcoming events into system prompt",
    projects: "Inject latest 5 published projects",
    committee: "Inject current committee member names and designations",
    advisors: "Inject current advisor names and designations",
    announcements: "Inject active announcement titles and excerpts",
    membershipInfo: "Inject membership fee, bKash/Nagad numbers, and registration status",
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <Alert
          variant="error"
          title="Failed to load AI configuration"
          message="Could not retrieve the current AI settings. Please refresh the page."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            AI Configuration
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Configure the Groq-powered AI assistant for your club website.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={formState.aiEnabled ? "success" : "neutral"}
            size="md"
          >
            {formState.aiEnabled ? "AI Active" : "AI Inactive"}
          </Badge>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold",
              "bg-[var(--color-accent)] text-[var(--color-text-inverse)]",
              "transition-opacity duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving…
              </>
            ) : (
              <>
                <Zap size={15} aria-hidden="true" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <Alert
          variant="error"
          title="Save failed"
          message={saveError}
          dismissible
          onDismiss={() => setSaveError(null)}
        />
      )}

      {/* Enable AI Toggle — prominent */}
      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-5">
        <Switch
          id="ai-enabled"
          checked={formState.aiEnabled}
          onChange={(val) => updateField("aiEnabled", val)}
          label="Enable AI Assistant"
          description="When enabled, a floating AI chat widget appears on all public pages. The assistant uses the Groq API with your configured system prompt and context."
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left / Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* API & Model Settings */}
          <section
            aria-labelledby="api-settings-heading"
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-5"
          >
            <h2
              id="api-settings-heading"
              className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2"
            >
              <Zap size={16} className="text-[var(--color-accent)]" aria-hidden="true" />
              API & Model Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Groq API Key */}
              <div className="sm:col-span-2">
                <PasswordInput
                  id="groq-api-key"
                  label="Groq API Key"
                  placeholder="gsk_••••••••••••••••••••••••••••••••"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Leave blank to keep the existing key. The current key is masked for security.
                  Get your key at{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    console.groq.com
                  </a>
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <Select
                  id="groq-model"
                  label="AI Model"
                  value={formState.groqModel}
                  onChange={(e) => updateField("groqModel", e.target.value)}
                  options={MODEL_OPTIONS}
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  LLaMA 3 70B is recommended for best quality.
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <Input
                  id="groq-max-tokens"
                  label="Max Tokens"
                  type="number"
                  min={100}
                  max={4000}
                  step={100}
                  value={groqMaxTokens}
                  onChange={(e) => setGroqMaxTokens(e.target.value)}
                  placeholder="1000"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Maximum tokens per response (100–4000). Default: 1000.
                </p>
              </div>

              {/* Temperature */}
              <div className="sm:col-span-2">
                <TemperatureSlider
                  value={formState.groqTemperature}
                  onChange={(val) => updateField("groqTemperature", val)}
                />
              </div>
            </div>
          </section>

          {/* System Prompt */}
          <section
            aria-labelledby="system-prompt-heading"
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4"
          >
            <h2
              id="system-prompt-heading"
              className="text-base font-semibold text-[var(--color-text-primary)]"
            >
              System Prompt
            </h2>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Textarea */}
              <div className="xl:col-span-2">
                <Textarea
                  id="ai-system-prompt"
                  label="Prompt Template"
                  value={formState.aiSystemPrompt}
                  onChange={(e) => updateField("aiSystemPrompt", e.target.value)}
                  rows={10}
                  placeholder="You are a helpful assistant for {{CLUB_NAME}}…"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
                  Use the placeholder variables listed on the right. They are replaced with live data from your database at runtime.
                </p>
              </div>

              {/* Placeholder hints */}
              <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Info size={13} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                    Available Variables
                  </span>
                </div>
                <ul className="space-y-2" role="list">
                  {PLACEHOLDER_VARS.map(({ key, description }) => (
                    <li key={key} className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => insertPlaceholder(key)}
                        className={cn(
                          "text-left text-xs font-mono font-semibold text-[var(--color-accent)]",
                          "hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] rounded",
                          "flex items-center gap-1"
                        )}
                        title={`Insert ${key}`}
                        aria-label={`Insert ${key} into system prompt`}
                      >
                        <ChevronRight size={10} aria-hidden="true" />
                        {key}
                      </button>
                      <span className="text-xs text-[var(--color-text-secondary)] pl-4">
                        {description}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--color-text-secondary)] mt-3 border-t border-[var(--color-border)] pt-3">
                  Click a variable to insert it at the end of the prompt.
                </p>
              </div>
            </div>
          </section>

          {/* Context Items */}
          <section
            aria-labelledby="context-items-heading"
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-5"
          >
            <div>
              <h2
                id="context-items-heading"
                className="text-base font-semibold text-[var(--color-text-primary)]"
              >
                Context Injection
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Select which live data to inject into the system prompt for each AI call. Enabling more context improves answers but uses more tokens.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                Object.keys(formState.aiContextItems) as Array<
                  keyof AIConfig["aiContextItems"]
                >
              ).map((key) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border transition-colors duration-150",
                    formState.aiContextItems[key]
                      ? "bg-[var(--color-accent)]/5 border-[var(--color-accent)]/30"
                      : "bg-[var(--color-bg-elevated)] border-[var(--color-border)]"
                  )}
                >
                  <Checkbox
                    id={`context-${key}`}
                    checked={formState.aiContextItems[key]}
                    onChange={(e) => updateContextItem(key, e.target.checked)}
                    label={contextItemLabels[key]}
                    description={contextItemDescriptions[key]}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Chat History */}
          <section
            aria-labelledby="chat-history-heading"
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4"
          >
            <h2
              id="chat-history-heading"
              className="text-base font-semibold text-[var(--color-text-primary)]"
            >
              Chat History Retention
            </h2>
            <div className="max-w-sm">
              <Select
                id="ai-chat-history"
                label="History Mode"
                value={formState.aiChatHistory}
                onChange={(e) =>
                  updateField(
                    "aiChatHistory",
                    e.target.value as "session" | "none"
                  )
                }
                options={HISTORY_OPTIONS}
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
                {formState.aiChatHistory === "session"
                  ? "Conversation history is stored in the visitor's browser localStorage under \"gstu-ai-chat\" and persists until cleared."
                  : "No conversation history is stored. Each page load starts a fresh conversation with no memory of past messages."}
              </p>
            </div>
          </section>

          {/* Test Chat */}
          <section
            aria-labelledby="test-chat-heading"
            className="space-y-4"
          >
            <h2
              id="test-chat-heading"
              className="text-base font-semibold text-[var(--color-text-primary)]"
            >
              Test AI Assistant
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Send test messages to verify your configuration. Uses the{" "}
              <strong className="text-[var(--color-text-primary)]">
                currently saved
              </strong>{" "}
              configuration — remember to save before testing.
            </p>
            <MiniTestChat disabled={!formState.aiEnabled} />
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Status */}
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Configuration Status
            </h3>
            <ul className="space-y-3">
              <StatusRow
                label="AI Enabled"
                status={formState.aiEnabled ? "active" : "inactive"}
                value={formState.aiEnabled ? "Yes" : "No"}
              />
              <StatusRow
                label="Model"
                status="info"
                value={MODEL_OPTIONS.find((m) => m.value === formState.groqModel)?.label ?? formState.groqModel}
              />
              <StatusRow
                label="Temperature"
                status="info"
                value={formState.groqTemperature.toFixed(1)}
              />
              <StatusRow
                label="Max Tokens"
                status="info"
                value={groqMaxTokens || "1000"}
              />
              <StatusRow
                label="Context Items"
                status="info"
                value={`${Object.values(formState.aiContextItems).filter(Boolean).length} / ${Object.keys(formState.aiContextItems).length} active`}
              />
              <StatusRow
                label="Chat History"
                status="info"
                value={formState.aiChatHistory === "session" ? "localStorage" : "None"}
              />
              <StatusRow
                label="API Key"
                status={groqApiKey.trim() ? "active" : "info"}
                value={groqApiKey.trim() ? "Pending save" : "Using stored key"}
              />
            </ul>
          </div>

          {/* Usage Tips */}
          <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Tips
            </h3>
            <ul className="space-y-2.5 text-xs text-[var(--color-text-secondary)]">
              <li className="flex gap-2">
                <ChevronRight size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" aria-hidden="true" />
                Keep the system prompt concise. Long prompts consume tokens on every call.
              </li>
              <li className="flex gap-2">
                <ChevronRight size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" aria-hidden="true" />
                Use temperature 0.3–0.5 for factual club information, 0.7–0.9 for more conversational responses.
              </li>
              <li className="flex gap-2">
                <ChevronRight size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" aria-hidden="true" />
                Enable only the context items you reference in your system prompt to avoid wasting tokens.
              </li>
              <li className="flex gap-2">
                <ChevronRight size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" aria-hidden="true" />
                The Groq free tier has generous rate limits, but set max tokens to 500–800 to stay within them.
              </li>
              <li className="flex gap-2">
                <ChevronRight size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" aria-hidden="true" />
                Facebook auto-reply uses the same API key and model — budget tokens accordingly.
              </li>
            </ul>
          </div>

          {/* Save Button (sticky for long forms) */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold",
              "bg-[var(--color-accent)] text-[var(--color-text-inverse)]",
              "transition-opacity duration-150 shadow-[var(--shadow-glow-accent)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                Saving…
              </>
            ) : (
              <>
                <Zap size={16} aria-hidden="true" />
                Save AI Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Row Helper ────────────────────────────────────────────────────────

interface StatusRowProps {
  label: string;
  status: "active" | "inactive" | "info";
  value: string;
}

function StatusRow({ label, status, value }: StatusRowProps) {
  const variantMap: Record<StatusRowProps["status"], "success" | "error" | "neutral"> = {
    active: "success",
    inactive: "error",
    info: "neutral",
  };
  return (
    <li className="flex items-start justify-between gap-2">
      <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0">
        {label}
      </span>
      <Badge variant={variantMap[status]} size="sm" className="text-right max-w-[60%] truncate">
        {value}
      </Badge>
    </li>
  );
}