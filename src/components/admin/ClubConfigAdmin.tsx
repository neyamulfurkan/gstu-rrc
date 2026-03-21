// src/components/admin/ClubConfigAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Globe,
  Mail,
  Palette,
  Image as ImageIcon,
  Layout,
  Settings,
  Users,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type { ClubConfigPublic } from "@/types/index";
import { cn } from "@/lib/utils";
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  PasswordInput,
  FormLabel,
} from "@/components/ui/Forms";
import {
  Alert,
  Badge,
  Spinner,
  Skeleton,
  toast,
} from "@/components/ui/Feedback";
import { CloudinaryWidget } from "@/components/ui/Media";

// Dynamic imports
const ColorEditor = dynamic(
  () => import("@/components/admin/ColorEditor").then((m) => ({ default: m.ColorEditor })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    ),
    ssr: false,
  }
);

const TipTapEditor = dynamic(
  () =>
    Promise.all([
      import("@tiptap/react"),
      import("@tiptap/starter-kit"),
      import("@tiptap/extension-link"),
    ]).then(([tiptap, starterKitMod, linkMod]) => {
      const StarterKit = starterKitMod.default;
      const Link = linkMod.default;

      function TipTapWrapper({
        value,
        onChange,
      }: {
        value: string;
        onChange: (val: string) => void;
      }) {
        const editor = tiptap.useEditor({
          extensions: [StarterKit, Link],
          content: (() => {
            try {
              return JSON.parse(value);
            } catch {
              return value || "";
            }
          })(),
          onUpdate: ({ editor: e }) => {
            onChange(JSON.stringify(e.getJSON()));
          },
          editorProps: {
            attributes: {
              class:
                "prose prose-invert min-h-[120px] max-w-none focus:outline-none p-3 text-sm text-[var(--color-text-primary)]",
            },
          },
        });

        return (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden">
            {editor && (
              <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] p-2">
                {[
                  {
                    label: "B",
                    action: () => editor.chain().focus().toggleBold().run(),
                    active: editor.isActive("bold"),
                    title: "Bold",
                  },
                  {
                    label: "I",
                    action: () => editor.chain().focus().toggleItalic().run(),
                    active: editor.isActive("italic"),
                    title: "Italic",
                  },
                  {
                    label: "H2",
                    action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                    active: editor.isActive("heading", { level: 2 }),
                    title: "Heading 2",
                  },
                  {
                    label: "UL",
                    action: () => editor.chain().focus().toggleBulletList().run(),
                    active: editor.isActive("bulletList"),
                    title: "Bullet list",
                  },
                  {
                    label: "OL",
                    action: () => editor.chain().focus().toggleOrderedList().run(),
                    active: editor.isActive("orderedList"),
                    title: "Ordered list",
                  },
                ].map((btn) => (
                  <button
                    key={btn.title}
                    type="button"
                    title={btn.title}
                    onClick={btn.action}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                      btn.active
                        ? "bg-[var(--color-accent)] text-[var(--color-bg-base)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
            <tiptap.EditorContent editor={editor} />
          </div>
        );
      }

      return { default: TipTapWrapper };
    }),
  {
    loading: () => (
      <Skeleton className="h-32 w-full rounded-lg" />
    ),
    ssr: false,
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId =
  | "branding"
  | "contact"
  | "seo"
  | "membership"
  | "design"
  | "hero"
  | "navigation"
  | "email";

interface ExtraSocialLink {
  label: string;
  url: string;
}

interface HeroImageEntry {
  url: string;
  order: number;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error("Failed to load config");
    const json = await res.json();
    return json.data ?? json;
  });

// ─── Tab Button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: (id: TabId) => void;
}

function TabButton({ id, label, icon, active, onClick }: TabButtonProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
        active
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
      )}
    >
      <span className="flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="hidden lg:block">{label}</span>
    </button>
  );
}

// ─── Save Button ──────────────────────────────────────────────────────────────

interface SaveButtonProps {
  saving: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function SaveButton({ saving, onClick, disabled }: SaveButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
        "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
      )}
    >
      {saving ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Save size={16} aria-hidden="true" />
      )}
      {saving ? "Saving…" : "Save Changes"}
    </button>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Helper: patchConfig ──────────────────────────────────────────────────────

