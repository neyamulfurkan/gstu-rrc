// src/components/admin/FacebookAdmin.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import useSWR from "swr";
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  Facebook,
  Link2,
  MessageCircle,
  MessageSquare,
  Newspaper,
  Power,
  RefreshCw,
  Send,
  Settings,
  Share2,
  Unlink,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, Textarea, Checkbox } from "@/components/ui/Forms";
import { Alert, Badge, Spinner, toast } from "@/components/ui/Feedback";
import type { ClubConfigPublic } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacebookConfig {
  fbPageId?: string;
  fbPageName?: string;
  fbUrl?: string;
  fbAutoPost?: {
    events?: boolean;
    projects?: boolean;
    announcements?: boolean;
    gallery?: boolean;
    eventTemplate?: string;
    projectTemplate?: string;
    announcementTemplate?: string;
    galleryTemplate?: string;
  };
  fbAutoReplyComments?: boolean;
  fbCommentReplyPrompt?: string;
  fbCommentSystemPrompt?: string;
  fbCommentReplyDelay?: number;
  fbAutoReplyMessages?: boolean;
  fbMessageReplyPrompt?: string;
  fbMessageSystemPrompt?: string;
  fbGreetingMessage?: string;
  fbFallbackMessage?: string;
}

interface TestMessage {
  role: "user" | "assistant";
  content: string;
}

type TabId = "connection" | "auto-post" | "comment-replies" | "message-replies" | "test";

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "connection", label: "Connection", icon: <Link2 size={16} /> },
  { id: "auto-post", label: "Auto-Post", icon: <Share2 size={16} /> },
  { id: "comment-replies", label: "Comment Replies", icon: <MessageCircle size={16} /> },
  { id: "message-replies", label: "Message Replies", icon: <MessageSquare size={16} /> },
  { id: "test", label: "Test AI Reply", icon: <Bot size={16} /> },
];

const DEFAULT_EVENT_TEMPLATE =
  "🎉 New Event: {{title}}\n📅 {{date}}\n📍 {{venue}}\n\n{{description}}\n\nLearn more: {{url}}";
const DEFAULT_PROJECT_TEMPLATE =
  "🚀 New Project: {{title}}\n🛠️ {{technologies}}\n\n{{description}}\n\nView details: {{url}}";
const DEFAULT_ANNOUNCEMENT_TEMPLATE =
  "📢 {{title}}\n\n{{excerpt}}\n\nRead more: {{url}}";
const DEFAULT_GALLERY_TEMPLATE =
  "📸 New photos added to our gallery!\n\n{{count}} new items — check them out: {{url}}";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Main Component ───────────────────────────────────────────────────────────

