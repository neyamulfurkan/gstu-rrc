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
  signedByName2: string;
  signedByDesignation2: string;
  signatureUrl2: string;
  signedByName3?: string;
  signedByDesignation3?: string;
  signatureUrl3?: string;
  serial: string;
  qrCodeDataUrl: string;
  clubName: string;
  logoUrl: string;
};

try {
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: "https://fonts.gstatic.com/s/notosans/v28/o-0IIpQlx3QUlC5A4PNr4ARXQ_m8.ttf", fontWeight: 400 },
      { src: "https://fonts.gstatic.com/s/notosans/v28/o-0NIpQlx3QUlC5A4PNjXhFlZQ.ttf", fontWeight: 700 },
    ],
  });
} catch {
  // Non-fatal
}

const S = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", flexDirection: "column" },
  topBand: { height: 12, backgroundColor: "#0050FF" },
  bottomBand: { height: 12, backgroundColor: "#0050FF" },
  outerBorder: {
    position: "absolute", top: 20, left: 20, right: 20, bottom: 20,
    borderWidth: 1.5, borderColor: "#CBD5E1", borderStyle: "solid",
  },
  innerBorder: {
    position: "absolute", top: 25, left: 25, right: 25, bottom: 25,
    borderWidth: 0.5, borderColor: "#00E5FF", borderStyle: "dashed",
  },
  body: { flex: 1, paddingHorizontal: 60, paddingVertical: 26, alignItems: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 18 },
  logo: { width: 44, height: 44, marginRight: 10 },
  clubName: { fontSize: 12, fontWeight: 700, color: "#0050FF", letterSpacing: 0.5 },
  certOfLabel: { fontSize: 9, color: "#94A3B8", letterSpacing: 3, marginBottom: 4, textAlign: "center" },
  certTitle: { fontSize: 28, fontWeight: 700, color: "#0F172A", letterSpacing: -0.5, textAlign: "center" },
  accentBar: { width: 72, height: 3, backgroundColor: "#00E5FF", marginTop: 10, marginBottom: 14 },
  presentedToLabel: { fontSize: 9, color: "#94A3B8", letterSpacing: 2, marginBottom: 6, textAlign: "center" },
  recipientName: { fontSize: 23, fontWeight: 700, color: "#0050FF", textAlign: "center", marginBottom: 12 },
  forLabel: { fontSize: 9, color: "#94A3B8", letterSpacing: 2, marginBottom: 5, textAlign: "center" },
  achievement: { fontSize: 13, fontWeight: 700, color: "#0F172A", textAlign: "center", marginBottom: 12, maxWidth: 440 },
  dateText: { fontSize: 9, color: "#94A3B8", marginBottom: 18, textAlign: "center" },
  dividerLine: { width: "100%", height: 1, backgroundColor: "#E2E8F0", marginBottom: 18 },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    width: "100%",
    marginBottom: 20,
  },
  signatureBlock: {
    alignItems: "center",
    flexGrow: 1,
    flexBasis: 0,
    maxWidth: 170,
    marginHorizontal: 14,
  },
  signatureImage: { width: 84, height: 30, objectFit: "contain", marginBottom: 4 },
  signatureLine: { width: 100, height: 1, backgroundColor: "#0F172A", marginBottom: 4 },
  signerName: { fontSize: 9, fontWeight: 700, color: "#0F172A", textAlign: "center" },
  signerDesignation: { fontSize: 7.5, color: "#94A3B8", textAlign: "center" },
  footerDivider: { width: 140, height: 1, backgroundColor: "#E2E8F0", marginBottom: 10 },
  qrBlock: { alignItems: "center" },
  qrImage: { width: 42, height: 42, marginBottom: 3 },
  serialLabel: { fontSize: 6.5, color: "#94A3B8", letterSpacing: 1, textAlign: "center" },
  serialValue: { fontSize: 7.5, fontWeight: 700, color: "#0F172A", letterSpacing: 0.3, textAlign: "center" },
  verifyNote: { fontSize: 6.5, color: "#0050FF", textAlign: "center" },
});

interface Signatory {
  name: string;
  designation: string;
  sigUrl: string;
}

function CertificateDoc({ data }: { data: CertificateData }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://gstu-rrc.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${data.serial}`;

  const signatories: Signatory[] = [
    { name: data.signedByName, designation: data.signedByDesignation, sigUrl: data.signatureUrl },
    { name: data.signedByName2, designation: data.signedByDesignation2, sigUrl: data.signatureUrl2 },
    { name: data.signedByName3 ?? "", designation: data.signedByDesignation3 ?? "", sigUrl: data.signatureUrl3 ?? "" },
  ].filter((s) => s.name && s.name.trim().length > 0);

  return React.createElement(
    Document,
    { title: `Certificate — ${data.memberName}`, author: data.clubName },
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: S.page },
      React.createElement(View, { style: S.outerBorder }),
      React.createElement(View, { style: S.innerBorder }),
      React.createElement(View, { style: S.topBand }),
      React.createElement(
        View,
        { style: S.body },
        React.createElement(
          View,
          { style: S.headerRow },
          data.logoUrl ? React.createElement(Image, { style: S.logo, src: data.logoUrl }) : null,
          React.createElement(Text, { style: S.clubName }, data.clubName)
        ),
        React.createElement(Text, { style: S.certOfLabel }, "CERTIFICATE OF"),
        React.createElement(Text, { style: S.certTitle }, "Achievement"),
        React.createElement(View, { style: S.accentBar }),
        React.createElement(Text, { style: S.presentedToLabel }, "PROUDLY PRESENTED TO"),
        React.createElement(Text, { style: S.recipientName }, data.memberName),
        React.createElement(Text, { style: S.forLabel }, "FOR"),
        React.createElement(Text, { style: S.achievement }, data.achievement),
        React.createElement(Text, { style: S.dateText }, `Issued on ${data.date}`),
        React.createElement(View, { style: S.dividerLine }),
        React.createElement(
          View,
          { style: S.signaturesRow },
          ...signatories.map((sig, i) =>
            React.createElement(
              View,
              { key: `sig-${i}`, style: S.signatureBlock },
              sig.sigUrl
                ? React.createElement(Image, { style: S.signatureImage, src: sig.sigUrl })
                : React.createElement(View, { style: { height: 34 } }),
              React.createElement(View, { style: S.signatureLine }),
              React.createElement(Text, { style: S.signerName }, sig.name),
              React.createElement(Text, { style: S.signerDesignation }, sig.designation)
            )
          )
        ),
        React.createElement(View, { style: S.footerDivider }),
        React.createElement(
          View,
          { style: S.qrBlock },
          data.qrCodeDataUrl
            ? React.createElement(Image, { style: S.qrImage, src: data.qrCodeDataUrl })
            : null,
          React.createElement(Text, { style: S.serialLabel }, "CERTIFICATE NO."),
          React.createElement(Text, { style: S.serialValue }, data.serial),
          React.createElement(Text, { style: S.verifyNote }, "Scan to verify"),
          React.createElement(Text, { style: { ...S.verifyNote, fontSize: 5.5 } }, verifyUrl)
        )
      ),
      React.createElement(View, { style: S.bottomBand })
    )
  );
}

/**
 * Always generates a real PDF via @react-pdf/renderer — works on Vercel's
 * free tier (pure JS, no headless browser). templateHtml/templateCss are
 * accepted for backward-compat with existing callers but intentionally
 * ignored: custom HTML templates cannot guarantee a valid PDF or a
 * non-overlapping signature layout, so output always uses this one
 * verified layout that supports 1–3 signatories without collision.
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