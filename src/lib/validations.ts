import { z } from "zod";

export const memberSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  studentId: z.string().min(5, "Student ID must be at least 5 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Please enter a valid Bangladesh mobile number"),
  departmentId: z.string().cuid("Please select a valid department"),
  session: z.string().min(4, "Session must be at least 4 characters"),
  gender: z.string().optional(),
  dob: z.coerce.date().optional(),
  address: z.string().optional(),
  workplace: z.string().optional(),
});

export const accountSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
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
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const paymentSchema = z.object({
  paymentMethod: z.enum(["bkash", "nagad"], {
    errorMap: () => ({ message: "Please select a payment method" }),
  }),
  transactionId: z
    .string()
    .min(5, "Transaction ID must be at least 5 characters"),
  senderPhone: z.string().min(1, "Sender phone number is required"),
  screenshotUrl: z.string().optional().default(""),
});

export const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().optional(),
  categoryId: z.string().cuid("Please select a valid category"),
  startDate: z.coerce.date({ errorMap: () => ({ message: "Please enter a valid start date" }) }),
  endDate: z.coerce.date().optional(),
  allDay: z.boolean().default(false),
  venue: z.string().min(2, "Venue must be at least 2 characters"),
  mapLink: z.string().url("Please enter a valid map URL").optional().or(z.literal("")),
  organizerName: z.string().optional(),
  organizerId: z.string().cuid().optional(),
  description: z.any(),
  registrationEnabled: z.boolean().default(false),
  registrationDeadline: z.coerce.date().optional(),
  metaDescription: z.string().optional(),
  isPublished: z.boolean().default(false),
});

export const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().optional(),
  categoryId: z.string().cuid("Please select a valid category"),
  status: z.enum(["ongoing", "completed"], {
    errorMap: () => ({ message: "Please select a valid status" }),
  }),
  year: z
    .number()
    .int("Year must be an integer")
    .min(2000, "Year must be 2000 or later")
    .max(2100, "Year must be 2100 or earlier"),
  coverUrl: z.string().url().optional().or(z.literal("")),
  technologies: z.array(z.string()).default([]),
  teamMemberIds: z.array(z.string().cuid()).optional(),
  description: z.any(),
  githubUrl: z.string().url("Please enter a valid GitHub URL").optional().or(z.literal("")),
  demoUrl: z.string().url("Please enter a valid demo URL").optional().or(z.literal("")),
  reportUrl: z.string().url("Please enter a valid report URL").optional().or(z.literal("")),
  youtubeUrl: z.string().url("Please enter a valid YouTube URL").optional().or(z.literal("")),
  milestones: z
    .array(
      z.object({
        date: z.string(),
        title: z.string(),
        description: z.string(),
      })
    )
    .optional()
    .default([]),
  isPublished: z.boolean().default(false),
});

export const borrowRequestSchema = z
  .object({
    instrumentId: z.string().cuid("Please select a valid instrument"),
    purpose: z
      .string()
      .min(10, "Purpose must be at least 10 characters"),
    borrowDate: z.coerce.date({
      errorMap: () => ({ message: "Please enter a valid borrow date" }),
    }),
    returnDate: z.coerce.date({
      errorMap: () => ({ message: "Please enter a valid return date" }),
    }),
    notes: z.string().optional(),
  })
  .refine((data) => data.returnDate > data.borrowDate, {
    message: "Return date must be after borrow date",
    path: ["returnDate"],
  });

export const postSchema = z.object({
  content: z
    .string()
    .min(1, "Post content cannot be empty")
    .max(5000, "Post content cannot exceed 5000 characters"),
  mediaUrls: z
    .array(z.string().url())
    .max(5, "You can attach at most 5 media files")
    .optional()
    .default([]),
  mediaType: z.enum(["image", "video"]).optional(),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters"),
  postId: z.string().cuid("Invalid post ID"),
  parentId: z.string().cuid("Invalid parent comment ID").optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or username"),
  password: z.string().min(1, "Please enter your password"),
});

export const applicationStatusSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  take: z
    .number()
    .int()
    .min(1, "Take must be at least 1")
    .max(100, "Take cannot exceed 100")
    .default(20),
});

export const galleryItemSchema = z.object({
  url: z.string().url("Please provide a valid image URL"),
  type: z.enum(["image", "video"]),
  title: z.string().optional(),
  description: z.string().optional(),
  altText: z.string().min(1, "Alt text is required for accessibility"),
  categoryId: z.string().cuid("Please select a valid category"),
  tags: z.array(z.string()).default([]),
  eventId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  year: z.number().int().min(2000).max(2100),
  downloadEnabled: z.boolean().default(false),
});

export const certificateTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters"),
  type: z.enum(["participation", "achievement", "completion", "custom"]),
  htmlContent: z.string().min(1, "HTML content is required"),
  cssContent: z.string().default(""),
});