export function FacebookAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("connection");
  const { mutate } = useSWRConfig();

  const { data: configData, isLoading: configLoading } = useSWR<{ data: ClubConfigPublic & FacebookConfig }>(
    "/api/config",
    fetcher,
    { revalidateOnFocus: false, revalidateOnMount: true }
  );

  const fbConfig = configData?.data as (ClubConfigPublic & FacebookConfig) | undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20">
          <Facebook size={20} className="text-[#1877F2]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
            Facebook Integration
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage auto-posting, comment replies, and Messenger integration
          </p>
        </div>
        {fbConfig?.fbPageId && (
          <Badge variant="success" size="sm" className="ml-auto">
            <CheckCircle size={12} />
            Connected
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg",
              "whitespace-nowrap transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-base)]",
              activeTab === tab.id
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {configLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" label="Loading Facebook configuration..." />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === "connection" && (
            <ConnectionTab fbConfig={fbConfig} onMutate={() => mutate("/api/config")} />
          )}
          {activeTab === "auto-post" && (
            <AutoPostTab fbConfig={fbConfig} onMutate={() => mutate("/api/config")} />
          )}
          {activeTab === "comment-replies" && (
            <CommentRepliesTab fbConfig={fbConfig} onMutate={() => mutate("/api/config")} />
          )}
          {activeTab === "message-replies" && (
            <MessageRepliesTab fbConfig={fbConfig} onMutate={() => mutate("/api/config")} />
          )}
          {activeTab === "test" && (
            <TestTab fbConfig={fbConfig} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Connection Tab ───────────────────────────────────────────────────────────

interface ConnectionTabProps {
  fbConfig?: ClubConfigPublic & FacebookConfig;
  onMutate: () => void;
}

function ConnectionTab({ fbConfig, onMutate }: ConnectionTabProps): JSX.Element {
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = !!fbConfig?.fbPageId;

  const handleConnect = useCallback(() => {
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID ?? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? (typeof window !== "undefined" ? (window as any).__NEXT_PUBLIC_FB_APP_ID : "") ?? "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    if (!appId) {
      toast("FB_APP_ID is not configured. Contact the developer.", "error");
      return;
    }
    const redirectUri = encodeURIComponent(`${baseUrl.replace(/\/+$/, "")}/admin/facebook`);
    const scope = "pages_manage_posts,pages_read_engagement,pages_messaging,pages_manage_metadata";
    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=fbconnect`;
    window.location.href = oauthUrl;
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm("Disconnect your Facebook page? Auto-posting and auto-replies will stop.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: "facebook",
          fbPageId: "",
          fbPageToken: "",
          fbWebhookToken: "",
        }),
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast("Facebook page disconnected.", "success");
      onMutate();
    } catch {
      toast("Failed to disconnect. Please try again.", "error");
    } finally {
      setDisconnecting(false);
    }
  }, [onMutate]);

  return (
    <div className="max-w-xl space-y-6">
      {/* Status Card */}
      <div
        className={cn(
          "rounded-xl border p-6",
          isConnected
            ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
            : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0",
              isConnected
                ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
            )}
          >
            {isConnected ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
              {isConnected ? "Page Connected" : "No Page Connected"}
            </h3>
            {isConnected ? (
              <>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Connected to:{" "}
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {fbConfig?.fbPageName ?? "Facebook Page"}
                  </span>
                </p>
                {fbConfig?.fbUrl && (
                  <a
                    href={fbConfig.fbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-[var(--color-accent)] hover:underline"
                  >
                    <Facebook size={12} />
                    Visit Page
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Connect a Facebook page to enable auto-posting and automated replies.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={handleConnect}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                  "border border-[var(--color-border)] hover:border-[var(--color-accent)]/50",
                  "transition-colors duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <RefreshCw size={15} />
                Reconnect / Switch Page
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-[var(--color-error)]/10 text-[var(--color-error)]",
                  "border border-[var(--color-error)]/20 hover:bg-[var(--color-error)]/15",
                  "transition-colors duration-150 disabled:opacity-60",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]"
                )}
              >
                {disconnecting ? <Spinner size="sm" /> : <Unlink size={15} />}
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold",
                "bg-[#1877F2] text-white hover:bg-[#1568D3]",
                "transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
              )}
            >
              <Facebook size={16} />
              Connect Facebook Page
            </button>
          )}
        </div>
      </div>

      {/* Permissions Info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <Settings size={15} />
          Required Permissions
        </h4>
        <ul className="space-y-2">
          {[
            { perm: "pages_manage_posts", desc: "Post content to your Facebook page" },
            { perm: "pages_read_engagement", desc: "Read page comments and engagement" },
            { perm: "pages_messaging", desc: "Send and receive Messenger messages" },
            { perm: "pages_manage_metadata", desc: "Manage page webhooks and settings" },
          ].map(({ perm, desc }) => (
            <li key={perm} className="flex items-start gap-2.5 text-sm">
              <CheckCircle
                size={14}
                className={cn(
                  "mt-0.5 flex-shrink-0",
                  isConnected ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"
                )}
              />
              <span>
                <code className="font-mono text-xs text-[var(--color-accent)]">{perm}</code>
                <span className="text-[var(--color-text-secondary)]"> — {desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Webhook Info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
          <Zap size={15} />
          Webhook Endpoint
        </h4>
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">
          Set this as your Facebook App webhook URL for comment and message events:
        </p>
        <code className="block w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] text-xs text-[var(--color-accent)] font-mono border border-[var(--color-border)] break-all select-all">
          {typeof window !== "undefined"
            ? `${window.location.origin}/api/webhooks/facebook`
            : "/api/webhooks/facebook"}
        </code>
      </div>
    </div>
  );
}

// ─── Auto-Post Tab ────────────────────────────────────────────────────────────

interface AutoPostTabProps {
  fbConfig?: ClubConfigPublic & FacebookConfig;
  onMutate: () => void;
}

function AutoPostTab({ fbConfig, onMutate }: AutoPostTabProps): JSX.Element {
  const autoPost = fbConfig?.fbAutoPost ?? {};

  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    eventsEnabled: autoPost.events ?? false,
    projectsEnabled: autoPost.projects ?? false,
    announcementsEnabled: autoPost.announcements ?? false,
    galleryEnabled: autoPost.gallery ?? false,
    eventTemplate: autoPost.eventTemplate ?? DEFAULT_EVENT_TEMPLATE,
    projectTemplate: autoPost.projectTemplate ?? DEFAULT_PROJECT_TEMPLATE,
    announcementTemplate: autoPost.announcementTemplate ?? DEFAULT_ANNOUNCEMENT_TEMPLATE,
    galleryTemplate: autoPost.galleryTemplate ?? DEFAULT_GALLERY_TEMPLATE,
  });

  // Sync when config loads
  useEffect(() => {
    if (!fbConfig) return;
    const ap = fbConfig.fbAutoPost ?? {};
    setValues({
      eventsEnabled: ap.events ?? false,
      projectsEnabled: ap.projects ?? false,
      announcementsEnabled: ap.announcements ?? false,
      galleryEnabled: ap.gallery ?? false,
      eventTemplate: ap.eventTemplate ?? DEFAULT_EVENT_TEMPLATE,
      projectTemplate: ap.projectTemplate ?? DEFAULT_PROJECT_TEMPLATE,
      announcementTemplate: ap.announcementTemplate ?? DEFAULT_ANNOUNCEMENT_TEMPLATE,
      galleryTemplate: ap.galleryTemplate ?? DEFAULT_GALLERY_TEMPLATE,
    });
  }, [fbConfig]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: "facebook",
          fbAutoPost: {
            events: values.eventsEnabled,
            projects: values.projectsEnabled,
            announcements: values.announcementsEnabled,
            gallery: values.galleryEnabled,
            eventTemplate: values.eventTemplate,
            projectTemplate: values.projectTemplate,
            announcementTemplate: values.announcementTemplate,
            galleryTemplate: values.galleryTemplate,
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast("Auto-post settings saved.", "success");
      onMutate();
    } catch {
      toast("Failed to save auto-post settings.", "error");
    } finally {
      setSaving(false);
    }
  }, [values, onMutate]);

  const isConnected = !!fbConfig?.fbPageId;

  const postTypes: Array<{
    key: keyof typeof values;
    templateKey: keyof typeof values;
    label: string;
    description: string;
    icon: React.ReactNode;
    placeholders: string[];
  }> = [
    {
      key: "eventsEnabled",
      templateKey: "eventTemplate",
      label: "Events",
      description: "Auto-post when a new event is published",
      icon: <Activity size={16} />,
      placeholders: ["{{title}}", "{{date}}", "{{venue}}", "{{description}}", "{{url}}"],
    },
    {
      key: "projectsEnabled",
      templateKey: "projectTemplate",
      label: "Projects",
      description: "Auto-post when a new project is published",
      icon: <Zap size={16} />,
      placeholders: ["{{title}}", "{{technologies}}", "{{description}}", "{{url}}"],
    },
    {
      key: "announcementsEnabled",
      templateKey: "announcementTemplate",
      label: "Announcements",
      description: "Auto-post new club announcements",
      icon: <Newspaper size={16} />,
      placeholders: ["{{title}}", "{{excerpt}}", "{{url}}"],
    },
    {
      key: "galleryEnabled",
      templateKey: "galleryTemplate",
      label: "Gallery",
      description: "Auto-post when new gallery items are approved",
      icon: <Share2 size={16} />,
      placeholders: ["{{count}}", "{{url}}"],
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {!isConnected && (
        <Alert
          variant="warning"
          title="Facebook Not Connected"
          message="Connect a Facebook page first to enable auto-posting."
        />
      )}

      {postTypes.map((pt) => (
        <div
          key={pt.key}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <span className="text-[var(--color-accent)]">{pt.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{pt.label}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{pt.description}</p>
              </div>
            </div>
            <Checkbox
              checked={values[pt.key] as boolean}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [pt.key]: e.target.checked }))
              }
              disabled={!isConnected}
              aria-label={`Enable auto-post for ${pt.label}`}
            />
          </div>
          {(values[pt.key] as boolean) && (
            <div className="p-4 space-y-3">
              <Textarea
                label="Post Template"
                value={values[pt.templateKey] as string}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [pt.templateKey]: e.target.value }))
                }
                rows={4}
                placeholder="Post template..."
              />
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-[var(--color-text-secondary)]">Placeholders:</span>
                {pt.placeholders.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => {
                      setValues((prev) => ({
                        ...prev,
                        [pt.templateKey]: (prev[pt.templateKey] as string) + ph,
                      }));
                    }}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded font-mono",
                      "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
                      "border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isConnected}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold",
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
            "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          )}
        >
          {saving ? <Spinner size="sm" /> : null}
          Save Auto-Post Settings
        </button>
      </div>
    </div>
  );
}

// ─── Comment Replies Tab ──────────────────────────────────────────────────────

interface CommentRepliesTabProps {
  fbConfig?: ClubConfigPublic & FacebookConfig;
  onMutate: () => void;
}

function CommentRepliesTab({ fbConfig, onMutate }: CommentRepliesTabProps): JSX.Element {
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prompt, setPrompt] = useState(
    fbConfig?.fbCommentReplyPrompt ??
      "You are a helpful assistant for the GSTU Robotics & Research Club. Reply to comments on the club's Facebook page in a friendly, professional tone. Keep replies short (under 100 words)."
  );
  const [delay, setDelay] = useState(String(fbConfig?.fbCommentReplyDelay ?? 5));

  useEffect(() => {
    if (!fbConfig) return;
    setEnabled(fbConfig.fbAutoReplyComments ?? false);
    setPrompt(
      fbConfig.fbCommentSystemPrompt ?? fbConfig.fbCommentReplyPrompt ??
        "You are a helpful assistant for the GSTU Robotics & Research Club. Reply to comments on the club's Facebook page in a friendly, professional tone. Keep replies short (under 100 words)."
    );
    setDelay(String(fbConfig.fbCommentReplyDelay ?? 5));
  }, [fbConfig]);

  const handleSave = useCallback(async () => {
    const delayNum = parseInt(delay, 10);
    if (isNaN(delayNum) || delayNum < 0) {
      toast("Reply delay must be a non-negative number.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: "facebook",
          fbAutoReplyComments: enabled,
          fbCommentSystemPrompt: prompt,
          fbCommentReplyDelay: delayNum,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast("Comment reply settings saved.", "success");
      onMutate();
    } catch {
      toast("Failed to save comment reply settings.", "error");
    } finally {
      setSaving(false);
    }
  }, [enabled, prompt, delay, onMutate]);

  const isConnected = !!fbConfig?.fbPageId;

  return (
    <div className="max-w-2xl space-y-6">
      {!isConnected && (
        <Alert
          variant="warning"
          title="Facebook Not Connected"
          message="Connect a Facebook page first to enable comment auto-replies."
        />
      )}

      {/* Enable Toggle */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Enable Auto-Reply to Comments
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              AI will automatically reply to comments on your Facebook page posts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {enabled && (
              <Badge variant="success" size="sm">
                <Power size={10} />
                Active
              </Badge>
            )}
            <Checkbox
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!isConnected}
              aria-label="Enable auto-reply to comments"
            />
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            AI System Prompt
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Instruct the AI on how to respond to Facebook comments. This sets its persona and tone.
          </p>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          placeholder="Enter system prompt for comment replies..."
          disabled={!isConnected}
        />
        <div className="text-xs text-[var(--color-text-secondary)]">
          Tip: Include club name, tone guidelines, and what topics to address or avoid.
        </div>
      </div>

      {/* Reply Delay */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <label
              htmlFor="comment-delay"
              className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1"
            >
              Reply Delay (seconds)
            </label>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              Wait this many seconds after a comment is posted before sending the AI reply.
              A small delay makes it feel more natural.
            </p>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-[var(--color-text-secondary)] flex-shrink-0" />
              <Input
                id="comment-delay"
                type="number"
                min="0"
                max="3600"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                disabled={!isConnected}
                className="w-32"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">seconds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isConnected}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold",
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
            "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          )}
        >
          {saving ? <Spinner size="sm" /> : null}
          Save Comment Reply Settings
        </button>
      </div>
    </div>
  );
}

// ─── Message Replies Tab ──────────────────────────────────────────────────────

interface MessageRepliesTabProps {
  fbConfig?: ClubConfigPublic & FacebookConfig;
  onMutate: () => void;
}

function MessageRepliesTab({ fbConfig, onMutate }: MessageRepliesTabProps): JSX.Element {
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prompt, setPrompt] = useState(
    fbConfig?.fbMessageSystemPrompt ?? fbConfig?.fbMessageReplyPrompt ??
      "You are a helpful assistant for the GSTU Robotics & Research Club on Facebook Messenger. Answer questions about the club, membership, events, and projects. Be concise, friendly, and helpful."
  );
  const [greeting, setGreeting] = useState(
    fbConfig?.fbGreetingMessage ??
      "Hello! Welcome to the GSTU Robotics & Research Club. How can I help you today?"
  );
  const [fallback, setFallback] = useState(
    fbConfig?.fbFallbackMessage ??
      "I'm sorry, I couldn't understand your message. Please contact us at our email or visit our website for assistance."
  );

  useEffect(() => {
    if (!fbConfig) return;
    setEnabled(fbConfig.fbAutoReplyMessages ?? false);
    setPrompt(
      fbConfig.fbMessageSystemPrompt ?? fbConfig.fbMessageReplyPrompt ??
        "You are a helpful assistant for the GSTU Robotics & Research Club on Facebook Messenger. Answer questions about the club, membership, events, and projects. Be concise, friendly, and helpful."
    );
    setGreeting(
      fbConfig.fbGreetingMessage ??
        "Hello! Welcome to the GSTU Robotics & Research Club. How can I help you today?"
    );
    setFallback(
      fbConfig.fbFallbackMessage ??
        "I'm sorry, I couldn't understand your message. Please contact us at our email or visit our website for assistance."
    );
  }, [fbConfig]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: "facebook",
          fbAutoReplyMessages: enabled,
          fbMessageSystemPrompt: prompt,
          fbGreetingMessage: greeting,
          fbFallbackMessage: fallback,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast("Message reply settings saved.", "success");
      onMutate();
    } catch {
      toast("Failed to save message reply settings.", "error");
    } finally {
      setSaving(false);
    }
  }, [enabled, prompt, greeting, fallback, onMutate]);

  const isConnected = !!fbConfig?.fbPageId;

  return (
    <div className="max-w-2xl space-y-6">
      {!isConnected && (
        <Alert
          variant="warning"
          title="Facebook Not Connected"
          message="Connect a Facebook page first to enable Messenger auto-replies."
        />
      )}

      {/* Enable Toggle */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Enable Messenger Auto-Reply
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              AI will automatically respond to messages sent to your Facebook page
            </p>
          </div>
          <div className="flex items-center gap-2">
            {enabled && (
              <Badge variant="success" size="sm">
                <Power size={10} />
                Active
              </Badge>
            )}
            <Checkbox
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!isConnected}
              aria-label="Enable Messenger auto-reply"
            />
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            AI System Prompt
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Define the AI persona and capabilities for Messenger conversations.
          </p>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Enter system prompt for Messenger replies..."
          disabled={!isConnected}
        />
      </div>

      {/* Greeting Message */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            Greeting Message
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Sent when someone messages the page for the first time or starts a new conversation.
          </p>
        </div>
        <Textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={3}
          placeholder="Hello! Welcome to..."
          disabled={!isConnected}
        />
      </div>

      {/* Fallback Message */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            Fallback Message
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Sent when the AI cannot generate a suitable response (error or unclear query).
          </p>
        </div>
        <Textarea
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          rows={3}
          placeholder="I'm sorry, I couldn't understand..."
          disabled={!isConnected}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isConnected}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold",
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
            "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          )}
        >
          {saving ? <Spinner size="sm" /> : null}
          Save Message Reply Settings
        </button>
      </div>
    </div>
  );
}

// ─── Test Tab ─────────────────────────────────────────────────────────────────

interface TestTabProps {
  fbConfig?: ClubConfigPublic & FacebookConfig;
}

function TestTab({ fbConfig }: TestTabProps): JSX.Element {
  const [mode, setMode] = useState<"comment" | "message">("comment");
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getSystemPrompt = useCallback((): string => {
    if (mode === "comment") {
      return (
        fbConfig?.fbCommentSystemPrompt ?? fbConfig?.fbCommentReplyPrompt ??
        "You are a helpful assistant for the GSTU Robotics & Research Club. Reply to comments in a friendly, professional tone."
      );
    }
    return (
      fbConfig?.fbMessageSystemPrompt ?? fbConfig?.fbMessageReplyPrompt ??
      "You are a helpful assistant for the GSTU Robotics & Research Club on Facebook Messenger. Answer questions about the club."
    );
  }, [mode, fbConfig]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: TestMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationHistory: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPromptOverride: getSystemPrompt(),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const content =
        data.type === "text"
          ? data.content
          : data.type === "structured"
          ? JSON.stringify(data.data, null, 2)
          : "No response.";

      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Could not reach the AI. Please check the Groq API key in AI Config.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, getSystemPrompt]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <div className="max-w-2xl flex flex-col" style={{ height: "600px" }}>
      {/* Mode Selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">Test prompt for:</span>
        <div className="flex gap-1.5 p-1 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          {(["comment", "message"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setMessages([]);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                mode === m
                  ? "bg-[var(--color-accent)] text-[var(--color-bg-base)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {m === "comment" ? (
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={12} />
                  Comment Reply
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  Messenger Reply
                </span>
              )}
            </button>
          ))}
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "ml-auto text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-error)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] rounded px-2 py-1"
            )}
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Active Prompt Preview */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3 mb-4">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-1 uppercase tracking-wide">
          Active System Prompt
        </p>
        <p className="text-xs text-[var(--color-text-primary)] line-clamp-2 font-mono leading-5">
          {getSystemPrompt()}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Bot size={32} className="text-[var(--color-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Test AI Reply Quality</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Simulate a Facebook {mode === "comment" ? "comment" : "Messenger message"} to see how the AI responds.
              </p>
            </div>
            {/* Starter chips */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "How do I join the club?",
                "When is the next event?",
                "What projects has the club done?",
                "How much is the membership fee?",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setInput(chip)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full",
                    "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
                    "border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]",
                    "transition-colors duration-150",
                    "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    msg.role === "user"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[#1877F2]/15 text-[#1877F2]"
                  )}
                  aria-hidden="true"
                >
                  {msg.role === "user" ? "U" : <Facebook size={14} />}
                </div>
                <div
                  className={cn(
                    "max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-[var(--color-primary)] text-white rounded-tr-none"
                      : "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-tl-none"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#1877F2]/15 text-[#1877F2]">
                  <Facebook size={14} />
                </div>
                <div className="rounded-xl px-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-tl-none">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "comment"
              ? "Simulate a Facebook comment..."
              : "Simulate a Messenger message..."
          }
          maxLength={500}
          disabled={loading}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm",
            "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
            "border border-[var(--color-border)]",
            "placeholder:text-[var(--color-text-secondary)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
            "disabled:opacity-60"
          )}
          aria-label="Test message input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send test message"
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
            "transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          )}
        >
          {loading ? <Spinner size="sm" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}