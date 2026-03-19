// src/components/profile/EditProfileForm.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { Plus, X, Github, Linkedin, Twitter, Globe, Youtube, Facebook, Instagram, Link } from "lucide-react";

import type { MemberPrivate, MemberPublic } from "@/types/index";
import { cn } from "@/lib/utils";
import {
  Input,
  Textarea,
  Select,
  Checkbox,
  PasswordInput,
  FormLabel,
  FormError,
} from "@/components/ui/Forms";
import {
  Alert,
  Badge,
  Skeleton,
  Spinner,
  toast,
} from "@/components/ui/Feedback";
import { CloudinaryWidget } from "@/components/ui/Media";

// ─── Dynamic Imports ──────────────────────────────────────────────────────────

const TipTapEditor = dynamic(
  () =>
    Promise.all([
      import("@tiptap/react"),
      import("@tiptap/starter-kit"),
    ]).then(([tiptapReact, starterKitMod]) => {
      const { useEditor, EditorContent } = tiptapReact;
      const StarterKit = starterKitMod.default;

      function TipTapEditorInner({
        value,
        onChange,
      }: {
        value: unknown;
        onChange: (json: unknown) => void;
      }): JSX.Element {
        const editor = useEditor({
          extensions: [StarterKit],
          content: value as never ?? "",
          onUpdate: ({ editor: ed }) => {
            onChange(ed.getJSON());
          },
        });

        return (
          <div
            className={cn(
              "min-h-[120px] rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "p-3 text-sm focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:border-[var(--color-accent)]",
              "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px]",
              "[&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4",
              "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4"
            )}
          >
            <EditorContent editor={editor} />
          </div>
        );
      }
      return TipTapEditorInner;
    }),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[120px] w-full rounded-lg" />,
  }
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  { key: "github", label: "GitHub", icon: Github },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "twitter", label: "Twitter / X", icon: Twitter },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "website", label: "Website", icon: Globe },
  { key: "other", label: "Other", icon: Link },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

type SectionKey =
  | "personal"
  | "bio"
  | "social"
  | "skills"
  | "avatar"
  | "cover"
  | "password";

interface SocialLinkEntry {
  platform: string;
  url: string;
  isCustom: boolean;
}

interface FormState {
  fullName: string;
  phone: string;
  address: string;
  dob: string;
  gender: string;
  workplace: string;
  bio: unknown;
  socialLinks: SocialLinkEntry[];
  skills: string[];
  avatarUrl: string;
  coverUrl: string;
  interests: string;
}

