// src/components/membership/RegistrationForm.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  GraduationCap,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
  AlertCircle,
} from "lucide-react";
import useSWR from "swr";

import type { ClubConfigPublic } from "@/types/index";
import type { RegistrationFormState } from "@/types/ui";
import {
  memberSchema,
  accountSchema,
  type MemberSchemaInput,
  type AccountSchemaInput,
} from "@/lib/validations";
import {
  Input,
  Select,
  Checkbox,
  RadioCard,
  PasswordInput,
  FormLabel,
  FormError,
} from "@/components/ui/Forms";
import {
  Alert,
  ProgressBar,
  Spinner,
  Badge,
} from "@/components/ui/Feedback";
import {
  CloudinaryWidget,
  ImageCropper,
} from "@/components/ui/Media";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { cn } from "@/lib/utils";

// ─── Dynamic imports for PaymentStep and SuccessScreen ───────────────────────
// They are NOT found, so we render inline fallbacks guarded by existence checks.
// The spec says to import them; we do so lazily and render null fallback if absent.
let PaymentStep: React.ComponentType<PaymentStepProps> | null = null;
let SuccessScreen: React.ComponentType<SuccessScreenProps> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ps = require("@/components/membership/PaymentStep");
  PaymentStep = ps.PaymentStep ?? null;
} catch {
  PaymentStep = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ss = require("@/components/membership/SuccessScreen");
  SuccessScreen = ss.SuccessScreen ?? null;
} catch {
  SuccessScreen = null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentStepProps {
  config: Pick<
    ClubConfigPublic,
    "membershipFee" | "bkashNumber" | "nagadNumber"
  > & { requireScreenshot?: boolean };
  value: RegistrationFormState["paymentInfo"];
  onChange: (info: RegistrationFormState["paymentInfo"]) => void;
}

interface SuccessScreenProps {
  applicantName: string;
  email: string;
}

interface RegistrationFormProps {
  config: Pick<
    ClubConfigPublic,
    | "membershipFee"
    | "bkashNumber"
    | "nagadNumber"
    | "privacyPolicy"
    | "termsOfUse"
  > & { requireScreenshot?: boolean };
  departments: Array<{ id: string; name: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM_STATE: RegistrationFormState = {
  step: 1,
  memberType: null,
  personalInfo: {
    fullName: "",
    studentId: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    address: "",
    departmentId: "",
    session: "",
    avatarUrl: "",
  },
  accountInfo: {
    username: "",
    password: "",
    confirmPassword: "",
  },
  paymentInfo: {
    paymentMethod: "",
    transactionId: "",
    senderPhone: "",
    screenshotUrl: "",
  },
};

const STEP_LABELS = [
  "Member Type",
  "Personal Info",
  "Account",
  "Payment",
  "Review",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// ─── Password Strength ───────────────────────────────────────────────────────

function computePasswordStrength(password: string): {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (!password) return { level: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels: Array<{ label: string; color: string }> = [
    { label: "Too short", color: "var(--color-error)" },
    { label: "Weak", color: "var(--color-error)" },
    { label: "Fair", color: "var(--color-warning)" },
    { label: "Good", color: "var(--color-primary)" },
    { label: "Strong", color: "var(--color-success)" },
  ];

  return { level: score as 0 | 1 | 2 | 3 | 4, ...levels[score] };
}

// ─── Username availability fetcher ───────────────────────────────────────────

const usernameFetcher = async (url: string): Promise<{ available: boolean }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

function useUsernameAvailability(username: string) {
  const [debouncedUsername, setDebouncedUsername] = useState("");

  useEffect(() => {
    if (username.length < 3) {
      setDebouncedUsername("");
      return;
    }
    const timer = setTimeout(() => setDebouncedUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username]);

  const { data, isLoading, error } = useSWR(
    debouncedUsername
      ? `/api/members?checkUsername=${encodeURIComponent(debouncedUsername)}`
      : null,
    usernameFetcher,
    { revalidateOnFocus: false }
  );

  return {
    isChecking: isLoading,
    isAvailable: data?.available ?? null,
    hasError: !!error,
  };
}

// ─── Framer Motion variants ──────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

const reducedMotionVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ─── Step 1: Member Type ─────────────────────────────────────────────────────

interface Step1Props {
  memberType: "member" | "alumni" | null;
  onChange: (type: "member" | "alumni") => void;
}

function Step1MemberType({ memberType, onChange }: Step1Props): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Who are you?
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Select your membership type to get started
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RadioCard
          name="memberType"
          value="member"
          checked={memberType === "member"}
          onChange={() => onChange("member")}
          label="Current Student"
          description="Currently enrolled at GSTU as a student"
          icon={<User size={28} />}
        />
        <RadioCard
          name="memberType"
          value="alumni"
          checked={memberType === "alumni"}
          onChange={() => onChange("alumni")}
          label="Alumni"
          description="Graduated from GSTU and want to stay connected"
          icon={<GraduationCap size={28} />}
        />
      </div>

      {!memberType && (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Select one option to continue
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Personal Info ───────────────────────────────────────────────────

interface Step2Props {
  departments: Array<{ id: string; name: string }>;
  defaultValues: RegistrationFormState["personalInfo"];
  onSave: (data: RegistrationFormState["personalInfo"]) => void;
  onNext: () => void;
  memberType: "member" | "alumni" | null;
}

function Step2PersonalInfo({
  departments,
  defaultValues,
  onSave,
  onNext,
  memberType,
}: Step2Props): JSX.Element {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MemberSchemaInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: defaultValues.fullName,
      studentId: defaultValues.studentId,
      email: defaultValues.email,
      phone: defaultValues.phone,
      departmentId: defaultValues.departmentId,
      session: defaultValues.session,
      gender: defaultValues.gender,
      dob: defaultValues.dob ? new Date(defaultValues.dob) : undefined,
      address: defaultValues.address,
      workplace: defaultValues.workplace ?? "",
    },
  });

  const [avatarUrl, setAvatarUrl] = useState<string>(defaultValues.avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );

  const { upload: uploadAvatar } = useCloudinaryUpload("members/avatars");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = useCallback((url: string) => {
    if (!url) {
      setAvatarUrl("");
      return;
    }
    setCropSrc(url);
  }, []);

  const handleCropComplete = useCallback(
    async (file: File) => {
      setCropSrc(null);
      setAvatarUploading(true);
      try {
        const { url } = await uploadAvatar(file);
        setAvatarUrl(url);
      } catch {
        const objectUrl = URL.createObjectURL(file);
        setAvatarUrl(objectUrl);
      } finally {
        setAvatarUploading(false);
      }
    },
    [uploadAvatar]
  );

  const onSubmit = useCallback(
    (data: MemberSchemaInput) => {
      onSave({
        fullName: data.fullName,
        studentId: data.studentId,
        email: data.email,
        phone: data.phone,
        gender: data.gender ?? "",
        dob: data.dob ? data.dob.toISOString().split("T")[0] : "",
        address: data.address ?? "",
        departmentId: data.departmentId,
        session: data.session,
        avatarUrl,
        workplace: data.workplace ?? "",
      });
      onNext();
    },
    [onSave, onNext, avatarUrl]
  );

  if (cropSrc) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Crop your profile photo
        </h3>
        <ImageCropper
          imgSrc={cropSrc}
          aspectRatio={1}
          onCrop={handleCropComplete}
          onCancel={() => setCropSrc(null)}
        />
      </div>
    );
  }

  return (
    <form
      id="step2-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Tell us about yourself
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex justify-center mb-2">
        <CloudinaryWidget
          folder="members/avatars"
          value={avatarUrl || null}
          onChange={handleAvatarUpload}
          label="Profile Photo (optional)"
          accept="image/*"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          required
          placeholder="e.g. Rahim Uddin"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Input
          label={memberType === "alumni" ? "Student ID (former)" : "Student ID"}
          required
          placeholder="e.g. 2019-CSE-001"
          error={errors.studentId?.message}
          {...register("studentId")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email Address"
          required
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone Number"
          required
          type="tel"
          placeholder="01XXXXXXXXX"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Department"
          required
          placeholder="Select department"
          options={departmentOptions}
          error={errors.departmentId?.message}
          {...register("departmentId")}
        />
        <Input
          label="Session"
          required
          placeholder="e.g. 2019-20"
          error={errors.session?.message}
          {...register("session")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Gender"
          placeholder="Select gender (optional)"
          options={GENDER_OPTIONS}
          error={errors.gender?.message}
          {...register("gender")}
        />
        <Input
          label="Date of Birth"
          type="date"
          error={errors.dob?.message}
          {...register("dob")}
        />
      </div>

      <Input
        label="Address"
        placeholder="Your current address (optional)"
        error={errors.address?.message}
        {...register("address")}
      />

      {memberType === "alumni" && (
        <Input
          label="Current Workplace"
          placeholder="Company / Organization (optional)"
          error={errors.workplace?.message}
          {...register("workplace")}
        />
      )}

      {/* Hidden submit — triggered by parent Next button */}
      <button type="submit" id="step2-submit" className="sr-only">
        Submit Step 2
      </button>
    </form>
  );
}

// ─── Step 3: Account Info ────────────────────────────────────────────────────

interface Step3Props {
  defaultValues: RegistrationFormState["accountInfo"];
  onSave: (data: RegistrationFormState["accountInfo"]) => void;
  onNext: () => void;
}

function Step3AccountInfo({ defaultValues, onSave, onNext }: Step3Props): JSX.Element {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountSchemaInput>({
    resolver: zodResolver(accountSchema),
    defaultValues,
  });

  const password = watch("password", "");
  const username = watch("username", "");
  const strength = useMemo(() => computePasswordStrength(password), [password]);
  const { isChecking, isAvailable, hasError } = useUsernameAvailability(username);

  const onSubmit = useCallback(
    (data: AccountSchemaInput) => {
      onSave({
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      onNext();
    },
    [onSave, onNext]
  );

  return (
    <form
      id="step3-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Create Your Account
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Choose a username and a secure password
        </p>
      </div>

      {/* Username with availability */}
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Input
            label="Username"
            required
            placeholder="only letters, numbers, underscores"
            error={errors.username?.message}
            {...register("username")}
          />
          {username.length >= 3 && (
            <span className="absolute right-3 top-[34px]">
              {isChecking ? (
                <Spinner size="sm" />
              ) : hasError ? (
                <AlertCircle
                  size={16}
                  className="text-[var(--color-warning)]"
                  aria-label="Could not check availability"
                />
              ) : isAvailable === true ? (
                <Check
                  size={16}
                  className="text-[var(--color-success)]"
                  aria-label="Username available"
                />
              ) : isAvailable === false ? (
                <X
                  size={16}
                  className="text-[var(--color-error)]"
                  aria-label="Username taken"
                />
              ) : null}
            </span>
          )}
        </div>
        {username.length >= 3 && !isChecking && !hasError && (
          <p
            className={cn(
              "text-xs",
              isAvailable === true
                ? "text-[var(--color-success)]"
                : isAvailable === false
                ? "text-[var(--color-error)]"
                : "text-[var(--color-text-secondary)]"
            )}
          >
            {isAvailable === true
              ? "Username is available"
              : isAvailable === false
              ? "Username is already taken"
              : ""}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <PasswordInput
          label="Password"
          required
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        {password && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor:
                      strength.level >= bar ? strength.color : "var(--color-bg-elevated)",
                  }}
                />
              ))}
            </div>
            {strength.label && (
              <p className="text-xs" style={{ color: strength.color }}>
                {strength.label}
              </p>
            )}
          </div>
        )}
        <ul className="list-none mt-1 space-y-0.5">
          {[
            { test: password.length >= 8, label: "At least 8 characters" },
            { test: /[A-Z]/.test(password), label: "One uppercase letter" },
            { test: /[0-9]/.test(password), label: "One number" },
            { test: /[^a-zA-Z0-9]/.test(password), label: "One special character" },
          ].map((req) => (
            <li
              key={req.label}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                req.test
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-text-secondary)]"
              )}
            >
              {req.test ? (
                <Check size={10} aria-hidden="true" />
              ) : (
                <X size={10} aria-hidden="true" className="opacity-40" />
              )}
              {req.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Confirm Password */}
      <PasswordInput
        label="Confirm Password"
        required
        placeholder="Re-enter your password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <button type="submit" id="step3-submit" className="sr-only">
        Submit Step 3
      </button>
    </form>
  );
}

// ─── Step 4: Payment (inline fallback if PaymentStep not found) ──────────────

interface Step4Props {
  config: RegistrationFormProps["config"];
  value: RegistrationFormState["paymentInfo"];
  onChange: (info: RegistrationFormState["paymentInfo"]) => void;
}

function Step4Payment({ config, value, onChange }: Step4Props): JSX.Element {
  if (PaymentStep) {
    return (
      <PaymentStep
        config={{
          membershipFee: config.membershipFee,
          bkashNumber: config.bkashNumber,
          nagadNumber: config.nagadNumber,
          requireScreenshot: config.requireScreenshot ?? false,
        }}
        value={value}
        onChange={onChange}
      />
    );
  }

  // Inline fallback payment step
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Payment
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Pay the membership fee of{" "}
          <span className="font-bold text-[var(--color-accent)]">
            BDT {config.membershipFee}
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg-surface)]">
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
          Select Payment Method
        </p>
        <div className="grid grid-cols-2 gap-3">
          <RadioCard
            name="paymentMethod"
            value="bkash"
            checked={value.paymentMethod === "bkash"}
            onChange={() => onChange({ ...value, paymentMethod: "bkash" })}
            label="bKash"
            description={config.bkashNumber}
          />
          <RadioCard
            name="paymentMethod"
            value="nagad"
            checked={value.paymentMethod === "nagad"}
            onChange={() => onChange({ ...value, paymentMethod: "nagad" })}
            label="Nagad"
            description={config.nagadNumber}
          />
        </div>
      </div>

      {value.paymentMethod && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-accent)] bg-[var(--color-bg-elevated)] p-3">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Send BDT {config.membershipFee} to:
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--color-accent)] ml-1">
              {value.paymentMethod === "bkash"
                ? config.bkashNumber
                : config.nagadNumber}
            </span>
            <button
              type="button"
              onClick={() => {
                const num =
                  value.paymentMethod === "bkash"
                    ? config.bkashNumber
                    : config.nagadNumber;
                navigator.clipboard
                  .writeText(num)
                  .catch(() => {});
              }}
              className="ml-auto text-xs text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
            >
              Copy
            </button>
          </div>

          <Input
            label="Transaction ID"
            required
            placeholder="Enter transaction ID"
            value={value.transactionId}
            onChange={(e) =>
              onChange({ ...value, transactionId: e.target.value })
            }
          />

          <Input
            label="Sender Phone Number"
            required
            type="tel"
            placeholder="01XXXXXXXXX"
            value={value.senderPhone}
            onChange={(e) =>
              onChange({ ...value, senderPhone: e.target.value })
            }
          />

          <CloudinaryWidget
            folder="payments"
            value={value.screenshotUrl || null}
            onChange={(url) => onChange({ ...value, screenshotUrl: url })}
            label="Payment Screenshot"
            accept="image/*"
          />
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Review ──────────────────────────────────────────────────────────

