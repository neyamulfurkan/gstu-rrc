// emails/MemberEmails.tsx
import {
  Button,
  Section,
  Text,
  Hr,
} from "@react-email/components";

import { EmailLayout } from "./Layout";

interface ClubEmailConfig {
  clubName: string;
  logoUrl: string;
  primaryColor: string;
}

export function PasswordResetEmail({
  resetLink,
  clubConfig,
}: {
  resetLink: string;
  clubConfig: ClubEmailConfig;
}): JSX.Element {
  return (
    <EmailLayout
      previewText={`Reset your ${clubConfig.clubName} password`}
      config={clubConfig}
    >
      <Text
        style={{
          color: "#18181b",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 8px 0",
          lineHeight: "1.3",
        }}
      >
        Reset Your Password
      </Text>

      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
        }}
      >
        We received a request to reset the password for your{" "}
        {clubConfig.clubName} account. Click the button below to choose a new
        password.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "0 0 24px 0" }}>
        <Button
          href={resetLink}
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "700",
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: "8px",
            display: "inline-block",
            letterSpacing: "0.02em",
          }}
        >
          Reset Password
        </Button>
      </Section>

      <Text
        style={{
          color: "#71717a",
          fontSize: "13px",
          margin: "0 0 8px 0",
          lineHeight: "1.6",
          textAlign: "center" as const,
        }}
      >
        This link will expire in <strong>1 hour</strong>.
      </Text>

      <Hr
        style={{
          borderColor: "#e4e4e7",
          borderTopWidth: "1px",
          margin: "20px 0",
        }}
      />

      <Text
        style={{
          color: "#a1a1aa",
          fontSize: "13px",
          margin: "0 0 8px 0",
          lineHeight: "1.6",
        }}
      >
        If you did not request a password reset, please ignore this email. Your
        account remains secure and no changes have been made.
      </Text>

      <Text
        style={{
          color: "#a1a1aa",
          fontSize: "13px",
          margin: "0",
          lineHeight: "1.6",
        }}
      >
        If you are unable to click the button, copy and paste the following URL
        into your browser:
      </Text>

      <Text
        style={{
          color: clubConfig.primaryColor,
          fontSize: "12px",
          margin: "8px 0 0 0",
          wordBreak: "break-all" as const,
          lineHeight: "1.5",
        }}
      >
        {resetLink}
      </Text>
    </EmailLayout>
  );
}

export function AdminRoleAssignedEmail({
  memberName,
  roleName,
  clubConfig,
}: {
  memberName: string;
  roleName: string;
  clubConfig: ClubEmailConfig;
}): JSX.Element {
  const adminPanelUrl =
    (process.env.NEXT_PUBLIC_BASE_URL ?? "") + "/admin/dashboard";

  return (
    <EmailLayout
      previewText={`You've been assigned the ${roleName} role at ${clubConfig.clubName}`}
      config={clubConfig}
    >
      <Text
        style={{
          color: "#18181b",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 8px 0",
          lineHeight: "1.3",
        }}
      >
        Admin Role Assigned 🎉
      </Text>

      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 16px 0",
          lineHeight: "1.6",
        }}
      >
        Hello <strong>{memberName}</strong>,
      </Text>

      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
        }}
      >
        You have been granted the{" "}
        <strong
          style={{
            color: clubConfig.primaryColor,
          }}
        >
          {roleName}
        </strong>{" "}
        administrative role at <strong>{clubConfig.clubName}</strong>. You now
        have access to the admin panel where you can manage club content and
        operations based on your assigned permissions.
      </Text>

      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: "8px",
          padding: "16px 20px",
          margin: "0 0 24px 0",
          borderLeft: `4px solid ${clubConfig.primaryColor}`,
        }}
      >
        <Text
          style={{
            color: "#3f3f46",
            fontSize: "14px",
            fontWeight: "600",
            margin: "0 0 4px 0",
          }}
        >
          Your Role
        </Text>
        <Text
          style={{
            color: "#18181b",
            fontSize: "16px",
            fontWeight: "700",
            margin: "0",
          }}
        >
          {roleName}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, margin: "0 0 24px 0" }}>
        <Button
          href={adminPanelUrl}
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "700",
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: "8px",
            display: "inline-block",
            letterSpacing: "0.02em",
          }}
        >
          Go to Admin Panel
        </Button>
      </Section>

      <Hr
        style={{
          borderColor: "#e4e4e7",
          borderTopWidth: "1px",
          margin: "20px 0",
        }}
      />

      <Text
        style={{
          color: "#a1a1aa",
          fontSize: "13px",
          margin: "0",
          lineHeight: "1.6",
        }}
      >
        With great power comes great responsibility. Please use your admin
        access responsibly and in accordance with the club's policies. If you
        have any questions about your role or permissions, please contact your
        club's Super Admin.
      </Text>
    </EmailLayout>
  );
}