interface PasswordState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FieldError {
  [key: string]: string | undefined;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditProfileFormProps {
  member: MemberPrivate;
  onClose: () => void;
  onSave: (updated: MemberPublic) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSocialLinks(raw: Record<string, string>): SocialLinkEntry[] {
  return Object.entries(raw).map(([platform, url]) => {
    const knownPlatform = SOCIAL_PLATFORMS.find((p) => p.key === platform);
    return {
      platform,
      url,
      isCustom: !knownPlatform,
    };
  });
}

function serializeSocialLinks(links: SocialLinkEntry[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const link of links) {
    if (link.platform.trim() && link.url.trim()) {
      result[link.platform.trim()] = link.url.trim();
    }
  }
  return result;
}

function toISODateString(val: Date | string | null | undefined): string {
  if (!val) return "";
  try {
    const d = typeof val === "string" ? new Date(val) : val;
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "var(--color-error)" };
  if (score <= 3) return { score, label: "Fair", color: "var(--color-warning)" };
  if (score === 4) return { score, label: "Good", color: "var(--color-primary)" };
  return { score, label: "Strong", color: "var(--color-success)" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-4 py-3 text-left",
        "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
        "text-sm font-semibold text-[var(--color-text-primary)]",
        "hover:border-[var(--color-accent)]/40 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      )}
      aria-expanded={isOpen}
    >
      {title}
      <span
        className={cn(
          "text-[var(--color-text-secondary)] transition-transform duration-200",
          isOpen ? "rotate-180" : "rotate-0"
        )}
        aria-hidden="true"
      >
        ▼
      </span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditProfileForm({
  member,
  onClose,
  onSave,
}: EditProfileFormProps): JSX.Element {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(["personal"])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [skillInput, setSkillInput] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState<FormState>(() => ({
    fullName: member.fullName ?? "",
    phone: member.phone ?? "",
    address: member.address ?? "",
    dob: toISODateString(member.dob),
    gender: member.gender ?? "",
    workplace: member.workplace ?? "",
    bio: member.bio ? (typeof member.bio === "string"
      ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: member.bio }] }] }
      : member.bio) : null,
    socialLinks: parseSocialLinks(
      typeof member.socialLinks === "object" && member.socialLinks !== null
        ? (member.socialLinks as Record<string, string>)
        : {}
    ),
    skills: Array.isArray(member.skills) ? [...member.skills] : [],
    avatarUrl: member.avatarUrl ?? "",
    coverUrl: member.coverUrl ?? "",
    interests: member.interests ?? "",
  }));

  const [passwordState, setPasswordState] = useState<PasswordState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ── Section toggle ──────────────────────────────────────────────────────────

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // ── Form field helpers ──────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  // ── Skills management ───────────────────────────────────────────────────────

  const addSkill = useCallback(() => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (formState.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    setField("skills", [...formState.skills, trimmed]);
    setSkillInput("");
    skillInputRef.current?.focus();
  }, [skillInput, formState.skills, setField]);

  const removeSkill = useCallback(
    (skill: string) => {
      setField(
        "skills",
        formState.skills.filter((s) => s !== skill)
      );
    },
    [formState.skills, setField]
  );

  const handleSkillKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSkill();
      } else if (e.key === "Backspace" && !skillInput && formState.skills.length > 0) {
        const last = formState.skills[formState.skills.length - 1];
        removeSkill(last);
      }
    },
    [addSkill, removeSkill, skillInput, formState.skills]
  );

  // ── Social links management ─────────────────────────────────────────────────

  const addSocialLink = useCallback(() => {
    const platform = newPlatform.trim() || "other";
    setField("socialLinks", [
      ...formState.socialLinks,
      { platform, url: "", isCustom: !SOCIAL_PLATFORMS.find((p) => p.key === platform) },
    ]);
    setNewPlatform("");
  }, [newPlatform, formState.socialLinks, setField]);

  const updateSocialLink = useCallback(
    (index: number, field: "platform" | "url", value: string) => {
      const updated = formState.socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      );
      setField("socialLinks", updated);
    },
    [formState.socialLinks, setField]
  );

  const removeSocialLink = useCallback(
    (index: number) => {
      setField(
        "socialLinks",
        formState.socialLinks.filter((_, i) => i !== index)
      );
    },
    [formState.socialLinks, setField]
  );

  // ── Password change ─────────────────────────────────────────────────────────

  const setPasswordField = useCallback(
    (key: keyof PasswordState, value: string) => {
      setPasswordState((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwordState.newPassword),
    [passwordState.newPassword]
  );

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errors: FieldError = {};

    if (!formState.fullName.trim()) {
      errors.fullName = "Full name is required";
    } else if (formState.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }

    if (formState.phone && !/^01[3-9]\d{8}$/.test(formState.phone)) {
      errors.phone = "Please enter a valid Bangladesh mobile number";
    }

    if (passwordExpanded && passwordState.newPassword) {
      if (!passwordState.currentPassword) {
        errors.currentPassword = "Please enter your current password";
      }
      if (passwordState.newPassword.length < 8) {
        errors.newPassword = "Password must be at least 8 characters";
      } else if (!/[A-Z]/.test(passwordState.newPassword)) {
        errors.newPassword = "Password must contain at least one uppercase letter";
      } else if (!/[0-9]/.test(passwordState.newPassword)) {
        errors.newPassword = "Password must contain at least one number";
      } else if (!/[^a-zA-Z0-9]/.test(passwordState.newPassword)) {
        errors.newPassword = "Password must contain at least one special character";
      }
      if (passwordState.newPassword !== passwordState.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formState, passwordState, passwordExpanded]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitError(null);

      if (!validate()) return;

      setIsSubmitting(true);

      try {
        const payload: Record<string, unknown> = {};

        if (formState.fullName.trim() !== (member.fullName ?? "")) {
          payload.fullName = formState.fullName.trim();
        }
        if (formState.phone.trim() !== (member.phone ?? "")) {
          payload.phone = formState.phone.trim();
        }
        if (formState.address.trim() !== (member.address ?? "")) {
          payload.address = formState.address.trim();
        }
        if (formState.dob !== toISODateString(member.dob)) {
          payload.dob = formState.dob || null;
        }
        if (formState.gender !== (member.gender ?? "")) {
          payload.gender = formState.gender || null;
        }
        if (formState.workplace.trim() !== (member.workplace ?? "")) {
          payload.workplace = formState.workplace.trim() || null;
        }
        if (formState.interests.trim() !== (member.interests ?? "")) {
          payload.interests = formState.interests.trim() || null;
        }
        if (formState.avatarUrl !== (member.avatarUrl ?? "")) {
          payload.avatarUrl = formState.avatarUrl;
        }
        if (formState.coverUrl !== (member.coverUrl ?? "")) {
          payload.coverUrl = formState.coverUrl;
        }
        if (JSON.stringify(formState.bio) !== JSON.stringify(member.bio)) {
          payload.bio = formState.bio;
        }

        const serializedSocial = serializeSocialLinks(formState.socialLinks);
        if (JSON.stringify(serializedSocial) !== JSON.stringify(member.socialLinks ?? {})) {
          payload.socialLinks = serializedSocial;
        }

        if (JSON.stringify(formState.skills) !== JSON.stringify(member.skills ?? [])) {
          payload.skills = formState.skills;
        }

        if (passwordExpanded && passwordState.newPassword && passwordState.currentPassword) {
          payload.currentPassword = passwordState.currentPassword;
          payload.newPassword = passwordState.newPassword;
        }

        if (Object.keys(payload).length === 0) {
          toast("No changes to save", "info");
          onClose();
          return;
        }

        const response = await fetch(`/api/members/${member.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 409) {
            setSubmitError(
              errorData.message ?? "A conflict occurred. The email or username may already be in use."
            );
          } else if (response.status === 400) {
            setSubmitError(errorData.message ?? "Invalid data. Please check your inputs.");
          } else if (response.status === 401 && passwordExpanded && passwordState.currentPassword) {
            setFieldErrors({ currentPassword: "Current password is incorrect" });
          } else {
            setSubmitError(errorData.message ?? "Failed to update profile. Please try again.");
          }
          return;
        }

        const data = await response.json();
        const updatedMember: MemberPublic = data.data ?? data;

        toast("Profile updated successfully", "success");
        onSave(updatedMember);
        onClose();
      } catch (err) {
        console.error("[EditProfileForm] submit error:", err);
        setSubmitError("An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, formState, member, passwordExpanded, passwordState, onSave, onClose]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      aria-label="Edit profile form"
      noValidate
    >
      {/* Global error */}
      {submitError && (
        <Alert
          variant="error"
          message={submitError}
          dismissible
          onDismiss={() => setSubmitError(null)}
        />
      )}

      {/* ── SECTION: Personal Info ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Personal Information"
          isOpen={openSections.has("personal")}
          onToggle={() => toggleSection("personal")}
        />
        {openSections.has("personal") && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <Input
              label="Full Name"
              required
              value={formState.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              error={fieldErrors.fullName}
              placeholder="Your full name"
              autoComplete="name"
            />
            <Input
              label="Phone Number"
              value={formState.phone}
              onChange={(e) => setField("phone", e.target.value)}
              error={fieldErrors.phone}
              placeholder="01XXXXXXXXX"
              type="tel"
              autoComplete="tel"
            />
            <Input
              label="Address"
              value={formState.address}
              onChange={(e) => setField("address", e.target.value)}
              error={fieldErrors.address}
              placeholder="Your address"
              autoComplete="street-address"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Date of Birth"
                type="date"
                value={formState.dob}
                onChange={(e) => setField("dob", e.target.value)}
                error={fieldErrors.dob}
                max={new Date().toISOString().split("T")[0]}
              />
              <Select
                label="Gender"
                value={formState.gender}
                onChange={(e) => setField("gender", e.target.value)}
                error={fieldErrors.gender}
                placeholder="Select gender"
                options={GENDER_OPTIONS}
              />
            </div>
            <Input
              label="Workplace / Institution"
              value={formState.workplace}
              onChange={(e) => setField("workplace", e.target.value)}
              error={fieldErrors.workplace}
              placeholder="Your current workplace or institution"
            />
            <Input
              label="Interests"
              value={formState.interests}
              onChange={(e) => setField("interests", e.target.value)}
              error={fieldErrors.interests}
              placeholder="e.g. Robotics, AI, IoT"
            />
          </div>
        )}
      </div>

      {/* ── SECTION: Bio ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Bio"
          isOpen={openSections.has("bio")}
          onToggle={() => toggleSection("bio")}
        />
        {openSections.has("bio") && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <FormLabel>About You</FormLabel>
            <TipTapEditor
              value={formState.bio}
              onChange={(json) => setField("bio", json)}
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Describe yourself, your research interests, and what you bring to the club.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION: Social Links ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Social Links"
          isOpen={openSections.has("social")}
          onToggle={() => toggleSection("social")}
        />
        {openSections.has("social") && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            {formState.socialLinks.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No social links added yet.
              </p>
            )}

            {formState.socialLinks.map((link, index) => {
              const knownPlatform = SOCIAL_PLATFORMS.find((p) => p.key === link.platform);
              const PlatformIcon = knownPlatform?.icon ?? Globe;

              return (
                <div
                  key={index}
                  className="flex items-start gap-2"
                >
                  <div className="mt-8 flex-shrink-0 text-[var(--color-text-secondary)]">
                    <PlatformIcon size={16} aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:gap-2">
                    {link.isCustom ? (
                      <Input
                        placeholder="Platform name"
                        value={link.platform}
                        onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                        className="sm:w-36"
                        label={index === 0 ? "Platform" : undefined}
                        aria-label="Platform name"
                      />
                    ) : (
                      <div className={cn("sm:w-36", index === 0 ? "mt-0" : "")}>
                        {index === 0 && <FormLabel>Platform</FormLabel>}
                        <div
                          className={cn(
                            "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)]",
                            "px-3 py-2 text-sm text-[var(--color-text-secondary)]",
                            index !== 0 ? "" : ""
                          )}
                        >
                          {knownPlatform?.label ?? link.platform}
                        </div>
                      </div>
                    )}
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                      type="url"
                      className="flex-1"
                      label={index === 0 ? "URL" : undefined}
                      aria-label={`URL for ${knownPlatform?.label ?? link.platform}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    aria-label={`Remove ${knownPlatform?.label ?? link.platform} link`}
                    className={cn(
                      "mt-7 flex-shrink-0 rounded-md p-1 text-[var(--color-text-secondary)]",
                      "hover:text-[var(--color-error)] transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                      index !== 0 ? "mt-0 self-center" : ""
                    )}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2 pt-1">
              {SOCIAL_PLATFORMS.filter(
                (p) => !formState.socialLinks.some((l) => l.platform === p.key)
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setField("socialLinks", [
                      ...formState.socialLinks,
                      { platform: p.key, url: "", isCustom: false },
                    ]);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                    "border-[var(--color-border)] text-[var(--color-text-secondary)]",
                    "hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]",
                    "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  <p.icon size={12} aria-hidden="true" />
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setField("socialLinks", [
                    ...formState.socialLinks,
                    { platform: "other", url: "", isCustom: true },
                  ])
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                  "border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)]",
                  "hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <Plus size={12} aria-hidden="true" />
                Custom
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION: Skills ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Skills"
          isOpen={openSections.has("skills")}
          onToggle={() => toggleSection("skills")}
        />
        {openSections.has("skills") && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <FormLabel htmlFor="skill-input">Skills</FormLabel>
            <div
              className={cn(
                "flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-[var(--color-border)] p-2",
                "bg-[var(--color-bg-elevated)]",
                "focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:border-[var(--color-accent)]",
                "transition-colors"
              )}
              onClick={() => skillInputRef.current?.focus()}
            >
              {formState.skills.map((skill) => (
                <span
                  key={skill}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                  )}
                >
                  {skill}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSkill(skill);
                    }}
                    aria-label={`Remove skill: ${skill}`}
                    className="ml-0.5 rounded-full p-0.5 hover:text-[var(--color-error)] transition-colors focus:outline-none"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </span>
              ))}
              <input
                id="skill-input"
                ref={skillInputRef}
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder={formState.skills.length === 0 ? "Type a skill and press Enter…" : "Add more…"}
                className={cn(
                  "flex-1 min-w-[120px] bg-transparent text-sm",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                  "outline-none border-0 focus:ring-0 p-0.5"
                )}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Press Enter or comma to add a skill. Press Backspace to remove the last one.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION: Avatar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Profile Photo"
          isOpen={openSections.has("avatar")}
          onToggle={() => toggleSection("avatar")}
        />
        {openSections.has("avatar") && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <CloudinaryWidget
              folder="members/avatars"
              value={formState.avatarUrl || null}
              onChange={(url) => setField("avatarUrl", url)}
              label="Profile Photo"
              accept="image/*"
            />
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Recommended: Square image, at least 256×256px. JPG or PNG.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION: Cover Photo ──────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Cover Photo"
          isOpen={openSections.has("cover")}
          onToggle={() => toggleSection("cover")}
        />
        {openSections.has("cover") && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <CloudinaryWidget
              folder="members/covers"
              value={formState.coverUrl || null}
              onChange={(url) => setField("coverUrl", url)}
              label="Cover Photo"
              accept="image/*"
            />
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Recommended: Landscape image, at least 1200×400px. JPG or PNG.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION: Password Change ──────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Change Password"
          isOpen={openSections.has("password")}
          onToggle={() => {
            toggleSection("password");
            setPasswordExpanded((prev) => !prev);
          }}
        />
        {openSections.has("password") && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
            <Alert
              variant="info"
              message="Leave these fields blank if you do not want to change your password."
            />
            <PasswordInput
              label="Current Password"
              value={passwordState.currentPassword}
              onChange={(e) => setPasswordField("currentPassword", e.target.value)}
              error={fieldErrors.currentPassword}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
            <div>
              <PasswordInput
                label="New Password"
                value={passwordState.newPassword}
                onChange={(e) => setPasswordField("newPassword", e.target.value)}
                error={fieldErrors.newPassword}
                autoComplete="new-password"
                placeholder="Enter new password (min. 8 characters)"
              />
              {passwordState.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className="h-1 flex-1 rounded-full transition-colors duration-300"
                          style={{
                            backgroundColor:
                              n <= passwordStrength.score
                                ? passwordStrength.color
                                : "var(--color-bg-elevated)",
                          }}
                        />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <ul className="text-xs text-[var(--color-text-secondary)] space-y-0.5 list-none">
                    {[
                      { check: passwordState.newPassword.length >= 8, label: "At least 8 characters" },
                      { check: /[A-Z]/.test(passwordState.newPassword), label: "One uppercase letter" },
                      { check: /[0-9]/.test(passwordState.newPassword), label: "One number" },
                      { check: /[^a-zA-Z0-9]/.test(passwordState.newPassword), label: "One special character" },
                    ].map(({ check, label }) => (
                      <li
                        key={label}
                        className="flex items-center gap-1.5"
                        style={{ color: check ? "var(--color-success)" : "var(--color-text-secondary)" }}
                      >
                        <span aria-hidden="true">{check ? "✓" : "○"}</span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <PasswordInput
              label="Confirm New Password"
              value={passwordState.confirmPassword}
              onChange={(e) => setPasswordField("confirmPassword", e.target.value)}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
              placeholder="Repeat your new password"
            />
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:border-[var(--color-accent)]/40 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
            "hover:opacity-90 transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting && <Spinner size="sm" label="Saving…" />}
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}