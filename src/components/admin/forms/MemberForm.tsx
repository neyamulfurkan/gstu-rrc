// src/components/admin/forms/MemberForm.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";

import type { MemberPrivate } from "@/types/index";
import {
  Input,
  Textarea,
  Select,
  PasswordInput,
  FormLabel,
  FormError,
  Checkbox,
} from "@/components/ui/Forms";
import { Alert, Spinner, Badge } from "@/components/ui/Feedback";
import { CloudinaryWidget } from "@/components/ui/Media";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleOption {
  id: string;
  name: string;
  color: string;
  category: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface MemberFormProps {
  initialData?: Partial<MemberPrivate>;
  roles: RoleOption[];
  departments: DepartmentOption[];
  onSubmit: (data: MemberFormValues) => Promise<void>;
  onClose: () => void;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const baseMemberFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores").optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Please enter a valid Bangladesh mobile number"),
  studentId: z.string().min(5, "Student ID must be at least 5 characters"),
  departmentId: z.string().min(1, "Please select a department"),
  session: z.string().min(4, "Session must be at least 4 characters"),
  gender: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  memberType: z.enum(["member", "alumni"]),
  roleId: z.string().min(1, "Please select a role").or(z.literal("")).refine(val => val !== "", { message: "Please select a role" }),
  status: z.enum(["active", "inactive", "suspended"]),
  avatarUrl: z.string().optional(),
  password: z.string().optional(),
  adminNotes: z.string().optional(),
  workplace: z.string().optional(),
  interests: z.string().optional(),
});

const memberFormSchema = baseMemberFormSchema.superRefine((data, ctx) => {
  if (
    data.password !== undefined &&
    data.password !== "" &&
    data.password.length < 8
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be at least 8 characters",
      path: ["password"],
    });
  }
});

const createMemberFormSchema = baseMemberFormSchema
  .extend({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter",
      })
      .refine((val) => /[0-9]/.test(val), {
        message: "Password must contain at least one number",
      })
      .refine((val) => /[^a-zA-Z0-9]/.test(val), {
        message: "Password must contain at least one special character",
      }),
  });

type MemberFormValues = z.infer<typeof memberFormSchema>;

// ─── Role category order ──────────────────────────────────────────────────────

const ROLE_CATEGORY_LABELS: Record<string, string> = {
  executive: "Executive",
  sub_executive: "Sub-Executive",
  general: "General",
  alumni: "Alumni",
  admin: "Admin",
};

const ROLE_CATEGORY_ORDER = ["executive", "sub_executive", "general", "alumni", "admin"];

// ─── MemberForm ───────────────────────────────────────────────────────────────

