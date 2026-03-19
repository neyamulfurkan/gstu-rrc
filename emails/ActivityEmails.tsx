// emails/ActivityEmails.tsx
import {
  Button,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components";
import { EmailLayout } from "./Layout";

interface ClubConfig {
  clubName: string;
  logoUrl: string;
  primaryColor: string;
}

export function EventReminderEmail({
  memberName,
  eventTitle,
  eventDate,
  venue,
  eventUrl,
  clubConfig,
}: {
  memberName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  eventUrl: string;
  clubConfig: ClubConfig;
}): JSX.Element {
  return (
    <EmailLayout
      previewText={`Reminder: ${eventTitle} is coming up!`}
      config={clubConfig}
    >
      <Text
        style={{
          color: "#18181b",
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 8px 0",
          lineHeight: "1.3",
        }}
      >
        Event Reminder
      </Text>
      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
        }}
      >
        Hi {memberName}, don&apos;t forget about the upcoming event!
      </Text>

      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px",
          borderLeft: `4px solid ${clubConfig.primaryColor}`,
        }}
      >
        <Text
          style={{
            color: "#18181b",
            fontSize: "20px",
            fontWeight: "700",
            margin: "0 0 16px 0",
            lineHeight: "1.3",
          }}
        >
          {eventTitle}
        </Text>
        <Row style={{ marginBottom: "8px" }}>
          <Column style={{ width: "24px", verticalAlign: "top" }}>
            <Text
              style={{
                color: clubConfig.primaryColor,
                fontSize: "14px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              📅
            </Text>
          </Column>
          <Column>
            <Text
              style={{
                color: "#3f3f46",
                fontSize: "14px",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              <span style={{ fontWeight: "600", color: "#18181b" }}>Date & Time: </span>
              {eventDate}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column style={{ width: "24px", verticalAlign: "top" }}>
            <Text
              style={{
                color: clubConfig.primaryColor,
                fontSize: "14px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              📍
            </Text>
          </Column>
          <Column>
            <Text
              style={{
                color: "#3f3f46",
                fontSize: "14px",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              <span style={{ fontWeight: "600", color: "#18181b" }}>Venue: </span>
              {venue}
            </Text>
          </Column>
        </Row>
      </Section>

      <Section style={{ textAlign: "center" as const, marginBottom: "24px" }}>
        <Button
          href={eventUrl}
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "600",
            textDecoration: "none",
            padding: "12px 28px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          View Event Details
        </Button>
      </Section>

      <Text
        style={{
          color: "#71717a",
          fontSize: "13px",
          margin: "0",
          lineHeight: "1.5",
          textAlign: "center" as const,
        }}
      >
        We look forward to seeing you there. If you have any questions, feel
        free to reach out to the organizing team.
      </Text>
    </EmailLayout>
  );
}

export function NewAnnouncementEmail({
  title,
  excerpt,
  announcementUrl,
  clubConfig,
}: {
  title: string;
  excerpt: string;
  announcementUrl: string;
  clubConfig: ClubConfig;
}): JSX.Element {
  return (
    <EmailLayout
      previewText={`New Announcement: ${title}`}
      config={clubConfig}
    >
      <Section
        style={{
          backgroundColor: clubConfig.primaryColor,
          borderRadius: "6px",
          padding: "6px 12px",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "700",
            margin: "0",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          New Announcement
        </Text>
      </Section>

      <Text
        style={{
          color: "#18181b",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 16px 0",
          lineHeight: "1.3",
        }}
      >
        {title}
      </Text>

      <Hr
        style={{
          borderColor: "#e4e4e7",
          borderTopWidth: "1px",
          margin: "0 0 16px 0",
        }}
      />

      <Text
        style={{
          color: "#3f3f46",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.7",
        }}
      >
        {excerpt}
      </Text>

      <Section style={{ textAlign: "center" as const, marginBottom: "24px" }}>
        <Button
          href={announcementUrl}
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "600",
            textDecoration: "none",
            padding: "12px 28px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          Read Full Announcement
        </Button>
      </Section>

      <Text
        style={{
          color: "#71717a",
          fontSize: "13px",
          margin: "0",
          lineHeight: "1.5",
          textAlign: "center" as const,
        }}
      >
        Stay updated with the latest news from {clubConfig.clubName}.
      </Text>
    </EmailLayout>
  );
}

export function InstrumentApprovedEmail({
  memberName,
  instrumentName,
  borrowDate,
  returnDate,
  adminNote,
  clubConfig,
}: {
  memberName: string;
  instrumentName: string;
  borrowDate: string;
  returnDate: string;
  adminNote?: string;
  clubConfig: ClubConfig;
}): JSX.Element {
  return (
    <EmailLayout
      previewText={`Your borrow request for ${instrumentName} has been approved`}
      config={clubConfig}
    >
      <Section
        style={{
          textAlign: "center" as const,
          marginBottom: "24px",
        }}
      >
        <Text
          style={{
            fontSize: "48px",
            margin: "0 0 8px 0",
            lineHeight: "1",
          }}
        >
          ✅
        </Text>
        <Text
          style={{
            color: "#16a34a",
            fontSize: "13px",
            fontWeight: "700",
            margin: "0",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          Request Approved
        </Text>
      </Section>

      <Text
        style={{
          color: "#18181b",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 8px 0",
          lineHeight: "1.3",
          textAlign: "center" as const,
        }}
      >
        Great news, {memberName}!
      </Text>

      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
          textAlign: "center" as const,
        }}
      >
        Your request to borrow <strong>{instrumentName}</strong> has been
        approved.
      </Text>

      <Section
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}
      >
        <Text
          style={{
            color: "#15803d",
            fontSize: "13px",
            fontWeight: "700",
            margin: "0 0 12px 0",
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
          }}
        >
          Borrow Details
        </Text>
        <Row style={{ marginBottom: "8px" }}>
          <Column style={{ width: "50%" }}>
            <Text
              style={{
                color: "#3f3f46",
                fontSize: "13px",
                fontWeight: "600",
                margin: "0 0 2px 0",
              }}
            >
              Instrument
            </Text>
            <Text
              style={{
                color: "#18181b",
                fontSize: "15px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              {instrumentName}
            </Text>
          </Column>
          <Column style={{ width: "50%" }}>
            <Text
              style={{
                color: "#3f3f46",
                fontSize: "13px",
                fontWeight: "600",
                margin: "0 0 2px 0",
              }}
            >
              Borrow Date
            </Text>
            <Text
              style={{
                color: "#18181b",
                fontSize: "15px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              {borrowDate}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column style={{ width: "50%" }}>
            <Text
              style={{
                color: "#3f3f46",
                fontSize: "13px",
                fontWeight: "600",
                margin: "0 0 2px 0",
              }}
            >
              Return By
            </Text>
            <Text
              style={{
                color: "#18181b",
                fontSize: "15px",
                fontWeight: "700",
                margin: "0",
              }}
            >
              {returnDate}
            </Text>
          </Column>
        </Row>
      </Section>

      {adminNote ? (
        <Section
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "24px",
          }}
        >
          <Text
            style={{
              color: "#92400e",
              fontSize: "13px",
              fontWeight: "700",
              margin: "0 0 6px 0",
            }}
          >
            Note from Admin
          </Text>
          <Text
            style={{
              color: "#78350f",
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.6",
            }}
          >
            {adminNote}
          </Text>
        </Section>
      ) : null}

      <Text
        style={{
          color: "#71717a",
          fontSize: "13px",
          margin: "0",
          lineHeight: "1.6",
          textAlign: "center" as const,
        }}
      >
        Please ensure the instrument is returned in good condition by the
        return date. Contact the club administration if you need to adjust
        your borrow period.
      </Text>
    </EmailLayout>
  );
}

export function InstrumentRejectedEmail({
  memberName,
  instrumentName,
  adminNote,
  clubConfig,
}: {
  memberName: string;
  instrumentName: string;
  adminNote?: string;
  clubConfig: ClubConfig;
}): JSX.Element {
  return (
    <EmailLayout
      previewText={`Your borrow request for ${instrumentName} could not be approved`}
      config={clubConfig}
    >
      <Section
        style={{
          textAlign: "center" as const,
          marginBottom: "24px",
        }}
      >
        <Text
          style={{
            fontSize: "48px",
            margin: "0 0 8px 0",
            lineHeight: "1",
          }}
        >
          ℹ️
        </Text>
        <Text
          style={{
            color: "#dc2626",
            fontSize: "13px",
            fontWeight: "700",
            margin: "0",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          Request Not Approved
        </Text>
      </Section>

      <Text
        style={{
          color: "#18181b",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 8px 0",
          lineHeight: "1.3",
          textAlign: "center" as const,
        }}
      >
        Hi {memberName},
      </Text>

      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
          textAlign: "center" as const,
        }}
      >
        Unfortunately, your request to borrow{" "}
        <strong>{instrumentName}</strong> has not been approved at this time.
      </Text>

      {adminNote ? (
        <Section
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "24px",
          }}
        >
          <Text
            style={{
              color: "#991b1b",
              fontSize: "13px",
              fontWeight: "700",
              margin: "0 0 6px 0",
            }}
          >
            Reason
          </Text>
          <Text
            style={{
              color: "#7f1d1d",
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.6",
            }}
          >
            {adminNote}
          </Text>
        </Section>
      ) : (
        <Section
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "24px",
          }}
        >
          <Text
            style={{
              color: "#7f1d1d",
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.6",
            }}
          >
            The instrument may currently be unavailable or your request did not
            meet the borrowing criteria. Please contact the club administration
            for further details.
          </Text>
        </Section>
      )}

      <Hr
        style={{
          borderColor: "#e4e4e7",
          borderTopWidth: "1px",
          margin: "0 0 20px 0",
        }}
      />

      <Text
        style={{
          color: "#52525b",
          fontSize: "14px",
          margin: "0 0 8px 0",
          lineHeight: "1.6",
          textAlign: "center" as const,
        }}
      >
        You are welcome to check instrument availability again in the future
        or contact the club administration if you believe this was an error.
      </Text>

      <Text
        style={{
          color: "#71717a",
          fontSize: "13px",
          margin: "0",
          lineHeight: "1.5",
          textAlign: "center" as const,
        }}
      >
        Thank you for your understanding, {memberName}.
      </Text>
    </EmailLayout>
  );
}