export const issueCertificateSchema = z.object({
  templateId: z.string().cuid("Please select a valid template"),
  recipientIds: z
    .array(z.string().cuid())
    .min(1, "Please select at least one recipient"),
  achievement: z.string().min(2, "Achievement description is required"),
  issuedAt: z.coerce.date().default(() => new Date()),
  signedByName: z.string().min(2, "Signatory name is required"),
  signedByDesignation: z.string().min(2, "Signatory designation is required"),
  signatureUrl: z.string().url("Please upload a valid signature image"),
});

export const announcementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.any(),
  excerpt: z.string().max(500, "Excerpt cannot exceed 500 characters").optional(),
  categoryId: z.string().cuid("Please select a valid category"),
  expiresAt: z.coerce.date().optional(),
  isPublished: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
});

export const instrumentSchema = z.object({
  name: z.string().min(2, "Instrument name must be at least 2 characters"),
  categoryId: z.string().cuid("Please select a valid category"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().url("Please upload a valid image"),
  status: z
    .enum(["available", "on_loan", "maintenance", "unavailable"])
    .default("available"),
});

export const clubConfigSchema = z.object({
  clubName: z.string().min(2),
  clubShortName: z.string().min(2),
  clubMotto: z.string().optional(),
  clubDescription: z.string().optional(),
  universityName: z.string().min(2),
  departmentName: z.string().optional(),
  foundedYear: z.number().int().min(1900).max(2100),
  address: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),
  fbUrl: z.string().url().optional().or(z.literal("")),
  ytUrl: z.string().url().optional().or(z.literal("")),
  igUrl: z.string().url().optional().or(z.literal("")),
  liUrl: z.string().url().optional().or(z.literal("")),
  ghUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
});

export const colorConfigSchema = z.object({
  colorConfig: z.record(z.string(), z.string()),
  displayFont: z.string().optional(),
  bodyFont: z.string().optional(),
  monoFont: z.string().optional(),
  headingFont: z.string().optional(),
});

export const membershipSettingsSchema = z.object({
  regStatus: z.enum(["open", "closed"]),
  membershipFee: z.number().int().min(0),
  bkashNumber: z.string().optional(),
  bkashName: z.string().optional(),
  nagadNumber: z.string().optional(),
  nagadName: z.string().optional(),
  requireScreenshot: z.boolean(),
  autoApprove: z.boolean(),
});

export const heroConfigSchema = z.object({
  heroType: z.enum(["slideshow", "video", "particles"]),
  heroVideoUrl: z.string().url().optional().or(z.literal("")),
  heroFallbackImg: z.string().url().optional().or(z.literal("")),
  heroImages: z.array(z.object({ url: z.string().url(), order: z.number().int() })).optional(),
  heroCtaLabel1: z.string().optional(),
  heroCtaUrl1: z.string().optional(),
  heroCtaLabel2: z.string().optional(),
  heroCtaUrl2: z.string().optional(),
  overlayOpacity: z.number().int().min(0).max(100),
});

export const passwordResetSchema = z
  .object({
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
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type MemberSchemaInput = z.infer<typeof memberSchema>;
export type AccountSchemaInput = z.infer<typeof accountSchema>;
export type PaymentSchemaInput = z.infer<typeof paymentSchema>;
export type EventSchemaInput = z.infer<typeof eventSchema>;
export type ProjectSchemaInput = z.infer<typeof projectSchema>;
export type BorrowRequestSchemaInput = z.infer<typeof borrowRequestSchema>;
export type PostSchemaInput = z.infer<typeof postSchema>;
export type CommentSchemaInput = z.infer<typeof commentSchema>;
export type LoginSchemaInput = z.infer<typeof loginSchema>;
export type ApplicationStatusSchemaInput = z.infer<typeof applicationStatusSchema>;
export type PaginationSchemaInput = z.infer<typeof paginationSchema>;
export type GalleryItemSchemaInput = z.infer<typeof galleryItemSchema>;
export type CertificateTemplateSchemaInput = z.infer<typeof certificateTemplateSchema>;
export type IssueCertificateSchemaInput = z.infer<typeof issueCertificateSchema>;
export type AnnouncementSchemaInput = z.infer<typeof announcementSchema>;
export type InstrumentSchemaInput = z.infer<typeof instrumentSchema>;
export type PasswordResetSchemaInput = z.infer<typeof passwordResetSchema>;

export const profileEditSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^01[3-9]\d{8}$/).optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  interests: z.string().optional(),
  skills: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  workplace: z.string().optional(),
  gender: z.string().optional(),
  dob: z.coerce.date().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().optional(),
});

export const adminMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  interests: z.string().optional(),
  skills: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  workplace: z.string().optional(),
  gender: z.string().optional(),
  dob: z.coerce.date().optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().optional(),
  roleId: z.string().cuid().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  adminNotes: z.string().optional(),
  studentId: z.string().min(5).optional(),
  session: z.string().min(4).optional(),
  departmentId: z.string().cuid().optional(),
  memberType: z.enum(["member", "alumni"]).optional(),
  password: z.string().min(8).optional(),
});

export type ProfileEditSchemaInput = z.infer<typeof profileEditSchema>;
export type AdminMemberSchemaInput = z.infer<typeof adminMemberSchema>;