export function MemberForm({
  initialData,
  roles,
  departments,
  onSubmit,
  onClose,
}: MemberFormProps): JSX.Element {
  const isEditing = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialData?.avatarUrl ?? ""
  );

  const schema = isEditing ? memberFormSchema : createMemberFormSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(schema as z.ZodType<MemberFormValues>),
    defaultValues: {
      fullName: initialData?.fullName ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      studentId: initialData?.studentId ?? "",
      departmentId: (initialData as any)?.departmentId ?? "",
      session: initialData?.session ?? "",
      gender: initialData?.gender ?? "",
      dob: initialData?.dob
        ? typeof initialData.dob === "string"
          ? initialData.dob.slice(0, 10)
          : new Date(initialData.dob).toISOString().slice(0, 10)
        : "",
      address: initialData?.address ?? "",
      bio: initialData?.bio ?? "",
      memberType: (initialData?.memberType as "member" | "alumni") ?? "member",
      roleId: (initialData as any)?.roleId ?? (initialData?.role?.name ? roles.find((r) => r.name === initialData.role!.name)?.id : undefined) ?? "",
      status: (initialData?.status as "active" | "inactive" | "suspended") ?? "active",
      username: "",
      avatarUrl: initialData?.avatarUrl ?? "",
      password: "",
      adminNotes: initialData?.adminNotes ?? "",
      workplace: initialData?.workplace ?? "",
      interests: initialData?.interests ?? "",
    },
  });

  const memberType = watch("memberType");

  // Re-sync roleId once roles finish loading (SWR may deliver roles after form mounts)
  useEffect(() => {
    if (roles.length === 0) return;
    const resolvedRoleId = isEditing
      ? (initialData as any)?.roleId ??
        roles.find((r) => r.name === (initialData as any)?.role?.name)?.id ??
        ""
      : "";
    if (resolvedRoleId) {
      setValue("roleId", resolvedRoleId, { shouldValidate: false, shouldDirty: false });
    }
  }, [roles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync avatarUrl state into form
  useEffect(() => {
    setValue("avatarUrl", avatarUrl, { shouldValidate: false });
  }, [avatarUrl, setValue]);

  // Group roles by category
  const groupedRoles = React.useMemo(() => {
    const groups: Record<string, RoleOption[]> = {};
    roles.forEach((role) => {
      if (!groups[role.category]) groups[role.category] = [];
      groups[role.category].push(role);
    });
    return groups;
  }, [roles]);

  const handleFormSubmit = useCallback(
    async (data: MemberFormValues) => {
      setServerError(null);
      setIsSubmitting(true);
      try {
        const payload: Record<string, unknown> = {};

        // Only include fields that have actual values (avoid sending empty strings that fail validation)
        if (!isEditing && data.username) payload.username = data.username;
        if (data.fullName) payload.fullName = data.fullName;
        if (data.email) payload.email = data.email;
        if (data.phone) payload.phone = data.phone;
        if (data.studentId) payload.studentId = data.studentId;
        if (data.session) payload.session = data.session;
        if (data.memberType) payload.memberType = data.memberType;
        if (data.status) payload.status = data.status;
        payload.roleId = data.roleId && data.roleId !== "" ? data.roleId : undefined;
        // Ensure roleId is always sent for admin edits even if it equals the original
        if (isEditing && data.roleId && data.roleId !== "") {
          payload.roleId = data.roleId;
        }
        if (data.departmentId && data.departmentId !== "") payload.departmentId = data.departmentId;
        if (data.gender !== undefined) payload.gender = data.gender || null;
        if (data.dob !== undefined) payload.dob = data.dob || null;
        if (data.address !== undefined) payload.address = data.address;
        if (data.bio !== undefined) payload.bio = data.bio;
        if (data.interests !== undefined) payload.interests = data.interests;
        if (data.workplace !== undefined) payload.workplace = data.workplace;
        if (data.adminNotes !== undefined) payload.adminNotes = data.adminNotes;
        if (avatarUrl || data.avatarUrl) payload.avatarUrl = avatarUrl || data.avatarUrl;
        if (!isEditing) {
          if (data.password && data.password.trim() !== "") payload.password = data.password;
        } else {
          if (data.password && data.password.trim() !== "") payload.newPassword = data.password;
        }
        await onSubmit(payload as MemberFormValues);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred. Please try again.";
        setServerError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [avatarUrl, isEditing, onSubmit]
  );

  return (
    <div className="flex flex-col bg-[var(--color-bg-surface)] rounded-xl overflow-hidden" style={{ maxHeight: "85vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {isEditing ? "Edit Member" : "Add New Member"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className={cn(
            "rounded-lg p-1.5 text-[var(--color-text-secondary)]",
            "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable body */}
      <form
        id="member-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex-1 overflow-y-auto min-h-0"
        noValidate
      >
        <div className="px-6 py-5 space-y-6">
          {/* Server error */}
          {serverError && (
            <Alert
              variant="error"
              title="Submission Failed"
              message={serverError}
              dismissible
              onDismiss={() => setServerError(null)}
            />
          )}

          {/* ── Avatar ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 pb-1 border-b border-[var(--color-border)]">
              Profile Photo
            </h3>
            <CloudinaryWidget
              folder="members/avatars"
              value={avatarUrl}
              onChange={setAvatarUrl}
              label="Avatar Image"
              accept="image/*"
            />
            <input type="hidden" {...register("avatarUrl")} />
            {errors.avatarUrl && (
              <FormError>{errors.avatarUrl.message}</FormError>
            )}
          </section>

          {/* ── Personal Information ───────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 pb-1 border-b border-[var(--color-border)]">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                required
                placeholder="e.g. Rahim Uddin"
                error={errors.fullName?.message}
                {...register("fullName")}
              />
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="e.g. rahim@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                label="Phone Number"
                type="tel"
                required
                placeholder="e.g. 01712345678"
                error={errors.phone?.message}
                {...register("phone")}
              />
              <Input
                label="Student ID"
                required
                placeholder="e.g. 2021331001"
                error={errors.studentId?.message}
                {...register("studentId")}
              />
              <div>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Department"
                      required
                      placeholder="Select department"
                      error={errors.departmentId?.message}
                      {...field}
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <Input
                label="Session"
                required
                placeholder="e.g. 2021-22"
                error={errors.session?.message}
                {...register("session")}
              />
              {!isEditing && (
                <Input
                  label="Username"
                  required
                  placeholder="e.g. rahim2021"
                  error={(errors as any).username?.message}
                  {...register("username")}
                />
              )}
              <div>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Gender"
                      placeholder="Select gender (optional)"
                      error={errors.gender?.message}
                      {...field}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Select>
                  )}
                />
              </div>
              <Input
                label="Date of Birth"
                type="date"
                error={errors.dob?.message}
                {...register("dob")}
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Address"
                placeholder="Full address (optional)"
                error={errors.address?.message}
                {...register("address")}
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Bio"
                placeholder="Short biography (optional)"
                error={errors.bio?.message}
                {...register("bio")}
              />
            </div>
            <div className="mt-4">
              <Input
                label="Interests"
                placeholder="e.g. Robotics, AI, IoT (optional)"
                error={errors.interests?.message}
                {...register("interests")}
              />
            </div>
          </section>

          {/* ── Account Settings ───────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 pb-1 border-b border-[var(--color-border)]">
              Account Settings
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Controller
                  name="memberType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Member Type"
                      required
                      error={errors.memberType?.message}
                      {...field}
                    >
                      <option value="member">Member</option>
                      <option value="alumni">Alumni</option>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Status"
                      required
                      error={errors.status?.message}
                      {...field}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  )}
                />
              </div>
              <div className="sm:col-span-2">
                <Controller
                  name="roleId"
                  control={control}
                  render={({ field }) => (
                    <div className="w-full">
                      <FormLabel htmlFor="roleId" required>
                        Role
                      </FormLabel>
                      <div className="relative">
                        <select
                          id="roleId"
                          aria-invalid={!!errors.roleId}
                          className={cn(
                            "block w-full appearance-none rounded-lg px-3 py-2 pr-9 text-sm",
                            "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
                            "border border-[var(--color-border)]",
                            "transition-colors duration-150",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]",
                            errors.roleId
                              ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
                              : ""
                          )}
                          {...field}
                          name="roleId"
                        >
                          <option value="">Select a role</option>
                          {ROLE_CATEGORY_ORDER.filter(
                            (cat) => groupedRoles[cat]?.length > 0
                          ).map((category) => (
                            <optgroup
                              key={category}
                              label={
                                ROLE_CATEGORY_LABELS[category] ?? category
                              }
                            >
                              {(groupedRoles[category] ?? []).map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {errors.roleId && (
                        <FormError>{errors.roleId.message}</FormError>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            {memberType === "alumni" && (
              <div className="mt-4">
                <Input
                  label="Workplace"
                  placeholder="e.g. Google, BUET Faculty (optional)"
                  error={errors.workplace?.message}
                  {...register("workplace")}
                />
              </div>
            )}
          </section>

          {/* ── Password ───────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 pb-1 border-b border-[var(--color-border)]">
              {isEditing ? "Change Password" : "Password"}
            </h3>
            {isEditing && (
              <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
                Leave blank to keep the existing password.
              </p>
            )}
            <PasswordInput
              label={
                isEditing
                  ? "New Password (leave blank to keep existing)"
                  : "Password"
              }
              required={!isEditing}
              placeholder={
                isEditing ? "Leave blank to keep current password" : "Min 8 characters"
              }
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
              Must contain at least one uppercase letter, one number, and one special character.
            </p>
          </section>

          {/* ── Admin Notes ────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 pb-1 border-b border-[var(--color-border)]">
              Admin Notes
            </h3>
            <Textarea
              label="Internal Notes"
              placeholder="Notes visible only to admins (optional)"
              error={errors.adminNotes?.message}
              {...register("adminNotes")}
            />
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
              These notes are never shown to the member.
            </p>
          </section>
        </div>
      </form>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0 bg-[var(--color-bg-surface)] sticky bottom-0 z-10">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-elevated)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="member-form"
          disabled={isSubmitting}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
            "hover:opacity-90 transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting && (
            <Spinner size="sm" label="Saving member…" />
          )}
          {isEditing ? "Save Changes" : "Create Member"}
        </button>
      </div>
    </div>
  );
}