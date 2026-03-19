// emails/ApplicationEmails.tsx
import {
  Button,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components";

import { EmailLayout } from "./Layout";

interface ClubEmailConfig {
  clubName: string;
  logoUrl: string;
  primaryColor: string;
}

interface ApplicationReceivedEmailProps {
  applicantName: string;
  clubConfig: ClubEmailConfig;
}

interface ApplicationApprovedEmailProps {
  applicantName: string;
  loginUrl: string;
  email: string;
  clubConfig: ClubEmailConfig;
}

interface ApplicationRejectedEmailProps {
  applicantName: string;
  reason?: string;
  clubConfig: ClubEmailConfig;
}

const stepNumberStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  display: "inline-block",
  textAlign: "center" as const,
  lineHeight: "32px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#ffffff",
  marginRight: "12px",
  flexShrink: 0,
};

const stepTextStyle = {
  color: "#374151",
  fontSize: "14px",
  margin: "0",
  lineHeight: "1.6",
};

const stepContainerStyle = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "16px",
};

const headingStyle = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 8px 0",
  lineHeight: "1.3",
};

const subheadingStyle = {
  color: "#6b7280",
  fontSize: "15px",
  margin: "0 0 24px 0",
  lineHeight: "1.5",
};

const bodyTextStyle = {
  color: "#374151",
  fontSize: "15px",
  margin: "0 0 16px 0",
  lineHeight: "1.6",
};

const noteBoxStyle = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
};

const successBoxStyle = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
};

const warningBoxStyle = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
};

const dividerStyle = {
  borderColor: "#e5e7eb",
  borderTopWidth: "1px",
  margin: "24px 0",
};

const labelStyle = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px 0",
};

const valueStyle = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0",
};

export function ApplicationReceivedEmail({
  applicantName,
  clubConfig,
}: ApplicationReceivedEmailProps): JSX.Element {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://gstu-robotics.vercel.app";
  const statusCheckUrl = `${baseUrl}/membership/status`;

  const steps = [
    {
      number: "1",
      title: "Admin reviews your application",
      description:
        "Our club administrators will review your submitted information and verify your student details.",
    },
    {
      number: "2",
      title: "Payment is verified",
      description:
        "Your bKash or Nagad transaction will be confirmed against the provided transaction ID and screenshot.",
    },
    {
      number: "3",
      title: "Account created and email sent",
      description:
        "Once approved, your member account will be activated and login credentials will be sent to this email address.",
    },
  ];

  return (
    <EmailLayout
      previewText={`Application received — ${clubConfig.clubName}`}
      config={clubConfig}
    >
      {/* Greeting */}
      <Text style={headingStyle}>Application Received!</Text>
      <Text style={subheadingStyle}>
        Hi {applicantName}, thank you for applying to join {clubConfig.clubName}
        .
      </Text>

      <Text style={bodyTextStyle}>
        We have successfully received your membership application. Our team will
        review it shortly and get back to you within <strong>24–48 hours</strong>.
      </Text>

      <Hr style={dividerStyle} />

      {/* What happens next */}
      <Text
        style={{
          color: "#111827",
          fontSize: "16px",
          fontWeight: "700",
          margin: "0 0 16px 0",
        }}
      >
        What happens next?
      </Text>

      {steps.map((step) => (
        <div key={step.number} style={stepContainerStyle}>
          <span
            style={{
              ...stepNumberStyle,
              backgroundColor: clubConfig.primaryColor,
            }}
          >
            {step.number}
          </span>
          <div style={{ flex: 1 }}>
            <Text
              style={{
                ...stepTextStyle,
                fontWeight: "600",
                margin: "0 0 2px 0",
              }}
            >
              {step.title}
            </Text>
            <Text style={{ ...stepTextStyle, color: "#6b7280" }}>
              {step.description}
            </Text>
          </div>
        </div>
      ))}

      <Hr style={dividerStyle} />

      {/* Status check */}
      <div style={noteBoxStyle}>
        <Text
          style={{
            ...bodyTextStyle,
            margin: "0 0 12px 0",
            fontWeight: "600",
          }}
        >
          Want to check your application status?
        </Text>
        <Text style={{ ...bodyTextStyle, margin: "0 0 16px 0" }}>
          You can track the status of your application at any time by visiting
          the link below and entering the email address you used to apply.
        </Text>
        <Button
          href={statusCheckUrl}
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Check Application Status
        </Button>
      </div>

      <Text
        style={{
          ...bodyTextStyle,
          color: "#6b7280",
          fontSize: "13px",
          margin: "0",
        }}
      >
        If you have any questions, please reach out to your club administrators.
        We look forward to welcoming you to {clubConfig.clubName}!
      </Text>
    </EmailLayout>
  );
}

