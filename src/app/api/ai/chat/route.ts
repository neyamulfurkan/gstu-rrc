// src/app/api/ai/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGroq, type GroqMessage } from "@/lib/groq";

// ─── In-memory rate limiter ───────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ─── Context assembler ────────────────────────────────────────────────────────

interface AiContextItems {
  includeEvents?: boolean;
  includeProjects?: boolean;
  includeCommittee?: boolean;
  includeAdvisors?: boolean;
  includeAnnouncements?: boolean;
  includeInstruments?: boolean;
  includeMembership?: boolean;
}

async function assembleContext(aiContextItems: unknown): Promise<{
  events: string;
  projects: string;
  committee: string;
  advisors: string;
  announcements: string;
  instruments: string;
  membership: string;
  members: string;
  achievements: string;
  milestones: string;
  clubInfo: string;
  pastEvents: string;
  allProjects: string;
  exCommittee: string;
  exAdvisors: string;
}> {
  const ctx: AiContextItems =
    aiContextItems && typeof aiContextItems === "object" && !Array.isArray(aiContextItems)
      ? (aiContextItems as AiContextItems)
      : {};

  const now = new Date();

  const [
    upcomingEvents,
    pastEvents,
    recentProjects,
    allProjects,
    committeeMembers,
    exCommitteeMembers,
    currentAdvisors,
    exAdvisors,
    activeAnnouncements,
    availableInstrumentsCount,
    allInstruments,
    membershipInfo,
    memberCount,
    alumniCount,
    achievements,
    milestones,
    clubConfig,
  ] = await Promise.all([
    ctx.includeEvents !== false
      ? prisma.event.findMany({
          where: { isPublished: true, startDate: { gte: now } },
          orderBy: { startDate: "asc" },
          take: 10,
          select: { title: true, startDate: true, endDate: true, venue: true, registrationEnabled: true },
        })
      : Promise.resolve([]),

    prisma.event.findMany({
      where: { isPublished: true, startDate: { lt: now } },
      orderBy: { startDate: "desc" },
      take: 10,
      select: { title: true, startDate: true, venue: true },
    }),

    ctx.includeProjects !== false
      ? prisma.project.findMany({
          where: { isPublished: true },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { title: true, technologies: true, status: true, year: true, githubUrl: true, demoUrl: true },
        })
      : Promise.resolve([]),

    prisma.project.findMany({
      where: { isPublished: true },
      orderBy: { year: "desc" },
      select: { title: true, status: true, year: true, technologies: true },
    }),

    ctx.includeCommittee !== false
      ? prisma.committeeMember.findMany({
          where: { session: null },
          orderBy: { sortOrder: "asc" },
          select: { memberName: true, designation: true, committeeType: true },
        })
      : Promise.resolve([]),

    prisma.committeeMember.findMany({
      where: { session: { not: null } },
      orderBy: { session: "desc" },
      select: { memberName: true, designation: true, session: true },
    }),

    ctx.includeAdvisors !== false
      ? prisma.advisor.findMany({
          where: { isCurrent: true },
          orderBy: { sortOrder: "asc" },
          select: { name: true, designation: true, institution: true, researchInterests: true, email: true },
        })
      : Promise.resolve([]),

    prisma.advisor.findMany({
      where: { isCurrent: false },
      select: { name: true, designation: true, periodStart: true, periodEnd: true },
    }),

    ctx.includeAnnouncements !== false
      ? prisma.announcement.findMany({
          where: {
            isPublished: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { title: true, excerpt: true, createdAt: true },
        })
      : Promise.resolve([]),

    ctx.includeInstruments !== false
      ? prisma.instrument.count({ where: { status: "available" } })
      : Promise.resolve(0),

    prisma.instrument.findMany({
      select: { name: true, status: true, description: true, category: { select: { name: true } } },
    }),

    ctx.includeMembership !== false
      ? prisma.clubConfig.findUnique({
          where: { id: "main" },
          select: { membershipFee: true, regStatus: true, bkashNumber: true, nagadNumber: true },
        })
      : Promise.resolve(null),

    prisma.member.count({ where: { status: "active", memberType: "member" } }),
    prisma.member.count({ where: { status: "active", memberType: "alumni" } }),

    prisma.achievement.findMany({
      orderBy: { sortOrder: "asc" },
      select: { title: true, description: true, year: true },
    }),

    prisma.clubMilestone.findMany({
      orderBy: { sortOrder: "asc" },
      select: { date: true, title: true, description: true },
    }),

    prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        clubMotto: true,
        clubDescription: true,
        universityName: true,
        departmentName: true,
        foundedYear: true,
        address: true,
        email: true,
        phone: true,
        fbUrl: true,
        ytUrl: true,
        igUrl: true,
        ghUrl: true,
      },
    }),
  ]);

  const eventsText =
    upcomingEvents.length > 0
      ? upcomingEvents
          .map(
            (e) =>
              `- ${e.title} on ${new Date(e.startDate).toLocaleDateString("en-BD", { dateStyle: "medium" })} at ${e.venue}`
          )
          .join("\n")
      : "No upcoming events at this time.";

  const projectsText =
    recentProjects.length > 0
      ? recentProjects
          .map(
            (p) =>
              `- ${p.title} (${p.status}) — Technologies: ${Array.isArray(p.technologies) ? p.technologies.join(", ") : "N/A"}`
          )
          .join("\n")
      : "No recent projects available.";

  const committeeText =
    committeeMembers.length > 0
      ? committeeMembers.map((c) => `- ${c.designation}: ${c.memberName}`).join("\n")
      : "Committee information not available.";

  const advisorsText =
    currentAdvisors.length > 0
      ? currentAdvisors.map((a) => `- ${a.name} (${a.designation})`).join("\n")
      : "Advisor information not available.";

  const announcementsText =
    activeAnnouncements.length > 0
      ? activeAnnouncements.map((a) => `- ${a.title}: ${a.excerpt}`).join("\n")
      : "No active announcements.";

  const instrumentsText =
    typeof availableInstrumentsCount === "number"
      ? `${availableInstrumentsCount} instrument(s) currently available for borrowing.`
      : "Instrument availability not available.";

  const membershipText = membershipInfo
    ? `Membership fee: BDT ${membershipInfo.membershipFee}. Registration status: ${membershipInfo.regStatus}.`
    : "Membership information not available.";

  const membersText = `Active members: ${memberCount}, Alumni: ${alumniCount}.`;

  const achievementsText =
    achievements.length > 0
      ? achievements.map((a) => `- ${a.title} (${a.year}): ${a.description}`).join("\n")
      : "No achievements listed.";

  const milestonesText =
    milestones.length > 0
      ? milestones.map((m) => `- ${m.date}: ${m.title} — ${m.description}`).join("\n")
      : "No milestones listed.";

  const clubInfoText = clubConfig
    ? `${clubConfig.clubName} (${clubConfig.clubShortName}) at ${clubConfig.universityName}, ${clubConfig.departmentName}. Founded: ${clubConfig.foundedYear}. Motto: ${clubConfig.clubMotto}. Email: ${clubConfig.email}. Phone: ${clubConfig.phone}.`
    : "Club information not available.";

  const pastEventsText =
    pastEvents.length > 0
      ? pastEvents
          .map(
            (e) =>
              `- ${e.title} on ${new Date(e.startDate).toLocaleDateString("en-BD", { dateStyle: "medium" })} at ${e.venue}`
          )
          .join("\n")
      : "No past events available.";

  const allProjectsText =
    allProjects.length > 0
      ? allProjects
          .map(
            (p) =>
              `- ${p.title} (${p.status}, ${p.year}) — Technologies: ${Array.isArray(p.technologies) ? p.technologies.join(", ") : "N/A"}`
          )
          .join("\n")
      : "No projects available.";

  const exCommitteeText =
    exCommitteeMembers.length > 0
      ? exCommitteeMembers.map((c) => `- ${c.designation}: ${c.memberName} (${c.session})`).join("\n")
      : "No ex-committee data available.";

  const exAdvisorsText =
    exAdvisors.length > 0
      ? exAdvisors
          .map(
            (a) =>
              `- ${a.name} (${a.designation})${a.periodStart ? `, ${a.periodStart}–${a.periodEnd ?? "present"}` : ""}`
          )
          .join("\n")
      : "No ex-advisor data available.";

  return {
    events: eventsText,
    projects: projectsText,
    committee: committeeText,
    advisors: advisorsText,
    announcements: announcementsText,
    instruments: instrumentsText,
    membership: membershipText,
    members: membersText,
    achievements: achievementsText,
    milestones: milestonesText,
    clubInfo: clubInfoText,
    pastEvents: pastEventsText,
    allProjects: allProjectsText,
    exCommittee: exCommitteeText,
    exAdvisors: exAdvisorsText,
  };
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  let body: { messages?: unknown; conversationHistory?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? (body.messages as GroqMessage[]) : [];

  // Fetch AI config
  let config: {
    aiEnabled: boolean;
    aiSystemPrompt: string | null;
    groqModel: string | null;
    groqTemperature: number | null;
    aiContextItems: unknown;
  } | null = null;

  try {
    config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        aiEnabled: true,
        aiSystemPrompt: true,
        groqModel: true,
        groqTemperature: true,
        aiContextItems: true,
      },
    });
  } catch (error) {
    console.error("[/api/ai/chat] Failed to fetch ClubConfig:", error);
    return NextResponse.json(
      { error: "Internal server error. Unable to load AI configuration." },
      { status: 500 }
    );
  }

  // If config not found or DB unavailable, still try with env-based key
  const aiEnabled = config ? config.aiEnabled : (!!process.env.GROQ_API_KEY);

  if (!aiEnabled) {
    return NextResponse.json(
      {
        type: "text",
        content:
          "The AI assistant is currently disabled. Please check back later or contact the club administrators.",
      },
      { status: 503 }
    );
  }

  // Assemble context
  let context: Awaited<ReturnType<typeof assembleContext>>;
  try {
    context = await assembleContext(config?.aiContextItems ?? null);
  } catch (error) {
    console.error("[/api/ai/chat] Failed to assemble context:", error);
    context = {
      events: "Unable to load event data.",
      projects: "Unable to load project data.",
      committee: "Unable to load committee data.",
      advisors: "Unable to load advisor data.",
      announcements: "Unable to load announcements.",
      instruments: "Unable to load instrument data.",
      membership: "Unable to load membership data.",
      members: "Unable to load member data.",
      achievements: "Unable to load achievements.",
      milestones: "Unable to load milestones.",
      clubInfo: "Unable to load club info.",
      pastEvents: "Unable to load past events.",
      allProjects: "Unable to load all projects.",
      exCommittee: "Unable to load ex-committee data.",
      exAdvisors: "Unable to load ex-advisor data.",
    };
  }

  // Build system prompt
  const basePrompt =
    config?.aiSystemPrompt ??
    `You are the official AI assistant for the {{clubName}} at {{universityName}}. You have comprehensive knowledge about every aspect of the club. Always answer confidently and accurately using the context provided below. Never say you do not have information if it is present here.

=== CLUB INFORMATION ===
{{CLUB_INFO}}

=== MEMBERSHIP STATISTICS ===
{{MEMBERS}}

=== MEMBERSHIP & REGISTRATION ===
{{MEMBERSHIP}}

=== UPCOMING EVENTS ===
{{EVENTS}}

=== PAST EVENTS ===
{{PAST_EVENTS}}

=== ACTIVE ANNOUNCEMENTS ===
{{ANNOUNCEMENTS}}

=== RECENT PROJECTS ===
{{PROJECTS}}

=== ALL PROJECTS ===
{{ALL_PROJECTS}}

=== CURRENT EXECUTIVE COMMITTEE ===
{{COMMITTEE}}

=== CURRENT ADVISORS ===
{{ADVISORS}}

=== INSTRUMENTS & EQUIPMENT ===
{{INSTRUMENTS}}

=== ACHIEVEMENTS ===
{{ACHIEVEMENTS}}

=== CLUB MILESTONES ===
{{MILESTONES}}

Instructions:
- Answer all questions about the club using the context above
- Be friendly, concise, and accurate
- If asked about member count, events, projects, fees, committee, advisors, instruments, or any club detail, use the data above
- When listing events or projects, format them clearly
- If you have structured data for events or projects queries, you may respond with a JSON object starting with "{"
- Otherwise respond with plain helpful text`;

  // Fetch club name and university name for placeholder replacement
  let clubName = "GSTU Robotics & Research Club";
  let universityName = "Gopalganj Science and Technology University";
  try {
    const clubInfo = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: { clubName: true, universityName: true },
    });
    if (clubInfo) {
      clubName = clubInfo.clubName || clubName;
      universityName = clubInfo.universityName || universityName;
    }
  } catch {
    // use defaults
  }

  const systemPrompt = basePrompt
    .replace(/\{\{clubName\}\}/g, clubName)
    .replace(/\{\{universityName\}\}/g, universityName)
    .replace("{{CLUB_INFO}}", context.clubInfo)
    .replace("{{MEMBERS}}", context.members)
    .replace("{{EVENTS}}", context.events)
    .replace("{{PAST_EVENTS}}", context.pastEvents)
    .replace("{{PROJECTS}}", context.projects)
    .replace("{{ALL_PROJECTS}}", context.allProjects)
    .replace("{{COMMITTEE}}", context.committee)
    .replace("{{ADVISORS}}", context.advisors)
    .replace("{{ANNOUNCEMENTS}}", context.announcements)
    .replace("{{INSTRUMENTS}}", context.instruments)
    .replace("{{MEMBERSHIP}}", context.membership)
    .replace("{{ACHIEVEMENTS}}", context.achievements)
    .replace("{{MILESTONES}}", context.milestones);

  // Call Groq
  let aiResponse: string;
  try {
    aiResponse = await callGroq(messages, systemPrompt);
  } catch (error) {
    console.error("[/api/ai/chat] callGroq threw unexpectedly:", error);
    return NextResponse.json(
      {
        type: "text",
        content:
          "I'm sorry, I couldn't process your request right now. Please try again later.",
      },
      { status: 200 }
    );
  }

  // Detect structured JSON response
  const trimmed = aiResponse.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return NextResponse.json({ type: "structured", data: parsed }, { status: 200 });
    } catch {
      // Not valid JSON — fall through to text response
    }
  }

  return NextResponse.json({ type: "text", content: aiResponse }, { status: 200 });
}