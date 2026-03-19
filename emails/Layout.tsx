// emails/Layout.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Img,
  Text,
  Hr,
} from "@react-email/components";

export interface EmailLayoutProps {
  children: React.ReactNode;
  previewText: string;
  config: {
    clubName: string;
    logoUrl: string;
    primaryColor: string;
  };
}

export function EmailLayout({
  children,
  previewText,
  config,
}: EmailLayoutProps): JSX.Element {
  return (
    <Html lang="en">
      <Head>
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{previewText}</title>
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: "#f4f4f5",
          fontFamily:
            "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: "0",
          padding: "0",
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "0",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: "#0a0f1e",
              padding: "24px 32px",
              textAlign: "center" as const,
              borderBottom: `3px solid ${config.primaryColor}`,
            }}
          >
            {config.logoUrl ? (
              <Img
                src={config.logoUrl}
                alt={`${config.clubName} Logo`}
                width="64"
                height="64"
                style={{
                  display: "block",
                  margin: "0 auto 12px auto",
                  borderRadius: "8px",
                }}
              />
            ) : null}
            <Text
              style={{
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: "700",
                margin: "0",
                letterSpacing: "0.05em",
                textTransform: "uppercase" as const,
              }}
            >
              {config.clubName}
            </Text>
          </Section>

          {/* Content */}
          <Section
            style={{
              backgroundColor: "#ffffff",
              padding: "32px 32px 24px 32px",
            }}
          >
            {children}
          </Section>

          {/* Divider */}
          <Hr
            style={{
              borderColor: "#e4e4e7",
              borderTopWidth: "1px",
              margin: "0 32px",
            }}
          />

          {/* Footer */}
          <Section
            style={{
              backgroundColor: "#fafafa",
              padding: "24px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                color: "#71717a",
                fontSize: "13px",
                fontWeight: "600",
                margin: "0 0 4px 0",
              }}
            >
              {config.clubName}
            </Text>
            <Text
              style={{
                color: "#a1a1aa",
                fontSize: "12px",
                margin: "0 0 4px 0",
                lineHeight: "1.5",
              }}
            >
              Gopalganj Science and Technology University, Gopalganj, Bangladesh
            </Text>
            <Text
              style={{
                color: "#a1a1aa",
                fontSize: "12px",
                margin: "0 0 16px 0",
              }}
            >
              This is an automated email from {config.clubName}. Please do not
              reply directly to this email.
            </Text>
            <Text
              style={{
                color: "#d4d4d8",
                fontSize: "11px",
                margin: "0",
                lineHeight: "1.4",
              }}
            >
              You are receiving this email because you are a member or applicant
              of {config.clubName}.
              <br />
              If you believe this was sent in error, please contact your club
              administrator.
            </Text>
            <Hr
              style={{
                borderColor: "#e4e4e7",
                borderTopWidth: "1px",
                margin: "16px 0 12px 0",
              }}
            />
            <Text
              style={{
                color: "#d4d4d8",
                fontSize: "11px",
                margin: "0",
              }}
            >
              &copy; {new Date().getFullYear()} {config.clubName}. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}