interface Step5Props {
  state: RegistrationFormState;
  departments: Array<{ id: string; name: string }>;
  onEditStep: (step: 1 | 2 | 3 | 4) => void;
  privacyPolicy: string;
  termsOfUse: string;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function Step5Review({
  state,
  departments,
  onEditStep,
  privacyPolicy,
  termsOfUse,
  agreed,
  onAgreedChange,
  submitError,
  isSubmitting,
  onSubmit,
}: Step5Props): JSX.Element {
  const deptName =
    departments.find((d) => d.id === state.personalInfo.departmentId)?.name ??
    state.personalInfo.departmentId;

  const rows: Array<{ label: string; value: string | undefined; step: 1 | 2 | 3 | 4 }> = [
    { label: "Member Type", value: state.memberType === "alumni" ? "Alumni" : "Current Student", step: 1 },
    { label: "Full Name", value: state.personalInfo.fullName, step: 2 },
    { label: "Student ID", value: state.personalInfo.studentId, step: 2 },
    { label: "Email", value: state.personalInfo.email, step: 2 },
    { label: "Phone", value: state.personalInfo.phone, step: 2 },
    { label: "Department", value: deptName, step: 2 },
    { label: "Session", value: state.personalInfo.session, step: 2 },
    { label: "Username", value: state.accountInfo.username, step: 3 },
    {
      label: "Password",
      value: "••••••••",
      step: 3,
    },
    {
      label: "Payment Method",
      value: state.paymentInfo.paymentMethod || "—",
      step: 4,
    },
    {
      label: "Transaction ID",
      value: state.paymentInfo.transactionId || "—",
      step: 4,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-[var(--font-heading)]">
          Review Your Application
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Please verify your information before submitting
        </p>
      </div>

      {state.personalInfo.avatarUrl && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.personalInfo.avatarUrl}
            alt="Profile photo"
            className="h-20 w-20 rounded-full object-cover border-2 border-[var(--color-accent)]"
          />
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            <span className="text-xs text-[var(--color-text-secondary)] w-32 flex-shrink-0">
              {row.label}
            </span>
            <span className="text-sm text-[var(--color-text-primary)] flex-1 min-w-0 truncate mx-2">
              {row.value}
            </span>
            <button
              type="button"
              onClick={() => onEditStep(row.step)}
              className={cn(
                "text-xs text-[var(--color-accent)] hover:underline flex-shrink-0",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              )}
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Terms & Conditions */}
      <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-bg-surface)]">
        <p className="text-xs text-[var(--color-text-secondary)] mb-3 leading-5">
          By submitting this application, you agree to our{" "}
          {privacyPolicy ? (
            <a
              href={privacyPolicy}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Privacy Policy
            </a>
          ) : (
            "Privacy Policy"
          )}{" "}
          and{" "}
          {termsOfUse ? (
            <a
              href={termsOfUse}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Terms of Use
            </a>
          ) : (
            "Terms of Use"
          )}
          .
        </p>
        <Checkbox
          id="code-of-conduct"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          label="I agree to the club's code of conduct and the terms above"
          required
        />
      </div>

