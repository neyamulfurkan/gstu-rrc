// src/lib/certificate.ts

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";

export type CertificateData = {
  memberName: string;
  achievement: string;
  date: string;
  signedByName: string;
  signedByDesignation: string;
  signatureUrl: string;
  serial: string;
  qrCodeDataUrl: string;
  clubName: string;
  logoUrl: string;
};

// Register fonts — falls back gracefully if CDN unreachable
try {
  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/notosans/v28/o-0IIpQlx3QUlC5A4PNr4ARXQ_m8.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/notosans/v28/o-0NIpQlx3QUlC5A4PNjXhFlZQ.ttf",
        fontWeight: 700,
      },
    ],
  });
} catch {
  // Non-fatal
}

const S = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    flexDirection: "column",
  },
  topBand: {
    height: 12,
    backgroundColor: "#0050FF",
  },
  bottomBand: {
    height: 12,
    backgroundColor: "#0050FF",
  },
  outerBorder: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "solid",
  },
  innerBorder: {
    position: "absolute",
    top: 25,
    left: 25,
    right: 25,
    bottom: 25,
    borderWidth: 0.5,
    borderColor: "#00E5FF",
    borderStyle: "dashed",
  },
  body: {
    flex: 1,
    paddingHorizontal: 60,
    paddingVertical: 28,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 10,
  },
  clubName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0050FF",
    letterSpacing: 0.5,
  },
  certOfLabel: {
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 3,
    marginBottom: 4,
    textAlign: "center",
  },
  certTitle: {
    fontSize: 30,
    fontWeight: 700,
    color: "#0F172A",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  accentBar: {
    width: 72,
    height: 3,
    backgroundColor: "#00E5FF",
    marginTop: 10,
    marginBottom: 16,
  },
  presentedToLabel: {
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: "center",
  },
  recipientName: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0050FF",
    textAlign: "center",
    marginBottom: 14,
  },
  forLabel: {
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 2,
    marginBottom: 5,
    textAlign: "center",
  },
  achievement: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 14,
    maxWidth: 420,
  },
  dateText: {
    fontSize: 9,
    color: "#94A3B8",
    marginBottom: 20,
    textAlign: "center",
  },
  dividerLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 16,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
  },
  signatureBlock: {
    alignItems: "center",
    minWidth: 120,
  },
  signatureImage: {
    width: 88,
    height: 32,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    width: 110,
    height: 1,
    backgroundColor: "#0F172A",
    marginBottom: 4,
  },
  signerName: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0F172A",
    textAlign: "center",
  },
  signerDesignation: {
    fontSize: 8,
    color: "#94A3B8",
    textAlign: "center",
  },
  qrBlock: {
    alignItems: "center",
  },
  qrImage: {
    width: 50,
    height: 50,
    marginBottom: 3,
  },
  serialLabel: {
    fontSize: 7,
    color: "#94A3B8",
    letterSpacing: 1,
    textAlign: "center",
  },
  serialValue: {
    fontSize: 8,
    fontWeight: 700,
    color: "#0F172A",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  verifyNote: {
    fontSize: 7,
    color: "#0050FF",
    textAlign: "center",
  },
});

function CertificateDoc({ data }: { data: CertificateData }) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://gstu-rrc.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${data.serial}`;

  return React.createElement(
    Document,
    { title: `Certificate — ${data.memberName}`, author: data.clubName },
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: S.page },

      // Decorative borders (absolute, render first so they sit behind content)
      React.createElement(View, { style: S.outerBorder }),
      React.createElement(View, { style: S.innerBorder }),

      // Top colour band
      React.createElement(View, { style: S.topBand }),

      // ── Main body ──────────────────────────────────────────────────
      React.createElement(
        View,
        { style: S.body },

        // Club header row
        React.createElement(
          View,
          { style: S.headerRow },
          data.logoUrl
            ? React.createElement(Image, { style: S.logo, src: data.logoUrl })
            : null,
          React.createElement(Text, { style: S.clubName }, data.clubName)
        ),

        // Certificate of Achievement title
        React.createElement(Text, { style: S.certOfLabel }, "CERTIFICATE OF"),
        React.createElement(Text, { style: S.certTitle }, "Achievement"),
        React.createElement(View, { style: S.accentBar }),

        // Presented to
        React.createElement(
          Text,
          { style: S.presentedToLabel },
          "PROUDLY PRESENTED TO"
        ),
        React.createElement(
          Text,
          { style: S.recipientName },
          data.memberName
        ),

        // For achievement
        React.createElement(Text, { style: S.forLabel }, "FOR"),
        React.createElement(Text, { style: S.achievement }, data.achievement),

        // Date
        React.createElement(
          Text,
          { style: S.dateText },
          `Issued on ${data.date}`
        ),

        // Divider
        React.createElement(View, { style: S.dividerLine }),

        // Signatures row
        React.createElement(
          View,
          { style: S.signaturesRow },

          // Left — signer
          React.createElement(
            View,
            { style: S.signatureBlock },
            data.signatureUrl
              ? React.createElement(Image, {
                  style: S.signatureImage,
                  src: data.signatureUrl,
                })
              : React.createElement(View, { style: { height: 36 } }),
            React.createElement(View, { style: S.signatureLine }),
            React.createElement(
              Text,
              { style: S.signerName },
              data.signedByName
            ),
            React.createElement(
              Text,
              { style: S.signerDesignation },
              data.signedByDesignation
            )
          ),

          // Right — QR + serial
          React.createElement(
            View,
            { style: S.qrBlock },
            data.qrCodeDataUrl
              ? React.createElement(Image, {
                  style: S.qrImage,
                  src: data.qrCodeDataUrl,
                })
              : null,
            React.createElement(
              Text,
              { style: S.serialLabel },
              "CERTIFICATE NO."
            ),
            React.createElement(
              Text,
              { style: S.serialValue },
              data.serial
            ),
            React.createElement(
              Text,
              { style: S.verifyNote },
              "Scan QR to verify"
            ),
            React.createElement(
              Text,
              { style: { ...S.verifyNote, fontSize: 6 } },
              verifyUrl
            )
          )
        )
      ),

      // Bottom colour band
      React.createElement(View, { style: S.bottomBand })
    )
  );
}

/**
 * Generates a real PDF Buffer using @react-pdf/renderer.
 * Pure Node.js — no Puppeteer, no Chromium, works on Vercel free tier.
 *
 * templateHtml and templateCss are accepted for backward compatibility
 * but are not used; the React PDF layout is the authoritative renderer.
 */
export async function generateCertificatePdf(
  _templateHtml: string,
  _templateCss: string,
  data: CertificateData
): Promise<Buffer> {
  try {
    const docElement = CertificateDoc({ data });
    const uint8 = await renderToBuffer(docElement);
    return Buffer.from(uint8);
  } catch (err) {
    console.error(
      `[certificate.ts] generateCertificatePdf failed for serial "${data.serial}":`,
      err
    );
    throw new Error(
      `PDF generation failed for certificate ${data.serial}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}