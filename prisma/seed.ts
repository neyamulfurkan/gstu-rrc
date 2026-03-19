// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_COLORS } from "../src/lib/colorSystem";

// Use plain PrismaClient for seed script (no Neon adapter needed for local execution)
const prisma = new PrismaClient();

const PERMISSION_LIST = [
  "manage_members",
  "approve_applications",
  "manage_events",
  "manage_projects",
  "manage_gallery",
  "manage_announcements",
  "manage_feed",
  "manage_instruments",
  "manage_certificates",
  "manage_club_config",
  "manage_admins",
  "view_audit_logs",
  "send_emails",
  "manage_facebook",
  "manage_ai_config",
  "manage_committee",
  "manage_custom_cards",
  "super_admin",
];

async function main(): Promise<void> {
  console.log("🌱 Starting database seed...");

  // ─── 1. Default Department ────────────────────────────────────────────────
  const cseDept = await prisma.department.upsert({
    where: { name: "Computer Science & Engineering" },
    create: { name: "Computer Science & Engineering" },
    update: {},
  });
  console.log(`✅ Department: ${cseDept.name}`);

  // ─── 2. Default Roles ─────────────────────────────────────────────────────
  const president = await prisma.role.upsert({
    where: { name: "President" },
    create: { name: "President", color: "#00E5FF", category: "executive", sortOrder: 1 },
    update: {},
  });

  const vicePresident = await prisma.role.upsert({
    where: { name: "Vice President" },
    create: { name: "Vice President", color: "#00E5FF", category: "executive", sortOrder: 2 },
    update: {},
  });

  await prisma.role.upsert({
    where: { name: "General Secretary" },
    create: { name: "General Secretary", color: "#00E5FF", category: "executive", sortOrder: 3 },
    update: {},
  });

  const generalMember = await prisma.role.upsert({
    where: { name: "General Member" },
    create: { name: "General Member", color: "#7B8DB0", category: "general", sortOrder: 10 },
    update: {},
  });

  await prisma.role.upsert({
    where: { name: "Alumni" },
    create: { name: "Alumni", color: "#FFB800", category: "alumni", sortOrder: 20 },
    update: {},
  });

  console.log("✅ Roles seeded");

  // ─── 3. Default AdminRole ─────────────────────────────────────────────────
  const superAdminPermissions = Object.fromEntries(
    PERMISSION_LIST.map((p) => [p, true])
  );

  const superAdminRole = await prisma.adminRole.upsert({
    where: { name: "Super Admin" },
    create: {
      name: "Super Admin",
      color: "#FF6B2B",
      permissions: superAdminPermissions,
    },
    update: {},
  });
  console.log(`✅ AdminRole: ${superAdminRole.name}`);

  // ─── 4. Default EventCategories ───────────────────────────────────────────
  const eventCategories = [
    { name: "Workshop", color: "#0050FF" },
    { name: "Seminar", color: "#7C3AED" },
    { name: "Competition", color: "#FF3B5C" },
    { name: "Field Trip", color: "#00C896" },
    { name: "Social", color: "#FF6B2B" },
  ];

  for (const cat of eventCategories) {
    await prisma.eventCategory.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    });
  }
  console.log("✅ Event categories seeded");

  // ─── 5. Default ProjectCategories ─────────────────────────────────────────
  const projectCategories = [
    { name: "Robotics", color: "#0050FF" },
    { name: "IoT", color: "#00C896" },
    { name: "AI/ML", color: "#7C3AED" },
    { name: "Web Development", color: "#FF6B2B" },
    { name: "Research", color: "#FFB800" },
  ];

  for (const cat of projectCategories) {
    await prisma.projectCategory.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    });
  }
  console.log("✅ Project categories seeded");

  // ─── 6. Default GalleryCategories ─────────────────────────────────────────
  const galleryCategories = [
    { name: "Events" },
    { name: "Projects" },
    { name: "Team" },
    { name: "Workshops" },
    { name: "Campus" },
  ];

  for (const cat of galleryCategories) {
    await prisma.galleryCategory.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    });
  }
  console.log("✅ Gallery categories seeded");

  // ─── 7. Default InstrumentCategories ──────────────────────────────────────
  const instrumentCategories = [
    { name: "Sensors" },
    { name: "Microcontrollers" },
    { name: "Tools" },
    { name: "Displays" },
  ];

  for (const cat of instrumentCategories) {
    await prisma.instrumentCategory.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    });
  }
  console.log("✅ Instrument categories seeded");

  // ─── 8. Default AnnouncementCategories ────────────────────────────────────
  const announcementCategories = [
    { name: "General", color: "#7B8DB0" },
    { name: "Academic", color: "#0050FF" },
    { name: "Event", color: "#00E5FF" },
    { name: "Urgent", color: "#FF3B5C" },
  ];

  for (const cat of announcementCategories) {
    await prisma.announcementCategory.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    });
  }
  console.log("✅ Announcement categories seeded");

  // ─── 9. ClubConfig Singleton ──────────────────────────────────────────────
  const clubConfig = await prisma.clubConfig.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      clubName: "GSTU Robotics & Research Club",
      clubShortName: "GSTU RRC",
      clubMotto: "Innovate. Build. Inspire.",
      clubDescription:
        "We are a student-led robotics and research club at Gopalganj Science and Technology University, dedicated to fostering innovation, technical excellence, and collaborative problem-solving among students passionate about robotics, embedded systems, AI, and emerging technologies.",
      universityName: "Gopalganj Science and Technology University",
      departmentName: "Computer Science & Engineering",
      foundedYear: 2019,
      address: "Gopalganj Science and Technology University, Gopalganj-8100, Bangladesh",
      email: "robotics@gstu.edu.bd",
      phone: "+8801700000000",
      logoUrl: "",
      faviconUrl: "",
      fbUrl: "https://facebook.com/gstu.robotics",
      ytUrl: "",
      igUrl: "",
      liUrl: "",
      ghUrl: "https://github.com/gstu-robotics",
      twitterUrl: "",
      extraSocialLinks: [],
      metaDescription:
        "GSTU Robotics & Research Club — A student-led robotics club at Gopalganj Science and Technology University fostering innovation and technical excellence.",
      seoKeywords:
        "GSTU, robotics, research club, Gopalganj, university, IoT, AI, embedded systems, Bangladesh",
      gscVerifyTag: "",
      ogImageUrl: "",
      regStatus: "open",
      membershipFee: 200,
      bkashNumber: "01700000000",
      bkashName: "GSTU Robotics Club",
      nagadNumber: "01700000000",
      nagadName: "GSTU Robotics Club",
      requireScreenshot: true,
      autoApprove: false,
      maxUploadMb: 10,
      welcomeEmailSubject: "Welcome to GSTU Robotics & Research Club!",
      welcomeEmailBody:
        "Dear {{memberName}},\n\nWelcome to the GSTU Robotics & Research Club! We are thrilled to have you as a member. Your application has been approved and your account is now active.\n\nYou can now log in at {{loginUrl}} using your registered email and password.\n\nBest regards,\nGSTU Robotics & Research Club",
      heroType: "particles",
      heroVideoUrl: "",
      heroFallbackImg: "",
      heroImages: [],
      heroCtaLabel1: "Become a Member",
      heroCtaUrl1: "/membership",
      heroCtaLabel2: "Explore Projects",
      heroCtaUrl2: "/projects",
      overlayOpacity: 60,
      colorConfig: DEFAULT_COLORS,
      displayFont: "Orbitron",
      bodyFont: "DM Sans",
      monoFont: "JetBrains Mono",
      headingFont: "Syne",
      animationStyle: "standard",
      transitionStyle: "fade",
      particleEnabled: true,
      particleCount: 80,
      particleSpeed: 0.5,
      particleColor: "accent",
      announcementTickerSpeed: 40,
      privacyPolicy:
        "# Privacy Policy\n\nThis privacy policy outlines how GSTU Robotics & Research Club collects, uses, and protects your personal information when you use our platform.\n\n## Information We Collect\n\nWe collect information you provide during registration including your name, email, student ID, and contact details.\n\n## How We Use Your Information\n\nYour information is used to manage your club membership, communicate important updates, and issue certificates.\n\n## Data Security\n\nWe implement appropriate security measures to protect your personal information.\n\n## Contact\n\nFor privacy concerns, contact us at robotics@gstu.edu.bd",
      termsOfUse:
        "# Terms of Use\n\nBy using the GSTU Robotics & Research Club platform, you agree to these terms.\n\n## Membership\n\nMembership is open to all students and alumni of Gopalganj Science and Technology University.\n\n## Conduct\n\nMembers are expected to maintain respectful and professional conduct on all club platforms.\n\n## Content\n\nMembers are responsible for the content they post and must not share inappropriate or harmful material.\n\n## Changes\n\nThese terms may be updated at any time. Continued use of the platform constitutes acceptance of updated terms.",
      footerCopyright: "© {year} GSTU Robotics & Research Club. All rights reserved.",
      constitutionUrl: "",
      groqApiKey: process.env.GROQ_API_KEY ?? "",
      groqModel: "llama3-70b-8192",
      groqTemperature: 0.7,
      aiSystemPrompt:
        "You are the official AI assistant for {{clubName}} at {{universityName}}. You help students, members, and visitors learn about the club, its activities, membership process, and events.\n\nClub Information:\n- Name: {{clubName}}\n- University: {{universityName}}\n- Founded: {{foundedYear}}\n- Motto: {{clubMotto}}\n\nUpcoming Events:\n{{upcomingEvents}}\n\nRecent Projects:\n{{recentProjects}}\n\nCurrent Committee:\n{{committeeMembers}}\n\nMembership:\n- Fee: BDT {{membershipFee}}\n- Status: {{regStatus}}\n\nBe helpful, concise, and friendly. Answer questions about the club accurately. If you don't know something specific, direct users to contact the club via email or social media.",
      aiEnabled: true,
      aiContextItems: {
        events: true,
        projects: true,
        committee: true,
        advisors: true,
        announcements: true,
        instruments: true,
        membership: true,
      },
      aiChatHistory: "session",
      fbPageId: "",
      fbPageToken: "",
      fbWebhookToken: "gstu_robotics_webhook_token",
      fbAutoPost: {
        events: false,
        projects: false,
        announcements: false,
        gallery: false,
      },
      fbAutoPostTemplates: {
        events:
          "🎉 New Event: {{title}}\n📅 {{date}}\n📍 {{venue}}\n\nLearn more and register on our website!",
        projects:
          "🚀 New Project: {{title}}\n🏷️ {{category}}\n\nCheck out this amazing project by our team!",
        announcements: "📢 {{title}}\n\n{{excerpt}}\n\nRead more on our website!",
        gallery: "📸 New photos from {{title}} are now available in our gallery!",
      },
      fbAutoReplyComments: false,
      fbCommentSystemPrompt:
        "You are responding to a Facebook comment on behalf of {{clubName}}. Be friendly, helpful, and professional. Keep responses concise and relevant to the club's activities.",
      fbCommentReplyDelay: 0,
      fbAutoReplyMessages: false,
      fbMessageSystemPrompt:
        "You are the Messenger assistant for {{clubName}}. Help visitors learn about the club, membership process, and upcoming events. Be warm, informative, and concise.",
      fbGreetingMessage:
        "Hello! 👋 Welcome to the GSTU Robotics & Research Club. How can I help you today?",
      fbFallbackMessage:
        "Thank you for your message! A club member will get back to you soon. You can also visit our website for more information.",
      resendApiKey: process.env.RESEND_API_KEY ?? "",
      resendFromEmail: "noreply@gstu-robotics.vercel.app",
      resendFromName: "GSTU Robotics & Research Club",
    },
    update: {},
  });
  console.log(`✅ ClubConfig: ${clubConfig.clubName}`);

  // ─── 10. Super Admin Member ───────────────────────────────────────────────
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL;
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedAdminEmail || !seedAdminPassword) {
    console.warn(
      "⚠️  SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set. Skipping admin member creation."
    );
  } else {
    const passwordHash = await bcrypt.hash(seedAdminPassword, 12);

    const adminMember = await prisma.member.upsert({
      where: { email: seedAdminEmail },
      create: {
        username: "admin",
        email: seedAdminEmail,
        passwordHash,
        fullName: "System Administrator",
        studentId: "ADMIN001",
        phone: "01700000000",
        gender: null,
        dob: null,
        address: "Gopalganj Science and Technology University",
        avatarUrl: "",
        coverUrl: "",
        bio: "System administrator account for GSTU Robotics & Research Club.",
        interests: "Robotics, Technology, Administration",
        skills: ["Administration", "System Management"],
        socialLinks: {},
        departmentId: cseDept.id,
        session: "2019-20",
        roleId: president.id,
        memberType: "member",
        status: "active",
        isAdmin: true,
        adminRoleId: superAdminRole.id,
      },
      update: {},
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
      },
    });
    console.log(`✅ Super Admin Member: ${adminMember.username} (${adminMember.email})`);
  }

  // ─── 11. Sample WhyJoinCard ───────────────────────────────────────────────
  const existingWhyJoinCount = await prisma.whyJoinCard.count();
  if (existingWhyJoinCount === 0) {
    await prisma.whyJoinCard.createMany({
      data: [
        {
          icon: "Zap",
          heading: "Hands-On Learning",
          description:
            "Get practical experience building real robots, IoT devices, and AI systems. Our workshops and project sessions give you skills that go beyond the classroom.",
          learnMoreUrl: "/projects",
          sortOrder: 1,
        },
        {
          icon: "Users",
          heading: "Collaborative Community",
          description:
            "Join a vibrant community of like-minded students who share your passion for technology. Collaborate, learn, and grow together.",
          learnMoreUrl: "/members",
          sortOrder: 2,
        },
        {
          icon: "Trophy",
          heading: "Competitions & Recognition",
          description:
            "Represent GSTU in national and international robotics competitions. Win prizes, earn certificates, and build your professional portfolio.",
          learnMoreUrl: "/events",
          sortOrder: 3,
        },
        {
          icon: "BookOpen",
          heading: "Research Opportunities",
          description:
            "Work alongside faculty advisors on cutting-edge research projects. Publish papers and contribute to the advancement of technology.",
          learnMoreUrl: "/projects",
          sortOrder: 4,
        },
        {
          icon: "Network",
          heading: "Industry Network",
          description:
            "Connect with alumni working at top tech companies and research institutions. Build relationships that will benefit your career.",
          learnMoreUrl: "/alumni",
          sortOrder: 5,
        },
        {
          icon: "Award",
          heading: "Certified Skills",
          description:
            "Earn official certificates for participating in workshops, completing projects, and contributing to the club. Showcase your achievements.",
          learnMoreUrl: "/certificates",
          sortOrder: 6,
        },
      ],
    });
    console.log("✅ Sample WhyJoinCards seeded");
  } else {
    console.log("⏭️  WhyJoinCards already exist, skipping");
  }

  // ─── 12. Sample ClubMilestone ─────────────────────────────────────────────
  const existingMilestoneCount = await prisma.clubMilestone.count();
  if (existingMilestoneCount === 0) {
    await prisma.clubMilestone.createMany({
      data: [
        {
          date: "March 2019",
          sortOrder: 1,
          title: "Club Founded",
          description:
            "GSTU Robotics & Research Club was officially established by a group of passionate CSE students with the vision of creating a hub for innovation and technical excellence at Gopalganj Science and Technology University.",
          imageUrl: null,
        },
        {
          date: "June 2019",
          sortOrder: 2,
          title: "First Workshop",
          description:
            "Organized our inaugural Arduino robotics workshop with over 50 participants. This marked the beginning of our hands-on learning culture.",
          imageUrl: null,
        },
        {
          date: "December 2019",
          sortOrder: 3,
          title: "First Competition",
          description:
            "Participated in the National Robotics Championship, gaining valuable experience and recognition for our university.",
          imageUrl: null,
        },
        {
          date: "2020",
          sortOrder: 4,
          title: "100 Members Milestone",
          description:
            "Reached our first 100 registered members, demonstrating the growing interest in robotics and technology among GSTU students.",
          imageUrl: null,
        },
        {
          date: "2022",
          sortOrder: 5,
          title: "Research Lab Established",
          description:
            "Secured a dedicated research lab space within the university for hands-on project development and experimentation.",
          imageUrl: null,
        },
      ],
    });
    console.log("✅ Sample ClubMilestones seeded");
  } else {
    console.log("⏭️  ClubMilestones already exist, skipping");
  }

  // ─── 13. Sample Achievement ───────────────────────────────────────────────
  const existingAchievementCount = await prisma.achievement.count();
  if (existingAchievementCount === 0) {
    await prisma.achievement.createMany({
      data: [
        {
          icon: "Trophy",
          title: "National Robotics Championship",
          description: "Secured 2nd place in the National Robotics Championship hosted by BUET.",
          year: 2022,
          link: null,
          sortOrder: 1,
        },
        {
          icon: "Star",
          title: "Best University Club Award",
          description:
            "Recognized as the Best Technical Club at the GSTU Annual Awards Ceremony.",
          year: 2023,
          link: null,
          sortOrder: 2,
        },
        {
          icon: "Lightbulb",
          title: "Innovation Grant",
          description:
            "Received a research innovation grant from the ICT Division of Bangladesh for our smart agriculture IoT project.",
          year: 2023,
          link: null,
          sortOrder: 3,
        },
      ],
    });
    console.log("✅ Sample Achievements seeded");
  } else {
    console.log("⏭️  Achievements already exist, skipping");
  }

  // ─── 14. Seed a default General Member role for non-executive use ─────────
  // Already created above as generalMember — ensure it exists
  console.log(`✅ General Member role ready: ${generalMember.name}`);
  console.log(`✅ Vice President role ready: ${vicePresident.name}`);

  console.log("\n🎉 Database seed completed successfully!");
  console.log("\n📋 Summary:");
  console.log("  • 1 Department");
  console.log("  • 5 Member Roles (President, Vice President, General Secretary, General Member, Alumni)");
  console.log("  • 1 Admin Role (Super Admin with all permissions)");
  console.log("  • 5 Event Categories");
  console.log("  • 5 Project Categories");
  console.log("  • 5 Gallery Categories");
  console.log("  • 4 Instrument Categories");
  console.log("  • 4 Announcement Categories");
  console.log("  • 1 ClubConfig (singleton)");
  console.log("  • 1 Super Admin Member (if env vars set)");
  console.log("  • 6 WhyJoinCards");
  console.log("  • 5 ClubMilestones");
  console.log("  • 3 Achievements");

  if (process.env.SEED_ADMIN_EMAIL) {
    console.log(`\n🔑 Admin Login:`);
    console.log(`   Email: ${process.env.SEED_ADMIN_EMAIL}`);
    console.log(`   Username: admin`);
    console.log(`   ⚠️  Change your password immediately after first login!`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });