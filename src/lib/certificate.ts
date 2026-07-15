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
  Svg,
  Line,
  Circle,
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

/**
 * Fetches a remote image (logo/signature) and converts it to a base64 data URI.
 * Never throws — returns null on any failure (timeout, 404, network error),
 * so a broken Cloudinary link never takes down the whole certificate.
 */
async function fetchImageDataUri(url?: string | null): Promise<string | null> {
  if (!url || url.trim().length === 0) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.warn(`[certificate.ts] Failed to fetch image, skipping: ${url}`, err);
    return null;
  }
}

const COLORS = {
  primary: "#0050FF",
  accent: "#00A8CC",
  ink: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#CBD5E1",
  divider: "#E2E8F0",
};

const S = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    flexDirection: "column",
    fontFamily: "Helvetica",
  },
  topBand: { height: 14, backgroundColor: COLORS.primary },
  bottomBand: { height: 14, backgroundColor: COLORS.primary },
  outerBorder: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 1.25,
    borderColor: COLORS.border,
  },
  body: {
    flex: 1,
    paddingHorizontal: 64,
    paddingVertical: 30,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 16,
  },
  logo: { width: 40, height: 40, marginRight: 10, objectFit: "contain" },
  clubName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 1,
  },
  headerRule: {
    width: 90,
    height: 1.5,
    backgroundColor: COLORS.accent,
    marginTop: 6,
    marginBottom: 20,
  },
  certOfLabel: {
    fontSize: 9,
    color: COLORS.faint,
    letterSpacing: 4,
    marginBottom: 6,
    textAlign: "center",
  },
  certTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 16,
  },
  presentedToLabel: {
    fontSize: 9,
    color: COLORS.faint,
    letterSpacing: 2.5,
    marginBottom: 8,
    textAlign: "center",
  },
  recipientName: {
    fontSize: 25,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  forLabel: {
    fontSize: 9,
    color: COLORS.faint,
    letterSpacing: 2.5,
    marginBottom: 6,
    textAlign: "center",
  },
  achievement: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: 14,
    maxWidth: 460,
    lineHeight: 1.4,
  },
  dateText: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: COLORS.faint,
    marginBottom: 22,
    textAlign: "center",
  },
  dividerLine: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: 22,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    width: "100%",
    marginBottom: 22,
  },
  signatureBlock: {
    alignItems: "center",
    flexGrow: 1,
    flexBasis: 0,
    maxWidth: 170,
    marginHorizontal: 16,
  },
  signatureImage: { width: 84, height: 30, objectFit: "contain", marginBottom: 4 },
  signatureImageSpacer: { height: 34 },
  signatureLine: { width: 110, height: 1, backgroundColor: COLORS.ink, marginBottom: 5 },
  signerName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    textAlign: "center",
  },
  signerDesignation: { fontSize: 7.5, color: COLORS.faint, textAlign: "center" },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: { width: 44, height: 44, marginRight: 12 },
  footerTextBlock: { alignItems: "flex-start" },
  serialLabel: { fontSize: 6.5, color: COLORS.faint, letterSpacing: 1 },
  serialValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  verifyNote: { fontSize: 6.5, color: COLORS.primary },
});

