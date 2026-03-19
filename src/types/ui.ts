// src/types/ui.ts

import type { ReactNode } from "react";

// ─── Generic Layout Props ─────────────────────────────────────────────────────

export interface WithChildren {
  children: ReactNode;
}

export interface WithClassName {
  className?: string;
}

// ─── Variant String Literals ──────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

export type BadgeVariant = "success" | "warning" | "error" | "primary" | "accent" | "neutral";

export type AnimationStyle = "standard" | "minimal" | "cinematic";

export type TransitionStyle = "fade" | "slide" | "wipe";

// ─── Modal / Overlay ──────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// ─── Admin Section ────────────────────────────────────────────────────────────

export type AdminSection =
  | "dashboard"
  | "members"
  | "applications"
  | "events"
  | "projects"
  | "gallery"
  | "announcements"
  | "feed"
  | "instruments"
  | "committee"
  | "advisors"
  | "certifications"
  | "emails"
  | "custom-cards"
  | "facebook"
  | "ai-config"
  | "roles"
  | "audit-logs"
  | "club-config";

export interface SidebarNavItem {
  label: string;
  section: AdminSection;
  icon: string;
  permission?: string;
}

// ─── Registration Form ────────────────────────────────────────────────────────

export interface RegistrationPersonalInfo {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  address: string;
  departmentId: string;
  session: string;
  avatarUrl: string;
  workplace?: string;
}

export interface RegistrationAccountInfo {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationPaymentInfo {
  paymentMethod: "bkash" | "nagad" | "";
  transactionId: string;
  senderPhone: string;
  screenshotUrl: string;
}

export interface RegistrationFormState {
  step: 1 | 2 | 3 | 4 | 5;
  memberType: "member" | "alumni" | null;
  personalInfo: RegistrationPersonalInfo;
  accountInfo: RegistrationAccountInfo;
  paymentInfo: RegistrationPaymentInfo;
}

// ─── Filter States ────────────────────────────────────────────────────────────

export interface FilterState {
  search: string;
  role?: string;
  department?: string;
  session?: string;
  status?: string;
  memberType?: string;
}

export interface GalleryFilter {
  types: string[];
  categories: string[];
  eventId?: string;
  projectId?: string;
  year?: number;
}

// ─── Feed / Compose ───────────────────────────────────────────────────────────

export interface PostComposeState {
  content: string;
  mediaFiles: File[];
  mediaUrls: string[];
}

// ─── Notification Preferences ─────────────────────────────────────────────────

export interface NotificationPreferences {
  newEvent: boolean;
  applicationStatus: boolean;
  certificateIssued: boolean;
  mentions: boolean;
  eventReminders: boolean;
  announcements: boolean;
}