      {submitError && (
        <Alert variant="error" message={submitError} dismissible />
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!agreed || isSubmitting}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
          "bg-[var(--color-primary)] text-white transition-all",
          "hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <Spinner size="sm" />
            Submitting…
          </>
        ) : (
          "Submit Application"
        )}
      </button>
    </div>
  );
}

// ─── Inline Success Fallback ──────────────────────────────────────────────────

function InlineSuccessScreen({
  applicantName,
  email,
}: {
  applicantName: string;
  email: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-success)]/10">
        <Check size={40} className="text-[var(--color-success)]" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
          Application Submitted!
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto">
          Thank you, {applicantName}! Your application has been received. We&apos;ll
          notify you at{" "}
          <span className="text-[var(--color-accent)]">{email}</span> once it&apos;s
          reviewed.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-5 bg-[var(--color-bg-surface)] text-left w-full max-w-sm">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          What happens next?
        </p>
        <ol className="space-y-2">
          {[
            "Our team reviews your application (24–48 hours)",
            "You receive an email with the decision",
            "If approved, you can log in and access all member features",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
              <Badge variant="primary" size="sm" className="flex-shrink-0 mt-0.5">
                {i + 1}
              </Badge>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3">
        <a
          href="/"
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Return to Home
        </a>
        <a
          href="/membership/status"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium",
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Check Status
        </a>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
}: {
  currentStep: number;
}): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-0 mb-2">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        const isActive = step === currentStep;
        const isComplete = step < currentStep;

        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  isComplete
                    ? "bg-[var(--color-success)] text-white"
                    : isActive
                    ? "bg-[var(--color-primary)] text-white ring-2 ring-[var(--color-primary)]/30"
                    : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? <Check size={14} aria-hidden="true" /> : step}
              </div>
              <span
                className={cn(
                  "hidden sm:block text-[10px] font-medium",
                  isActive
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)]"
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-6 sm:w-12 mx-0.5 mb-4 transition-colors duration-300",
                  step < currentStep
                    ? "bg-[var(--color-success)]"
                    : "bg-[var(--color-border)]"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrationForm({
  config,
  departments,
}: RegistrationFormProps): JSX.Element {
  const [formState, setFormState] = useState<RegistrationFormState>(INITIAL_FORM_STATE);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  // Reduce motion preference
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const variants = prefersReducedMotion.current
    ? reducedMotionVariants
    : slideVariants;

  const formRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const goToStep = useCallback(
    (newStep: 1 | 2 | 3 | 4 | 5, dir: 1 | -1) => {
      setDirection(dir);
      setFormState((prev) => ({ ...prev, step: newStep }));
      scrollToTop();
    },
    [scrollToTop]
  );

  // Step 1 → 2
  const handleStep1Next = useCallback(() => {
    if (!formState.memberType) return;
    goToStep(2, 1);
  }, [formState.memberType, goToStep]);

  // Step 2 submit triggers step 3
  const handleStep2Save = useCallback(
    (personalInfo: RegistrationFormState["personalInfo"]) => {
      setFormState((prev) => ({ ...prev, personalInfo }));
    },
    []
  );

  // Step 3 submit triggers step 4
  const handleStep3Save = useCallback(
    (accountInfo: RegistrationFormState["accountInfo"]) => {
      setFormState((prev) => ({ ...prev, accountInfo }));
    },
    []
  );

  // Payment change
  const handlePaymentChange = useCallback(
    (paymentInfo: RegistrationFormState["paymentInfo"]) => {
      setFormState((prev) => ({ ...prev, paymentInfo }));
    },
    []
  );

  // Step 4 validation
  const isPaymentValid = useMemo(() => {
    const p = formState.paymentInfo;
    if (!p.paymentMethod) return false;
    if (!p.transactionId || p.transactionId.length < 5) return false;
    if (!p.senderPhone) return false;
    return true;
  }, [formState.paymentInfo]);

  // Next button per step
  const handleNextClick = useCallback(() => {
    const { step } = formState;
    if (step === 1) {
      handleStep1Next();
    } else if (step === 2) {
      document.getElementById("step2-submit")?.click();
    } else if (step === 3) {
      document.getElementById("step3-submit")?.click();
    } else if (step === 4) {
      if (!isPaymentValid) return;
      goToStep(5, 1);
    }
  }, [formState, handleStep1Next, goToStep, isPaymentValid]);

  const handleBack = useCallback(() => {
    const { step } = formState;
    if (step > 1) goToStep((step - 1) as 1 | 2 | 3 | 4 | 5, -1);
  }, [formState, goToStep]);

  const handleEditStep = useCallback(
    (step: 1 | 2 | 3 | 4) => {
      goToStep(step, -1);
    },
    [goToStep]
  );

  // Final submission
  const handleSubmit = useCallback(async () => {
    if (!agreed) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const body = {
      fullName: formState.personalInfo.fullName,
      studentId: formState.personalInfo.studentId,
      email: formState.personalInfo.email,
      phone: formState.personalInfo.phone,
      departmentId: formState.personalInfo.departmentId,
      session: formState.personalInfo.session,
      gender: formState.personalInfo.gender || undefined,
      dob: formState.personalInfo.dob || undefined,
      address: formState.personalInfo.address || undefined,
      workplace: formState.personalInfo.workplace || undefined,
      avatarUrl: formState.personalInfo.avatarUrl || undefined,
      memberType: formState.memberType,
      username: formState.accountInfo.username,
      password: formState.accountInfo.password,
      confirmPassword: formState.accountInfo.confirmPassword,
      paymentMethod: formState.paymentInfo.paymentMethod,
      transactionId: formState.paymentInfo.transactionId,
      senderPhone: formState.paymentInfo.senderPhone,
      screenshotUrl: formState.paymentInfo.screenshotUrl,
    };

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Submission failed. Please try again.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
          else if (data?.error) message = data.error;
        } catch {
          // ignore parse error
        }
        if (res.status === 409) {
          message =
            message.includes("pending")
              ? message
              : "An account or pending application already exists with this email or username.";
        }
        setSubmitError(message);
        return;
      }

      setSubmittedName(formState.personalInfo.fullName);
      setSubmittedEmail(formState.personalInfo.email);
      setSubmitted(true);
      scrollToTop();
    } catch {
      setSubmitError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [agreed, formState, scrollToTop]);

  const progressValue = ((formState.step - 1) / 4) * 100;

  // ─── Submitted state ────────────────────────────────────────────────────────
  if (submitted) {
    if (SuccessScreen) {
      return (
        <SuccessScreen
          applicantName={submittedName}
          email={submittedEmail}
        />
      );
    }
    return (
      <InlineSuccessScreen
        applicantName={submittedName}
        email={submittedEmail}
      />
    );
  }

  const canGoNext: boolean =
    formState.step === 1
      ? !!formState.memberType
      : formState.step === 4
      ? isPaymentValid
      : true;

  return (
    <div ref={formRef} className="mx-auto w-full max-w-xl px-4 py-8">
      {/* Card wrapper */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Progress bar */}
        <div className="px-6 pt-6 pb-0">
          <ProgressBar
            value={progressValue}
            variant="accent"
            size="sm"
            className="mb-4"
          />
          <StepIndicator currentStep={formState.step} />
        </div>

        {/* Animated step content */}
        <div className="relative overflow-hidden px-6 pb-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={formState.step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {formState.step === 1 && (
                <Step1MemberType
                  memberType={formState.memberType}
                  onChange={(type) =>
                    setFormState((prev) => ({ ...prev, memberType: type }))
                  }
                />
              )}

              {formState.step === 2 && (
                <Step2PersonalInfo
                  departments={departments}
                  defaultValues={formState.personalInfo}
                  memberType={formState.memberType}
                  onSave={handleStep2Save}
                  onNext={() => goToStep(3, 1)}
                />
              )}

              {formState.step === 3 && (
                <Step3AccountInfo
                  defaultValues={formState.accountInfo}
                  onSave={handleStep3Save}
                  onNext={() => goToStep(4, 1)}
                />
              )}

              {formState.step === 4 && (
                <Step4Payment
                  config={config}
                  value={formState.paymentInfo}
                  onChange={handlePaymentChange}
                />
              )}

              {formState.step === 5 && (
                <Step5Review
                  state={formState}
                  departments={departments}
                  onEditStep={handleEditStep}
                  privacyPolicy={config.privacyPolicy}
                  termsOfUse={config.termsOfUse}
                  agreed={agreed}
                  onAgreedChange={setAgreed}
                  submitError={submitError}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons — hidden on step 5 (has its own submit button) */}
        {formState.step < 5 && (
          <div className="flex items-center justify-between px-6 pb-6 pt-0 border-t border-[var(--color-border)] mt-0">
            {formState.step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNextClick}
              disabled={!canGoNext}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                "bg-[var(--color-primary)] text-white",
                "hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {formState.step === 4 ? "Review" : "Continue"}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Step text indicator for screen readers */}
      <p className="sr-only" aria-live="polite">
        Step {formState.step} of 5: {STEP_LABELS[formState.step - 1]}
      </p>
    </div>
  );
}