export function ApplicationApprovedEmail({
  applicantName,
  loginUrl,
  email,
  clubConfig,
}: ApplicationApprovedEmailProps): JSX.Element {
  return (
    <EmailLayout
      previewText={`Congratulations! Your application to ${clubConfig.clubName} has been approved`}
      config={clubConfig}
    >
      {/* Congratulations header */}
      <Text style={headingStyle}>🎉 Congratulations, {applicantName}!</Text>
      <Text style={subheadingStyle}>
        Your membership application has been approved. Welcome to{" "}
        {clubConfig.clubName}!
      </Text>

      <Text style={bodyTextStyle}>
        We are thrilled to have you as part of our community. Your account is
        now active and you can log in using the credentials you set during the
        application process.
      </Text>

      {/* Credentials box */}
      <div style={successBoxStyle}>
        <Text
          style={{
            color: "#15803d",
            fontSize: "14px",
            fontWeight: "700",
            margin: "0 0 12px 0",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          ✓ Your Login Details
        </Text>
        <Row style={{ marginBottom: "8px" }}>
          <Column>
            <Text style={labelStyle}>Email Address</Text>
            <Text style={valueStyle}>{email}</Text>
          </Column>
        </Row>
        <Hr style={{ ...dividerStyle, margin: "12px 0" }} />
        <Text
          style={{
            color: "#374151",
            fontSize: "13px",
            margin: "0",
            lineHeight: "1.5",
          }}
        >
          Use the password you set during your application. If you have
          forgotten it, you can reset it from the login page.
        </Text>
      </div>

      {/* Login button */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={loginUrl}
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: "6px",
            fontSize: "15px",
            fontWeight: "700",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Log In to Your Account
        </Button>
      </Section>

      <Hr style={dividerStyle} />

      {/* What you can do */}
      <Text
        style={{
          color: "#111827",
          fontSize: "16px",
          fontWeight: "700",
          margin: "0 0 12px 0",
        }}
      >
        As a member, you can now:
      </Text>

      {[
        "Post updates and interact with other members on the club feed",
        "Browse and request to borrow lab instruments and equipment",
        "View and download your certificates and achievements",
        "Participate in events and contribute to projects",
        "Upload photos and videos to the club gallery",
      ].map((item, index) => (
        <Text
          key={index}
          style={{
            ...bodyTextStyle,
            paddingLeft: "16px",
            borderLeft: `3px solid ${clubConfig.primaryColor}`,
            margin: "0 0 10px 0",
          }}
        >
          {item}
        </Text>
      ))}

      <Hr style={dividerStyle} />

      <Text
        style={{
          ...bodyTextStyle,
          color: "#6b7280",
          fontSize: "13px",
          margin: "0",
        }}
      >
        We look forward to your contributions and participation. If you
        experience any issues logging in, please contact a club administrator.
        Welcome aboard!
      </Text>
    </EmailLayout>
  );
}

export function ApplicationRejectedEmail({
  applicantName,
  reason,
  clubConfig,
}: ApplicationRejectedEmailProps): JSX.Element {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://gstu-robotics.vercel.app";
  const membershipUrl = `${baseUrl}/membership`;

  return (
    <EmailLayout
      previewText={`Update on your application to ${clubConfig.clubName}`}
      config={clubConfig}
    >
      {/* Heading */}
      <Text style={headingStyle}>Application Update</Text>
      <Text style={subheadingStyle}>
        Hi {applicantName}, we have an update regarding your membership
        application to {clubConfig.clubName}.
      </Text>

      <Text style={bodyTextStyle}>
        After careful review, we regret to inform you that we are unable to
        approve your application at this time. We appreciate the time and effort
        you put into applying and hope this does not discourage you from being
        part of our community in the future.
      </Text>

      {/* Reason box — only shown if reason is provided */}
      {reason ? (
        <div style={warningBoxStyle}>
          <Text
            style={{
              color: "#92400e",
              fontSize: "13px",
              fontWeight: "700",
              margin: "0 0 8px 0",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Reason for Rejection
          </Text>
          <Text
            style={{
              color: "#374151",
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.6",
            }}
          >
            {reason}
          </Text>
        </div>
      ) : (
        <div style={noteBoxStyle}>
          <Text
            style={{
              color: "#374151",
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.6",
            }}
          >
            Unfortunately, a specific reason was not provided with this
            decision. Please contact a club administrator for more information.
          </Text>
        </div>
      )}

      <Hr style={dividerStyle} />

      {/* Encouragement to reapply */}
      <Text
        style={{
          color: "#111827",
          fontSize: "16px",
          fontWeight: "700",
          margin: "0 0 12px 0",
        }}
      >
        What can you do next?
      </Text>

      <Text style={bodyTextStyle}>
        If the reason for rejection is something that can be corrected — such as
        an incorrect transaction ID, a missing payment screenshot, or incomplete
        personal information — you are welcome to submit a new application after
        addressing the issue.
      </Text>

      <Text style={bodyTextStyle}>
        Please review the membership requirements carefully before reapplying to
        ensure all information is accurate and complete.
      </Text>

      {/* Reapply button */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button
          href={membershipUrl}
          style={{
            backgroundColor: "#374151",
            color: "#ffffff",
            padding: "12px 28px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          View Membership Requirements
        </Button>
      </Section>

      <Hr style={dividerStyle} />

      <Text
        style={{
          ...bodyTextStyle,
          color: "#6b7280",
          fontSize: "13px",
          margin: "0",
        }}
      >
        We genuinely appreciate your interest in {clubConfig.clubName} and
        encourage you to reach out to a club administrator if you have any
        questions about this decision. We hope to see you again in the future.
      </Text>
    </EmailLayout>
  );
}