/** Corner ornament — a simple L-shaped bracket drawn with native SVG lines, no assets needed. */
function CornerMark({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const size = 26;
  const positionStyle: Record<string, number | string> = { position: "absolute" };
  if (corner === "tl") { positionStyle.top = 32; positionStyle.left = 32; }
  if (corner === "tr") { positionStyle.top = 32; positionStyle.right = 32; }
  if (corner === "bl") { positionStyle.bottom = 32; positionStyle.left = 32; }
  if (corner === "br") { positionStyle.bottom = 32; positionStyle.right = 32; }

  const flipX = corner === "tr" || corner === "br";
  const flipY = corner === "bl" || corner === "br";

  return React.createElement(
    View,
    { style: positionStyle },
    React.createElement(
      Svg,
      { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      React.createElement(Line, {
        x1: flipX ? size : 0,
        y1: flipY ? size : 0,
        x2: flipX ? size - 16 : 16,
        y2: flipY ? size : 0,
        stroke: COLORS.accent,
        strokeWidth: 1.5,
      }),
      React.createElement(Line, {
        x1: flipX ? size : 0,
        y1: flipY ? size : 0,
        x2: flipX ? size : 0,
        y2: flipY ? size - 16 : 16,
        stroke: COLORS.accent,
        strokeWidth: 1.5,
      })
    )
  );
}

/** Decorative seal — two concentric circles, drawn as outlines so it prints cleanly in black/white too. */
function SealMark() {
  return React.createElement(
    View,
    { style: { position: "absolute", bottom: 34, right: 60, opacity: 0.9 } },
    React.createElement(
      Svg,
      { width: 46, height: 46, viewBox: "0 0 46 46" },
      React.createElement(Circle, {
        cx: 23, cy: 23, r: 21, stroke: COLORS.primary, strokeWidth: 1,
      }),
      React.createElement(Circle, {
        cx: 23, cy: 23, r: 16, stroke: COLORS.accent, strokeWidth: 0.75,
      })
    )
  );
}

interface Signatory {
  name: string;
  designation: string;
  sigDataUri: string | null;
}

function CertificateDoc({
  data,
  logoDataUri,
  signatories,
}: {
  data: CertificateData;
  logoDataUri: string | null;
  signatories: Signatory[];
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://gstu-rrc.vercel.app";
  const verifyUrl = `${baseUrl}/verify/${data.serial}`;

  return React.createElement(
    Document,
    { title: `Certificate — ${data.memberName}`, author: data.clubName },
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: S.page },
      React.createElement(View, { style: S.topBand }),
      React.createElement(View, { style: S.outerBorder }),
      React.createElement(CornerMark, { corner: "tl" }),
      React.createElement(CornerMark, { corner: "tr" }),
      React.createElement(CornerMark, { corner: "bl" }),
      React.createElement(CornerMark, { corner: "br" }),
      React.createElement(SealMark),
      React.createElement(
        View,
        { style: S.body },
        React.createElement(
          View,
          { style: { alignItems: "center" } },
          React.createElement(
            View,
            { style: S.headerRow },
            logoDataUri ? React.createElement(Image, { style: S.logo, src: logoDataUri }) : null,
            React.createElement(Text, { style: S.clubName }, data.clubName)
          ),
          React.createElement(View, { style: S.headerRule })
        ),
        React.createElement(Text, { style: S.certOfLabel }, "CERTIFICATE OF"),
        React.createElement(Text, { style: S.certTitle }, "Achievement"),
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
              sig.sigDataUri
                ? React.createElement(Image, { style: S.signatureImage, src: sig.sigDataUri })
                : React.createElement(View, { style: S.signatureImageSpacer }),
              React.createElement(View, { style: S.signatureLine }),
              React.createElement(Text, { style: S.signerName }, sig.name),
              React.createElement(Text, { style: S.signerDesignation }, sig.designation)
            )
          )
        ),
        React.createElement(
          View,
          { style: S.footerRow },
          data.qrCodeDataUrl
            ? React.createElement(Image, { style: S.qrImage, src: data.qrCodeDataUrl })
            : null,
          React.createElement(
            View,
            { style: S.footerTextBlock },
            React.createElement(Text, { style: S.serialLabel }, "CERTIFICATE NO."),
            React.createElement(Text, { style: S.serialValue }, data.serial),
            React.createElement(Text, { style: S.verifyNote }, "Scan to verify"),
            React.createElement(Text, { style: { ...S.verifyNote, fontSize: 5.5 } }, verifyUrl)
          )
        )
      ),
      React.createElement(View, { style: S.bottomBand })
    )
  );
}

/**
 * Generates a certificate PDF via @react-pdf/renderer — no headless browser,
 * no remote font fetch, no unguarded remote image loads. Every external image
 * (logo, signatures) is pre-fetched with a timeout and gracefully skipped on
 * failure so a broken Cloudinary URL never blocks certificate generation.
 *
 * templateHtml/templateCss are accepted for backward compatibility with
 * existing callers but intentionally ignored — see project deviation log
 * (DEV-154-01) for why custom HTML/CSS templates are not rendered.
 */
export async function generateCertificatePdf(
  _templateHtml: string,
  _templateCss: string,
  data: CertificateData
): Promise<Buffer> {
  try {
    const [logoDataUri, sig1, sig2, sig3] = await Promise.all([
      fetchImageDataUri(data.logoUrl),
      fetchImageDataUri(data.signatureUrl),
      fetchImageDataUri(data.signatureUrl2),
      fetchImageDataUri(data.signatureUrl3),
    ]);

    const signatories: Signatory[] = [
      { name: data.signedByName, designation: data.signedByDesignation, sigDataUri: sig1 },
      { name: data.signedByName2, designation: data.signedByDesignation2, sigDataUri: sig2 },
      { name: data.signedByName3 ?? "", designation: data.signedByDesignation3 ?? "", sigDataUri: sig3 },
    ].filter((s) => s.name && s.name.trim().length > 0);

    const docElement = CertificateDoc({ data, logoDataUri, signatories });
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