async function patchConfig(tab: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tab, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(err.message ?? "Failed to save");
  }
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

interface BrandingTabProps {
  config: ClubConfigPublic;
}

function BrandingTab({ config }: BrandingTabProps): JSX.Element {
  const [form, setForm] = useState({
    clubName: config.clubName ?? "",
    clubShortName: config.clubShortName ?? "",
    clubMotto: config.clubMotto ?? "",
    clubDescription: config.clubDescription ?? "",
    universityName: config.universityName ?? "",

    departmentName: config.departmentName ?? "",
    foundedYear: String(config.foundedYear ?? new Date().getFullYear()),
    logoUrl: config.logoUrl ?? "",
    faviconUrl: config.faviconUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("branding", {
        ...form,
        foundedYear: parseInt(form.foundedYear, 10) || config.foundedYear,
      });
      await globalMutate("/api/config");
      toast("Branding settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Club Identity" description="Core identifying information about the club.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Club Full Name"
            value={form.clubName}
            onChange={(e) => set("clubName")(e.target.value)}
            placeholder="GSTU Robotics & Research Club"
            required
          />
          <Input
            label="Club Short Name"
            value={form.clubShortName}
            onChange={(e) => set("clubShortName")(e.target.value)}
            placeholder="GSTU RRC"
          />
        </div>
        <div className="mt-4">
          <Input
            label="Club Motto"
            value={form.clubMotto}
            onChange={(e) => set("clubMotto")(e.target.value)}
            placeholder="Innovate. Build. Inspire."
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="University Name"
            value={form.universityName}
            onChange={(e) => set("universityName")(e.target.value)}
            placeholder="Gopalganj Science and Technology University"
          />

          <Input
            label="Department Name"
            value={form.departmentName}
            onChange={(e) => set("departmentName")(e.target.value)}
            placeholder="Computer Science & Engineering"
          />
        </div>
        <div className="mt-4 w-48">
          <Input
            label="Founded Year"
            type="number"
            value={form.foundedYear}
            onChange={(e) => set("foundedYear")(e.target.value)}
            min={1900}
            max={new Date().getFullYear()}
          />
        </div>
      </Section>

      <Section title="Club Description" description="Shown on the About page and in the footer.">
        <TipTapEditor
          value={form.clubDescription}
          onChange={set("clubDescription")}
        />
      </Section>



      <Section title="Club Logo & Favicon" description="Upload optimized assets for the club logo and browser favicon.">
        <div className="flex flex-wrap gap-8">
          <CloudinaryWidget
            folder="admin/branding"
            value={form.logoUrl}
            onChange={set("logoUrl")}
            label="Club Logo"
            accept="image/*"
          />
          <CloudinaryWidget
            folder="admin/branding"
            value={form.faviconUrl}
            onChange={set("faviconUrl")}
            label="Favicon (32×32 PNG)"
            accept="image/png,image/x-icon,image/svg+xml"
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Contact & Social Tab ─────────────────────────────────────────────────────

interface ContactTabProps {
  config: ClubConfigPublic;
}

function ContactTab({ config }: ContactTabProps): JSX.Element {
  const [form, setForm] = useState({
    email: config.email ?? "",
    phone: config.phone ?? "",
    address: config.address ?? "",
    fbUrl: config.fbUrl ?? "",
    ytUrl: config.ytUrl ?? "",
    igUrl: config.igUrl ?? "",
    liUrl: config.liUrl ?? "",
    ghUrl: config.ghUrl ?? "",
    twitterUrl: config.twitterUrl ?? "",
  });
  const [extraLinks, setExtraLinks] = useState<ExtraSocialLink[]>(
    Array.isArray(config.extraSocialLinks) ? config.extraSocialLinks : []
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const addExtraLink = () =>
    setExtraLinks((prev) => [...prev, { label: "", url: "" }]);

  const removeExtraLink = (index: number) =>
    setExtraLinks((prev) => prev.filter((_, i) => i !== index));

  const updateExtraLink = (index: number, field: keyof ExtraSocialLink, value: string) => {
    setExtraLinks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("contact", { ...form, extraSocialLinks: extraLinks });
      await globalMutate("/api/config");
      toast("Contact & social settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Contact Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="club@gstu.edu.bd"
          />
          <Input
            label="Phone Number"
            value={form.phone}
            onChange={set("phone")}
            placeholder="01700000000"
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Address"
            value={form.address}
            onChange={set("address")}
            placeholder="GSTU Campus, Gopalganj, Bangladesh"
          />
        </div>
      </Section>

      <Section title="Primary Social Links" description="Main platform links shown in the footer and nav.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              { key: "fbUrl", label: "Facebook Page URL" },
              { key: "ytUrl", label: "YouTube Channel URL" },
              { key: "igUrl", label: "Instagram URL" },
              { key: "liUrl", label: "LinkedIn URL" },
              { key: "ghUrl", label: "GitHub URL" },
              { key: "twitterUrl", label: "Twitter / X URL" },
            ] as { key: keyof typeof form; label: string }[]
          ).map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              value={form[key]}
              onChange={set(key)}
              placeholder="https://"
              type="url"
            />
          ))}
        </div>
      </Section>

      <Section
        title="Extra Social Links"
        description="Additional social or community links shown in the footer."
      >
        <div className="space-y-3">
          {extraLinks.map((link, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-2 gap-2">
                <Input
                  placeholder="Label (e.g. Discord)"
                  value={link.label}
                  onChange={(e) => updateExtraLink(index, "label", e.target.value)}
                />
                <Input
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => updateExtraLink(index, "url", e.target.value)}
                  type="url"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExtraLink(index)}
                aria-label={`Remove extra link ${link.label || index + 1}`}
                className={cn(
                  "mt-1.5 rounded-lg p-2 text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addExtraLink}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Plus size={14} aria-hidden="true" />
            Add Link
          </button>
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────

interface SeoTabProps {
  config: ClubConfigPublic;
}

function SeoTab({ config }: SeoTabProps): JSX.Element {
  const [form, setForm] = useState({
    metaDescription: config.metaDescription ?? "",
    seoKeywords: config.seoKeywords ?? "",
    gscVerifyTag: config.gscVerifyTag ?? "",
    ogImageUrl: config.ogImageUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("seo", form);
      await globalMutate("/api/config");
      toast("SEO settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const descLen = form.metaDescription.length;

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Search Engine Meta" description="Controls how this site appears in search results.">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <FormLabel>Meta Description</FormLabel>
              <span
                className={cn(
                  "text-xs",
                  descLen > 160 ? "text-[var(--color-error)]" : "text-[var(--color-text-secondary)]"
                )}
              >
                {descLen}/160
              </span>
            </div>
            <Textarea
              value={form.metaDescription}
              onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
              placeholder="A brief description of the club for search engines…"
              maxLength={160}
            />
          </div>
          <Input
            label="SEO Keywords"
            value={form.seoKeywords}
            onChange={(e) => setForm((p) => ({ ...p, seoKeywords: e.target.value }))}
            placeholder="robotics, research, GSTU, Bangladesh, club"
          />
          <Input
            label="Google Search Console Verify Tag"
            value={form.gscVerifyTag}
            onChange={(e) => setForm((p) => ({ ...p, gscVerifyTag: e.target.value }))}
            placeholder="verification code from GSC"
          />
        </div>
      </Section>

      <Section title="Open Graph Image" description="Shown when links are shared on social media.">
        <CloudinaryWidget
          folder="admin/seo"
          value={form.ogImageUrl}
          onChange={(url) => setForm((p) => ({ ...p, ogImageUrl: url }))}
          label="OG Image (1200×630px recommended)"
          accept="image/*"
        />
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Membership Tab ───────────────────────────────────────────────────────────

interface MembershipTabProps {
  config: ClubConfigPublic;
}

function MembershipTab({ config }: MembershipTabProps): JSX.Element {
  const [form, setForm] = useState({
    regStatus: config.regStatus ?? "closed",
    membershipFee: String(config.membershipFee ?? 200),
    bkashNumber: config.bkashNumber ?? "",
    nagadNumber: config.nagadNumber ?? "",
    autoApprove: false as boolean,
    requireScreenshot: true as boolean,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("membership", {
        ...form,
        membershipFee: parseInt(form.membershipFee, 10) || 0,
      });
      await globalMutate("/api/config");
      toast("Membership settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Registration Status" description="Controls whether the public membership form is accessible.">
        <div className="max-w-xs">
          <Select
            label="Registration Status"
            value={form.regStatus}
            onChange={(e) => setForm((p) => ({ ...p, regStatus: e.target.value }))}
            options={[
              { value: "open", label: "Open — accepting applications" },
              { value: "closed", label: "Closed — form hidden from public" },
              { value: "invite_only", label: "Invite Only — show notice" },
            ]}
          />
        </div>
        {form.regStatus === "open" && (
          <p className="mt-2 text-xs text-[var(--color-success)]">
            ● Registration is currently open. Applicants can submit applications.
          </p>
        )}
        {form.regStatus === "closed" && (
          <p className="mt-2 text-xs text-[var(--color-warning)]">
            ● Registration is closed. The form will show a "closed" message.
          </p>
        )}
      </Section>

      <Section title="Membership Fee" description="Amount displayed to applicants before payment.">
        <div className="max-w-xs">
          <Input
            label="Fee Amount (BDT)"
            type="number"
            min={0}
            value={form.membershipFee}
            onChange={(e) => setForm((p) => ({ ...p, membershipFee: e.target.value }))}
            placeholder="200"
          />
        </div>
      </Section>

      <Section title="Payment Numbers" description="Numbers shown to applicants during payment step.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="bKash Number"
            value={form.bkashNumber}
            onChange={(e) => setForm((p) => ({ ...p, bkashNumber: e.target.value }))}
            placeholder="01700000000"
          />
          <Input
            label="Nagad Number"
            value={form.nagadNumber}
            onChange={(e) => setForm((p) => ({ ...p, nagadNumber: e.target.value }))}
            placeholder="01700000000"
          />
        </div>
      </Section>

      <Section title="Application Settings" description="Controls for automated and screenshot requirements.">
        <div className="space-y-3">
          <Checkbox
            label="Require payment screenshot"
            description="Applicants must upload a payment screenshot to submit the form."
            checked={form.requireScreenshot}
            onChange={(e) =>
              setForm((p) => ({ ...p, requireScreenshot: e.target.checked }))
            }
          />
          <Checkbox
            label="Auto-approve applications"
            description="Automatically approve applications when submitted. Not recommended without payment verification."
            checked={form.autoApprove}
            onChange={(e) =>
              setForm((p) => ({ ...p, autoApprove: e.target.checked }))
            }
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Design & Colors Tab ──────────────────────────────────────────────────────

interface DesignTabProps {
  config: ClubConfigPublic;
}

const GOOGLE_FONT_OPTIONS = [
  "Orbitron",
  "Syne",
  "DM Sans",
  "JetBrains Mono",
  "Inter",
  "Poppins",
  "Roboto",
  "Montserrat",
  "Space Grotesk",
  "Rajdhani",
  "Exo 2",
  "Share Tech Mono",
  "Fira Code",
  "IBM Plex Sans",
  "IBM Plex Mono",
];

function DesignTab({ config }: DesignTabProps): JSX.Element {
  const [colorConfig, setColorConfig] = useState<Record<string, string>>(
    config.colorConfig ?? {}
  );
  const [fonts, setFonts] = useState({
    displayFont: config.displayFont ?? "Orbitron",
    headingFont: config.headingFont ?? "Syne",
    bodyFont: config.bodyFont ?? "DM Sans",
    monoFont: config.monoFont ?? "JetBrains Mono",
  });
  const [animationStyle, setAnimationStyle] = useState(config.animationStyle ?? "standard");
  const [transitionStyle, setTransitionStyle] = useState(config.transitionStyle ?? "fade");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fontOptions = GOOGLE_FONT_OPTIONS.map((f) => ({ value: f, label: f }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("design", { colorConfig, ...fonts, animationStyle, transitionStyle });
      await globalMutate("/api/config");
      toast("Design settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Color System" description="Choose a theme preset or customize individual color tokens. Selecting a preset also updates typography.">
        <ColorEditor
          value={colorConfig}
          onChange={setColorConfig}
          fonts={fonts}
          onFontsChange={setFonts}
        />
      </Section>

      <Section title="Typography" description="Google Font names for the four font roles.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Display Font (hero, page titles)"
            value={fonts.displayFont}
            onChange={(e) => setFonts((p) => ({ ...p, displayFont: e.target.value }))}
            options={fontOptions}
          />
          <Select
            label="Heading Font (section headings)"
            value={fonts.headingFont}
            onChange={(e) => setFonts((p) => ({ ...p, headingFont: e.target.value }))}
            options={fontOptions}
          />
          <Select
            label="Body Font (paragraph text)"
            value={fonts.bodyFont}
            onChange={(e) => setFonts((p) => ({ ...p, bodyFont: e.target.value }))}
            options={fontOptions}
          />
          <Select
            label="Mono Font (code, serial numbers)"
            value={fonts.monoFont}
            onChange={(e) => setFonts((p) => ({ ...p, monoFont: e.target.value }))}
            options={fontOptions}
          />
        </div>
      </Section>

      <Section title="Animation & Transitions">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Animation Style"
            value={animationStyle}
            onChange={(e) => setAnimationStyle(e.target.value)}
            options={[
              { value: "standard", label: "Standard — full animations" },
              { value: "minimal", label: "Minimal — subtle animations" },
              { value: "cinematic", label: "Cinematic — dramatic effects" },
            ]}
          />
          <Select
            label="Page Transition Style"
            value={transitionStyle}
            onChange={(e) => setTransitionStyle(e.target.value)}
            options={[
              { value: "fade", label: "Fade" },
              { value: "slide", label: "Slide" },
              { value: "wipe", label: "Wipe" },
            ]}
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Hero Section Tab ─────────────────────────────────────────────────────────

interface HeroTabProps {
  config: ClubConfigPublic;
}

function HeroTab({ config }: HeroTabProps): JSX.Element {
  const [heroType, setHeroType] = useState(config.heroType ?? "particles");
  const [heroImages, setHeroImages] = useState<HeroImageEntry[]>(
    Array.isArray(config.heroImages) ? config.heroImages : []
  );
  const [heroVideoUrl, setHeroVideoUrl] = useState(config.heroVideoUrl ?? "");
  const [heroFallbackImg, setHeroFallbackImg] = useState(config.heroFallbackImg ?? "");
  const [overlayOpacity, setOverlayOpacity] = useState(config.overlayOpacity ?? 50);
  const [cta, setCta] = useState({
    heroCtaLabel1: config.heroCtaLabel1 ?? "",
    heroCtaUrl1: config.heroCtaUrl1 ?? "",
    heroCtaLabel2: config.heroCtaLabel2 ?? "",
    heroCtaUrl2: config.heroCtaUrl2 ?? "",
  });
  const [particles, setParticles] = useState({
    particleEnabled: config.particleEnabled ?? true,
    particleCount: String(config.particleCount ?? 80),
    particleSpeed: String(config.particleSpeed ?? 1),
    particleColor: config.particleColor ?? "#00E5FF",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dragIndex = useRef<number | null>(null);

  const addHeroImage = (url: string) => {
    if (!url) return;
    setHeroImages((prev) => [
      ...prev,
      { url, order: prev.length },
    ]);
  };

  const removeHeroImage = (index: number) => {
    setHeroImages((prev) => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })));
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    setHeroImages((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex.current!, 1);
      updated.splice(index, 0, dragged);
      dragIndex.current = index;
      return updated.map((img, i) => ({ ...img, order: i }));
    });
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("hero", {
        heroType,
        heroImages,
        heroVideoUrl,
        heroFallbackImg,
        overlayOpacity,
        ...cta,
        particleEnabled: particles.particleEnabled,
        particleCount: parseInt(particles.particleCount, 10) || 80,
        particleSpeed: parseFloat(particles.particleSpeed) || 1,
        particleColor: particles.particleColor,
      });
      await globalMutate("/api/config");
      toast("Hero section settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Background Type" description="Choose what fills the hero background.">
        <Select
          label="Hero Background Type"
          value={heroType}
          onChange={(e) => setHeroType(e.target.value)}
          options={[
            { value: "particles", label: "Particle Canvas" },
            { value: "slideshow", label: "Image Slideshow" },
            { value: "video", label: "Video" },
          ]}
        />
      </Section>

      {heroType === "slideshow" && (
        <Section
          title="Slideshow Images"
          description="Drag to reorder. Images cycle automatically."
        >
          <div className="space-y-2">
            {heroImages.map((img, index) => (
              <div
                key={`${img.url}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 cursor-grab active:cursor-grabbing"
                )}
              >
                <GripVertical
                  size={16}
                  className="flex-shrink-0 text-[var(--color-text-secondary)]"
                  aria-hidden="true"
                />
                <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Hero image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="flex-1 truncate text-xs text-[var(--color-text-secondary)]">
                  {img.url.split("/").pop()}
                </p>
                <button
                  type="button"
                  onClick={() => removeHeroImage(index)}
                  aria-label={`Remove hero image ${index + 1}`}
                  className={cn(
                    "flex-shrink-0 rounded p-1 text-[var(--color-text-secondary)]",
                    "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <CloudinaryWidget
              folder="admin/hero"
              value=""
              onChange={(url) => {
                if (url) addHeroImage(url);
              }}
              label="Add Image"
              accept="image/*"
            />
          </div>
        </Section>
      )}

      {heroType === "video" && (
        <Section title="Video Source" description="YouTube, Facebook, or Cloudinary video URL.">
          <Input
            label="Video URL"
            value={heroVideoUrl}
            onChange={(e) => setHeroVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            type="url"
          />
        </Section>
      )}

      <Section title="Fallback Image" description="Shown if the main hero media fails to load.">
        <CloudinaryWidget
          folder="admin/hero"
          value={heroFallbackImg}
          onChange={setHeroFallbackImg}
          label="Fallback Background Image"
          accept="image/*"
        />
      </Section>

      <Section title="Overlay Opacity" description={`Dark overlay over the hero background (${overlayOpacity}%).`}>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Overlay opacity"
          />
          <span className="w-12 text-right text-sm font-mono text-[var(--color-text-primary)]">
            {overlayOpacity}%
          </span>
        </div>
      </Section>

      <Section title="Call-to-Action Buttons" description="Two CTA buttons displayed on the hero.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="CTA Button 1 Label"
            value={cta.heroCtaLabel1}
            onChange={(e) => setCta((p) => ({ ...p, heroCtaLabel1: e.target.value }))}
            placeholder="Join Us"
          />
          <Input
            label="CTA Button 1 URL"
            value={cta.heroCtaUrl1}
            onChange={(e) => setCta((p) => ({ ...p, heroCtaUrl1: e.target.value }))}
            placeholder="/membership"
          />
          <Input
            label="CTA Button 2 Label"
            value={cta.heroCtaLabel2}
            onChange={(e) => setCta((p) => ({ ...p, heroCtaLabel2: e.target.value }))}
            placeholder="Our Projects"
          />
          <Input
            label="CTA Button 2 URL"
            value={cta.heroCtaUrl2}
            onChange={(e) => setCta((p) => ({ ...p, heroCtaUrl2: e.target.value }))}
            placeholder="/projects"
          />
        </div>
      </Section>

      <Section title="Particle System" description="Canvas particle animation overlay settings.">
        <div className="space-y-4">
          <Checkbox
            label="Enable particle animation"
            description="Draws animated floating particles on the canvas background."
            checked={particles.particleEnabled}
            onChange={(e) =>
              setParticles((p) => ({ ...p, particleEnabled: e.target.checked }))
            }
          />
          {particles.particleEnabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Particle Count"
                type="number"
                min={10}
                max={300}
                value={particles.particleCount}
                onChange={(e) =>
                  setParticles((p) => ({ ...p, particleCount: e.target.value }))
                }
              />
              <Input
                label="Particle Speed"
                type="number"
                step={0.1}
                min={0.1}
                max={5}
                value={particles.particleSpeed}
                onChange={(e) =>
                  setParticles((p) => ({ ...p, particleSpeed: e.target.value }))
                }
              />
              <div>
                <FormLabel htmlFor="particle-color">Particle Color</FormLabel>
                <input
                  id="particle-color"
                  type="color"
                  value={particles.particleColor}
                  onChange={(e) =>
                    setParticles((p) => ({ ...p, particleColor: e.target.value }))
                  }
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
          )}
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Navigation & Footer Tab ──────────────────────────────────────────────────

interface NavigationTabProps {
  config: ClubConfigPublic;
}

function NavigationTab({ config }: NavigationTabProps): JSX.Element {
  const [form, setForm] = useState({
    footerCopyright: config.footerCopyright ?? "",
    privacyPolicy: config.privacyPolicy ?? "",
    termsOfUse: config.termsOfUse ?? "",
    constitutionUrl: config.constitutionUrl ?? "",
    announcementTickerSpeed: String(config.announcementTickerSpeed ?? 40),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await patchConfig("navigation", {
        ...form,
        announcementTickerSpeed:
          parseInt(form.announcementTickerSpeed, 10) || 40,
      });
      await globalMutate("/api/config");
      toast("Navigation & footer settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Section title="Footer Settings">
        <div className="space-y-4">
          <Input
            label="Footer Copyright Text"
            value={form.footerCopyright}
            onChange={set("footerCopyright")}
            placeholder={`\u00A9 ${new Date().getFullYear()} GSTU Robotics & Research Club`}
          />
          <Input
            label="Constitution / Rules Document URL"
            value={form.constitutionUrl}
            onChange={set("constitutionUrl")}
            placeholder="https://docs.google.com/..."
            type="url"
          />
        </div>
      </Section>

      <Section title="Announcement Ticker" description="Controls how fast the announcement ticker scrolls. Lower number = faster scroll. Higher number = slower scroll (duration in seconds for one full pass).">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--color-text-secondary)] w-16 shrink-0">Faster</span>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={Number(form.announcementTickerSpeed)}
              onChange={(e) =>
                setForm((p) => ({ ...p, announcementTickerSpeed: e.target.value }))
              }
              className="flex-1 accent-[var(--color-accent)]"
              aria-label="Ticker speed"
            />
            <span className="text-xs text-[var(--color-text-secondary)] w-16 text-right shrink-0">Slower</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Duration: <span className="font-mono text-[var(--color-text-primary)]">{form.announcementTickerSpeed}s</span> per cycle
            </p>
            <Input
              type="number"
              min={10}
              max={120}
              value={form.announcementTickerSpeed}
              onChange={(e) => setForm((p) => ({ ...p, announcementTickerSpeed: e.target.value }))}
              className="w-24 text-right"
            />
          </div>
        </div>
      </Section>

      <Section title="Legal Pages" description="Markdown content for privacy policy and terms of use pages.">
        <div className="space-y-4">
          <Textarea
            label="Privacy Policy (Markdown)"
            value={form.privacyPolicy}
            onChange={set("privacyPolicy")}
            placeholder="## Privacy Policy&#10;&#10;Your privacy policy text here..."
            className="min-h-[200px] font-mono text-xs"
          />
          <Textarea
            label="Terms of Use (Markdown)"
            value={form.termsOfUse}
            onChange={set("termsOfUse")}
            placeholder="## Terms of Use&#10;&#10;Your terms here..."
            className="min-h-[200px] font-mono text-xs"
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Email Settings Tab ───────────────────────────────────────────────────────

interface EmailTabProps {
  config: ClubConfigPublic;
}

function EmailTab({ config }: EmailTabProps): JSX.Element {
  const [form, setForm] = useState({
    resendApiKey: "",
    resendFromEmail: "",
    resendFromName: "",
    welcomeEmailSubject: "",
    welcomeEmailBody: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadedSecrets, setLoadedSecrets] = useState(false);

  // Fetch masked secrets separately on tab activation
  useEffect(() => {
    if (loadedSecrets) return;
    fetch("/api/config?admin=true")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setForm((p) => ({
          ...p,
          resendApiKey: data.resendApiKey ? "••••••••••••••••" : "",
          resendFromEmail: data.resendFromEmail ?? "",
          resendFromName: data.resendFromName ?? "",
          welcomeEmailSubject: data.welcomeEmailSubject ?? "",
          welcomeEmailBody: data.welcomeEmailBody ?? "",
        }));
      })
      .catch(() => {
        // Silently fail — user can manually enter
      })
      .finally(() => {
        setLoadedSecrets(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, string> = {
        resendFromEmail: form.resendFromEmail,
        resendFromName: form.resendFromName,
        welcomeEmailSubject: form.welcomeEmailSubject,
        welcomeEmailBody: form.welcomeEmailBody,
      };
      // Only send API key if it was actually changed (not the masked placeholder)
      if (form.resendApiKey && !form.resendApiKey.includes("•")) {
        payload.resendApiKey = form.resendApiKey;
      }
      await patchConfig("email", payload);
      await globalMutate("/api/config");
      toast("Email settings saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <Alert
        variant="info"
        title="Resend API Required"
        message="This application uses Resend for transactional emails. Get a free API key at resend.com."
      />

      <Section title="Resend Configuration" description="API credentials for sending emails.">
        {!loadedSecrets ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <PasswordInput
              label="Resend API Key"
              value={form.resendApiKey}
              onChange={set("resendApiKey")}
              placeholder="re_xxxxxxxxxxxx"
              onFocus={() => {
                if (form.resendApiKey.includes("•")) {
                  setForm((p) => ({ ...p, resendApiKey: "" }));
                }
              }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="From Email Address"
                type="email"
                value={form.resendFromEmail}
                onChange={set("resendFromEmail")}
                placeholder="noreply@club.gstu.edu.bd"
              />
              <Input
                label="From Name"
                value={form.resendFromName}
                onChange={set("resendFromName")}
                placeholder="GSTU Robotics Club"
              />
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Welcome Email"
        description="Subject and body sent to newly approved members."
      >
        <div className="space-y-4">
          <Input
            label="Welcome Email Subject"
            value={form.welcomeEmailSubject}
            onChange={set("welcomeEmailSubject")}
            placeholder="Welcome to GSTU Robotics & Research Club!"
          />
          <div>
            <FormLabel>Welcome Email Body (Markdown)</FormLabel>
            <Textarea
              value={form.welcomeEmailBody}
              onChange={set("welcomeEmailBody")}
              placeholder="Dear {{member_name}},&#10;&#10;Welcome to the club!..."
              className="min-h-[160px] font-mono text-xs"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Available placeholders: {`{{member_name}}, {{email}}, {{login_url}}`}
            </p>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function ConfigSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 flex-shrink-0 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-[var(--color-border)] p-5">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClubConfigAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("branding");

  const { data: config, error, isLoading } = useSWR<ClubConfigPublic>(
    "/api/config",
    fetcher,
    { revalidateOnFocus: false }
  );

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: "branding", label: "Branding", icon: <ImageIcon size={15} /> },
    { id: "contact", label: "Contact & Social", icon: <Globe size={15} /> },
    { id: "seo", label: "SEO & Analytics", icon: <Search size={15} /> },
    { id: "membership", label: "Membership", icon: <Users size={15} /> },
    { id: "design", label: "Design & Colors", icon: <Palette size={15} /> },
    { id: "hero", label: "Hero Section", icon: <Layout size={15} /> },
    { id: "navigation", label: "Navigation & Footer", icon: <ExternalLink size={15} /> },
    { id: "email", label: "Email Settings", icon: <Mail size={15} /> },
  ];

  if (isLoading) {
    return <ConfigSkeleton />;
  }

  if (error || !config) {
    return (
      <div className="p-6">
        <Alert
          variant="error"
          title="Failed to load configuration"
          message="Could not fetch club configuration. Please refresh the page."
        />
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "branding":
        return <BrandingTab config={config} />;
      case "contact":
        return <ContactTab config={config} />;
      case "seo":
        return <SeoTab config={config} />;
      case "membership":
        return <MembershipTab config={config} />;
      case "design":
        return <DesignTab config={config} />;
      case "hero":
        return <HeroTab config={config} />;
      case "navigation":
        return <NavigationTab config={config} />;
      case "email":
        return <EmailTab config={config} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Club Configuration
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage every aspect of the public-facing website without touching code.
        </p>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Configuration sections"
        className="flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-1.5"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Current tab label on small screens */}
      <div className="flex items-center gap-2 lg:hidden">
        <Badge variant="accent" size="md">
          {tabs.find((t) => t.id === activeTab)?.icon}
          <span className="ml-1">{tabs.find((t) => t.id === activeTab)?.label}</span>
        </Badge>
      </div>

      {/* Tab content */}
      <div role="tabpanel">{renderTab()}</div>
    </div>
  );
}