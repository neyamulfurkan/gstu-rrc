// src/types/index.ts

// ─── Primitive / Shared ───────────────────────────────────────────────────────

export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface MilestonePrimitive {
  date: string;
  title: string;
  description: string;
}

// ─── Member ───────────────────────────────────────────────────────────────────

export interface MemberPublic {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  coverUrl: string;
  department: { name: string };
  role: { name: string; color: string; category: string };
  session: string;
  memberType: string;
  skills: string[];
  socialLinks: Record<string, string>;
  bio: string | null;
  interests: string | null;
  createdAt: Date | string;
  workplace?: string | null;
}

export interface MemberPrivate extends MemberPublic {
  email: string;
  phone: string;
  gender?: string | null;
  dob?: Date | string | null;
  address?: string | null;
  studentId: string;
  adminNotes?: string | null;
  lastLogin?: Date | string | null;
  status?: string;
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface GalleryItemCard {
  id: string;
  url: string;
  type: string;
  title?: string | null;
  altText: string;
  category: { name: string };
  uploaderId?: string | null;
  uploader?: { username: string; fullName: string; avatarUrl: string } | null;
  eventId?: string | null;
  projectId?: string | null;
  downloadEnabled: boolean;
  year: number;
  createdAt: Date | string;
}

// ─── Event ────────────────────────────────────────────────────────────────────

export interface EventCard {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  category: { name: string; color: string };
  startDate: Date | string;
  endDate?: Date | string | null;
  allDay: boolean;
  venue: string;
  description: string;
  isPublished: boolean;
  registrationEnabled: boolean;
}

export interface EventDetail extends Omit<EventCard, "description"> {
  description: Json;
  organizerName: string;
  mapLink?: string | null;
  metaDescription?: string | null;
  galleryItems: GalleryItemCard[];
  attendees: MemberPublic[];
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectCard {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  category: { name: string; color: string };
  status: string;
  year: number;
  technologies: string[];
  teamMembers: MemberPublic[];
  description?: Json;
}

// Re-export TimelineItem from DataDisplay for use in project detail components
export type { TimelineItem } from "@/components/ui/DataDisplay";

export interface ProjectDetail extends ProjectCard {
  description: Json;
  githubUrl?: string | null;
  demoUrl?: string | null;
  reportUrl?: string | null;
  youtubeUrl?: string | null;
  milestones: MilestonePrimitive[];
  galleryItems: GalleryItemCard[];
  isPublished?: boolean;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export interface AnnouncementCard {
  id: string;
  title: string;
  excerpt: string;
  category: { name: string; color: string };
  expiresAt?: Date | string | null;
  createdAt: Date | string;
}

export interface AnnouncementDetail extends AnnouncementCard {
  content: Json;
}

// ─── Instrument ───────────────────────────────────────────────────────────────

export interface InstrumentCard {
  id: string;
  name: string;
  category: { name: string };
  description: string;
  imageUrl: string;
  status: string;
  borrower?: { username: string; fullName: string; avatarUrl: string } | null;
  borrowDate?: Date | string | null;
  returnDate?: Date | string | null;
}

// ─── Certificate ──────────────────────────────────────────────────────────────

export interface CertificateCard {
  id: string;
  serial: string;
  achievement: string;
  issuedAt: Date | string;
  isRevoked: boolean;
  pdfUrl: string;
  template: { name: string; type: string };
}

export interface CertificateCardWithRecipient extends CertificateCard {
  recipient: { fullName: string; username: string; avatarUrl: string };
  signedByName: string;
  signedByDesignation: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface PostCard {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaType?: string | null;
  isPinned: boolean;
  author: MemberPublic;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  createdAt: Date | string;
}

export interface CommentItem {
  id: string;
  content: string;
  author: MemberPublic;
  parentId?: string | null;
  likesCount: number;
  isLikedByMe: boolean;
  replies?: CommentItem[];
  createdAt: Date | string;
}

// ─── Borrow Request ───────────────────────────────────────────────────────────

export interface BorrowRequestCard {
  id: string;
  instrument: { name: string; imageUrl: string };
  purpose: string;
  borrowDate: Date | string;
  returnDate: Date | string;
  status: string;
  adminNote?: string | null;
  createdAt: Date | string;
}

// ─── Application ──────────────────────────────────────────────────────────────

export interface ApplicationItem {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  avatarUrl: string;
  departmentId: string;
  session: string;
  memberType: string;
  paymentMethod: string;
  transactionId: string;
  senderPhone: string;
  screenshotUrl: string;
  status: string;
  adminNote?: string | null;
  createdAt: Date | string;
  reviewedAt?: Date | string | null;
}

// ─── Club Config ──────────────────────────────────────────────────────────────

export interface ClubConfigPublic {
  clubName: string;
  clubShortName: string;
  clubMotto: string;
  clubDescription: string;
  universityName: string;
  universityLogoUrl: string;
  universityWebUrl: string;
  departmentName: string;
  foundedYear: number;
  address: string;
  email: string;
  phone: string;
  logoUrl: string;
  faviconUrl: string;
  fbUrl: string;
  ytUrl: string;
  igUrl: string;
  liUrl: string;
  ghUrl: string;
  twitterUrl: string;
  extraSocialLinks: Array<{ label: string; url: string }>;
  metaDescription: string;
  seoKeywords: string;
  gscVerifyTag: string;
  ogImageUrl: string;
  regStatus: string;
  membershipFee: number;
  bkashNumber: string;
  nagadNumber: string;
  heroType: string;
  heroVideoUrl: string;
  heroFallbackImg: string;
  heroImages: Array<{ url: string; order: number }>;
  heroCtaLabel1: string;
  heroCtaUrl1: string;
  heroCtaLabel2: string;
  heroCtaUrl2: string;
  overlayOpacity: number;
  colorConfig: Record<string, string>;
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  headingFont: string;
  animationStyle: string;
  transitionStyle: string;
  particleEnabled: boolean;
  particleCount: number;
  particleSpeed: number;
  particleColor: string;
  announcementTickerSpeed: number;
  privacyPolicy: string;
  termsOfUse: string;
  footerCopyright: string;
  aiEnabled: boolean;
  aiChatHistory: string;
  constitutionUrl: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiListResponse<T> {
  data: T[];
  nextCursor?: string;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ─── Committee & Advisors ─────────────────────────────────────────────────────

export interface CommitteeMemberEntry {
  id: string;
  memberId?: string | null;
  memberName: string;
  designation: string;
  committeeType: string;
  session?: string | null;
  sortOrder: number;
  member?: { username: string; avatarUrl: string; fullName: string } | null;
}

export interface AdvisorEntry {
  id: string;
  name: string;
  designation: string;
  institution: string;
  photoUrl: string;
  bio: string;
  researchInterests: string[];
  email?: string | null;
  socialLinks: Record<string, string>;
  isCurrent: boolean;
  periodStart?: number | null;
  periodEnd?: number | null;
  memberId?: string | null;
  member?: { id: string; username: string; fullName: string; avatarUrl: string; isAdmin: boolean; adminRole?: { id: string; name: string } | null } | null;
  isAdminGranted?: boolean;
  adminRoleId?: string | null;
}

// ─── Alumni Spotlight ─────────────────────────────────────────────────────────

export interface AlumniSpotlightEntry {
  id: string;
  name: string;
  position: string;
  company: string;
  quote: string;
  photoUrl: string;
  session: string;
  memberId?: string | null;
  sortOrder: number;
}

// ─── Why Join / Achievement / Milestone ───────────────────────────────────────

export interface WhyJoinCard {
  id: string;
  icon: string;
  heading: string;
  description: string;
  learnMoreUrl?: string | null;
  sortOrder: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  year: number;
  link?: string | null;
  sortOrder: number;
}

export interface ClubMilestone {
  id: string;
  date: string;
  sortOrder: number;
  title: string;
  description: string;
  imageUrl?: string | null;
}

// ─── Custom Cards ─────────────────────────────────────────────────────────────

export interface CustomCardEntry {
  id: string;
  heading: string;
  description: Json;
  imageUrl?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  buttonStyle?: string | null;
  sortOrder: number;
}

export interface CustomCardSection {
  id: string;
  targetPage: string;
  heading?: string | null;
  subtitle?: string | null;
  position: string;
  isPublished: boolean;
  sortOrder: number;
  cards: CustomCardEntry[];
}