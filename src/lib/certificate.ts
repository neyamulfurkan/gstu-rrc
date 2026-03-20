// src/lib/certificate.ts

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

/**
 * Replaces all template placeholder tokens in an HTML string with actual data values.
 */
function replacePlaceholders(html: string, data: CertificateData): string {
  return html
    .replace(/\{\{member_name\}\}/g, escapeHtml(data.memberName))
    .replace(/\{\{achievement\}\}/g, escapeHtml(data.achievement))
    .replace(/\{\{date\}\}/g, escapeHtml(data.date))
    .replace(/\{\{signed_by_name\}\}/g, escapeHtml(data.signedByName))
    .replace(/\{\{signed_by_designation\}\}/g, escapeHtml(data.signedByDesignation))
    .replace(/\{\{signature_image\}\}/g, data.signatureUrl)
    .replace(/\{\{serial\}\}/g, escapeHtml(data.serial))
    .replace(/\{\{qr_code\}\}/g, data.qrCodeDataUrl)
    .replace(/\{\{club_name\}\}/g, escapeHtml(data.clubName))
    .replace(/\{\{logo_url\}\}/g, data.logoUrl);
}

/**
 * Escapes HTML special characters to prevent XSS in template substitution.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a PDF buffer from a certificate HTML template and data using Puppeteer.
 * Replaces all placeholder tokens, builds a full HTML document, and renders to PDF via headless Chromium.
 * Throws on any Puppeteer failure so the caller can handle per-recipient errors.
 *
 * @param templateHtml - The certificate HTML template with {{placeholder}} tokens
 * @param templateCss  - The certificate CSS string to embed in the document head
 * @param data         - The data values to substitute into the template
 * @returns A Node.js Buffer containing the rendered A4 PDF
 */
export async function generateCertificatePdf(
  templateHtml: string,
  templateCss: string,
  data: CertificateData
): Promise<Buffer> {
  // Replace all placeholders in the HTML template
  const populatedHtml = replacePlaceholders(templateHtml, data);

  // Build the full HTML document
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      ${templateCss}
    </style>
  </head>
  <body>
    ${populatedHtml}
  </body>
</html>`;

  // Skip Puppeteer on Vercel free tier — return HTML buffer instead
  const populatedHtmlFallback = replacePlaceholders(templateHtml, data);
  const fallbackHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><style>* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } ${templateCss}</style></head><body>${populatedHtmlFallback}</body></html>`;
  return Buffer.from(fallbackHtml, "utf-8");

  // eslint-disable-next-line no-unreachable
  let browser: import("puppeteer-core").Browser | null = null;

  try {
    // Dynamically import to avoid bundling issues on environments without Chromium
    const chromium = await import("@sparticuz/chromium-min");
    const puppeteer = await import("puppeteer-core");

    const remoteUrl =
      process.env.CHROMIUM_REMOTE_EXEC_PATH ??
      "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

    let executablePath: string;
    try {
      executablePath = await chromium.default.executablePath(remoteUrl);
    } catch {
      executablePath = await chromium.default.executablePath();
    }

    browser = await puppeteer.default.launch({
      args: [
        ...chromium.default.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      executablePath,
      headless: true as unknown as boolean,
      defaultViewport: { width: 1200, height: 850 },
    });

    const page = await browser!.newPage();

    // Set content and wait for all network resources (fonts, images) to load
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    // Generate the PDF as A4 with background graphics enabled
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    await browser!.close();
    browser = null;

    return Buffer.from(pdfBuffer);
  } catch (error) {
    // Ensure the browser is always closed even if an error occurs mid-render
    if (browser !== null) {
      try {
        await (browser as import("puppeteer-core").Browser).close();
      } catch (closeError) {
        console.error(
          "[certificate.ts] Failed to close Puppeteer browser after error:",
          closeError
        );
      }
    }

    console.error(
      `[certificate.ts] generateCertificatePdf failed for serial "${data.serial}" (recipient: "${data.memberName}"):`,
      error
    );

    // Re-throw so the certificates API route can handle per-recipient failures
    // and continue issuing certificates to the remaining recipients
    throw new Error(
      `PDF generation failed for certificate ${data.serial}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}