// emails/CertificateEmail.tsx
import {
  Button,
  Text,
  Section,
  Link,
  Hr,
} from "@react-email/components";

import { EmailLayout } from "./Layout";

export interface CertificateIssuedEmailProps {
  memberName: string;
  achievement: string;
  certificateType: string;
  pdfUrl: string;
  verifyUrl: string;
  serial: string;
  clubConfig: {
    clubName: string;
    logoUrl: string;
    primaryColor: string;
  };
}

export function CertificateIssuedEmail({
  memberName,
  achievement,
  certificateType,
  pdfUrl,
  verifyUrl,
  serial,
  clubConfig,
}: CertificateIssuedEmailProps): JSX.Element {
  return (
    <EmailLayout
      previewText={`Your certificate for ${achievement} is ready — ${clubConfig.clubName}`}
      config={clubConfig}
    >
      {/* Greeting */}
      <Text
        style={{
          color: "#18181b",
          fontSize: "22px",
          fontWeight: "700",
          margin: "0 0 8px 0",
          lineHeight: "1.3",
        }}
      >
        Congratulations, {memberName}! 🎉
      </Text>

      <Text
        style={{
          color: "#52525b",
          fontSize: "15px",
          margin: "0 0 24px 0",
          lineHeight: "1.6",
        }}
      >
        You have been awarded a certificate from{" "}
        <strong>{clubConfig.clubName}</strong>. We are proud to recognize your
        achievement and contributions to the club.
      </Text>

      {/* Achievement card */}
      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: "8px",
          padding: "20px 24px",
          marginBottom: "24px",
          borderLeft: `4px solid ${clubConfig.primaryColor}`,
        }}
      >
        <Text
          style={{
            color: "#71717a",
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            margin: "0 0 6px 0",
          }}
        >
          Achievement
        </Text>
        <Text
          style={{
            color: "#18181b",
            fontSize: "17px",
            fontWeight: "700",
            margin: "0 0 12px 0",
            lineHeight: "1.4",
          }}
        >
          {achievement}
        </Text>

        <Text
          style={{
            color: "#71717a",
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            margin: "0 0 6px 0",
          }}
        >
          Certificate Type
        </Text>
        <Text
          style={{
            color: "#3f3f46",
            fontSize: "14px",
            margin: "0 0 12px 0",
          }}
        >
          {certificateType}
        </Text>

        <Text
          style={{
            color: "#71717a",
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            margin: "0 0 6px 0",
          }}
        >
          Certificate Serial
        </Text>
        <Text
          style={{
            color: "#18181b",
            fontSize: "13px",
            margin: "0",
            fontFamily: "monospace, 'Courier New', Courier",
            backgroundColor: "#e4e4e7",
            display: "inline-block" as const,
            padding: "4px 8px",
            borderRadius: "4px",
            letterSpacing: "0.05em",
          }}
        >
          {serial}
        </Text>
      </Section>

      {/* Download CTA */}
      <Section style={{ textAlign: "center" as const, marginBottom: "16px" }}>
        <Button
          href={pdfUrl}
          target="_blank"
          style={{
            backgroundColor: clubConfig.primaryColor,
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "700",
            textDecoration: "none",
            borderRadius: "6px",
            padding: "14px 32px",
            display: "inline-block" as const,
            letterSpacing: "0.02em",
          }}
        >
          Download Certificate (PDF)
        </Button>
      </Section>

      <Hr
        style={{
          borderColor: "#e4e4e7",
          borderTopWidth: "1px",
          margin: "24px 0",
        }}
      />

      {/* Verify section */}
      <Section style={{ marginBottom: "8px" }}>
        <Text
          style={{
            color: "#52525b",
            fontSize: "13px",
            margin: "0 0 8px 0",
            lineHeight: "1.6",
          }}
        >
          Anyone can verify the authenticity of your certificate online. Share
          the verification link below or use your serial number at our
          verification portal:
        </Text>

        <Text
          style={{
            color: "#52525b",
            fontSize: "13px",
            margin: "0 0 4px 0",
          }}
        >
          Verification URL:{" "}
          <Link
            href={verifyUrl}
            style={{
              color: clubConfig.primaryColor,
              textDecoration: "underline",
              wordBreak: "break-all" as const,
            }}
          >
            {verifyUrl}
          </Link>
        </Text>

        <Text
          style={{
            color: "#a1a1aa",
            fontSize: "12px",
            margin: "12px 0 0 0",
            lineHeight: "1.5",
          }}
        >
          Your unique serial number{" "}
          <span
            style={{
              fontFamily: "monospace, 'Courier New', Courier",
              backgroundColor: "#f4f4f5",
              padding: "2px 6px",
              borderRadius: "3px",
              fontSize: "12px",
              color: "#3f3f46",
            }}
          >
            {serial}
          </span>{" "}
          is embedded in the PDF and can also be used for manual verification.
        </Text>
      </Section>

      <Hr
        style={{
          borderColor: "#e4e4e7",
          borderTopWidth: "1px",
          margin: "24px 0 16px 0",
        }}
      />

      <Text
        style={{
          color: "#a1a1aa",
          fontSize: "12px",
          margin: "0",
          lineHeight: "1.6",
        }}
      >
        If you have any questions about your certificate or believe it was
        issued in error, please contact a club administrator. Keep your PDF
        copy in a safe place — it serves as an official record of your
        achievement.
      </Text>
    </EmailLayout>
  );
}