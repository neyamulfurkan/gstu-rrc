// src/components/admin/forms/CertificateTemplateEditor.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Eye, EyeOff, Save, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, Select, FormLabel } from "@/components/ui/Forms";
import { Alert, Spinner } from "@/components/ui/Feedback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertificateTemplateEditorProps {
  initialData?: {
    id?: string;
    name?: string;
    type?: string;
    htmlContent?: string;
    cssContent?: string;
  };
  onSubmit(data: {
    name: string;
    type: string;
    htmlContent: string;
    cssContent: string;
  }): Promise<void>;
  onClose(): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = [
  { value: "participation", label: "Participation" },
  { value: "achievement", label: "Achievement" },
  { value: "completion", label: "Completion" },
  { value: "custom", label: "Custom" },
] as const;

const PLACEHOLDERS = [
  { key: "{{member_name}}", label: "Member Name", sample: "John Doe" },
  { key: "{{achievement}}", label: "Achievement", sample: "Excellence in Robotics" },
  { key: "{{date}}", label: "Issue Date", sample: "March 18, 2026" },
  { key: "{{signed_by_name}}", label: "Signed By Name", sample: "Dr. Jane Smith" },
  { key: "{{signed_by_designation}}", label: "Signed By Designation", sample: "Club President" },
  { key: "{{signature_image}}", label: "Signature Image URL", sample: "https://example.com/sig.png" },
  { key: "{{serial}}", label: "Serial Number", sample: "GSTU-2026-A3F8E1C2" },
  { key: "{{qr_code}}", label: "QR Code (Data URL)", sample: "" },
  { key: "{{club_name}}", label: "Club Name", sample: "GSTU Robotics & Research Club" },
  { key: "{{logo_url}}", label: "Club Logo URL", sample: "https://example.com/logo.png" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{member_name}}": "John Doe",
  "{{achievement}}": "Excellence in Robotics",
  "{{date}}": "March 18, 2026",
  "{{signed_by_name}}": "Dr. Jane Smith",
  "{{signed_by_designation}}": "Club President",
  "{{signature_image}}": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iNjAiPjxwYXRoIGQ9Ik0xMCA0MCBRNDAgMTAgODAgMzAgUTEyMCA1MCAxNTAgMjAiIHN0cm9rZT0iIzMzMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
  "{{serial}}": "GSTU-2026-A3F8E1C2",
  "{{qr_code}}": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "{{club_name}}": "GSTU Robotics & Research Club",
  "{{logo_url}}": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMwMEU1RkYiLz48dGV4dCB4PSIzMiIgeT0iMzgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwNjBCMTQiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIj5HUjwvdGV4dD48L3N2Zz4=",
};

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate</title>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <img src="{{logo_url}}" alt="Club Logo" class="logo" />
      <h1 class="club-name">{{club_name}}</h1>
    </div>
    <div class="body">
      <p class="certifies">This is to certify that</p>
      <h2 class="member-name">{{member_name}}</h2>
      <p class="achievement-label">has successfully achieved</p>
      <p class="achievement">{{achievement}}</p>
    </div>
    <div class="footer">
      <div class="signature-block">
        <img src="{{signature_image}}" alt="Signature" class="signature" />
        <p class="signed-by">{{signed_by_name}}</p>
        <p class="designation">{{signed_by_designation}}</p>
      </div>
      <div class="meta">
        <p class="date">{{date}}</p>
        <p class="serial">{{serial}}</p>
        <img src="{{qr_code}}" alt="QR Code" class="qr-code" />
      </div>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.certificate { width: 800px; min-height: 560px; border: 8px double #b8860b; padding: 48px; background: linear-gradient(135deg, #fffdf0 0%, #fff8dc 100%); position: relative; }
.header { text-align: center; margin-bottom: 32px; }
.logo { width: 64px; height: 64px; margin-bottom: 12px; }
.club-name { font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: #555; font-family: Arial, sans-serif; }
.body { text-align: center; margin-bottom: 40px; }
.certifies { font-size: 14px; color: #777; margin-bottom: 12px; }
.member-name { font-size: 36px; color: #1a1a1a; font-style: italic; margin-bottom: 16px; }
.achievement-label { font-size: 14px; color: #777; margin-bottom: 8px; }
.achievement { font-size: 18px; color: #b8860b; font-weight: bold; }
.footer { display: flex; justify-content: space-between; align-items: flex-end; }
.signature-block { text-align: center; }
.signature { height: 48px; margin-bottom: 4px; }
.signed-by { font-size: 14px; font-weight: bold; color: #333; border-top: 1px solid #333; padding-top: 4px; }
.designation { font-size: 12px; color: #777; }
.meta { text-align: right; }
.date { font-size: 13px; color: #555; margin-bottom: 4px; }
.serial { font-size: 11px; color: #999; font-family: monospace; margin-bottom: 8px; }
.qr-code { width: 60px; height: 60px; }`;

// ─── Starter Templates ────────────────────────────────────────────────────────

interface StarterTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  htmlContent: string;
  cssContent: string;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "cyber-dark",
    name: "Cyber Dark",
    type: "achievement",
    description: "Futuristic dark theme with neon accents",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><div class="scanline"></div><header><div class="logo-wrap"><img src="{{logo_url}}" class="logo" alt="logo"/></div><div class="club">{{club_name}}</div><div class="cert-title">CERTIFICATE OF ACHIEVEMENT</div></header><main><p class="presented">Presented to</p><h1 class="name">{{member_name}}</h1><p class="for-text">In recognition of</p><p class="achievement">{{achievement}}</p></main><footer><div class="sig-block"><img src="{{signature_image}}" class="sig" alt="sig"/><div class="sig-line"></div><p class="sig-name">{{signed_by_name}}</p><p class="sig-role">{{signed_by_designation}}</p></div><div class="right-block"><p class="date">{{date}}</p><img src="{{qr_code}}" class="qr" alt="qr"/><p class="serial">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Share Tech Mono', monospace; }
.cert { width: 860px; min-height: 600px; background: linear-gradient(135deg, #060B14 0%, #0D1626 50%, #060B14 100%); border: 1px solid #00E5FF; padding: 50px 56px; position: relative; overflow: hidden; box-shadow: 0 0 60px rgba(0,229,255,0.15), inset 0 0 60px rgba(0,229,255,0.03); }
.corner { position: absolute; width: 24px; height: 24px; border-color: #00E5FF; border-style: solid; }
.corner.tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
.corner.tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
.corner.bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
.corner.br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }
.scanline { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px); pointer-events: none; }
header { display: flex; flex-direction: column; align-items: center; margin-bottom: 36px; gap: 10px; }
.logo-wrap { width: 64px; height: 64px; border: 1px solid rgba(0,229,255,0.4); border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(0,229,255,0.05); }
.logo { width: 48px; height: 48px; object-fit: contain; }
.club { font-family: 'Orbitron', sans-serif; font-size: 11px; letter-spacing: 6px; color: #00E5FF; text-transform: uppercase; }
.cert-title { font-family: 'Orbitron', sans-serif; font-size: 20px; font-weight: 900; color: #F0F4FF; letter-spacing: 4px; text-align: center; text-shadow: 0 0 20px rgba(0,229,255,0.5); }
main { text-align: center; margin-bottom: 44px; }
.presented { font-size: 12px; color: #7B8DB0; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
.name { font-family: 'Orbitron', sans-serif; font-size: 38px; font-weight: 700; color: #00E5FF; text-shadow: 0 0 30px rgba(0,229,255,0.6); margin-bottom: 20px; letter-spacing: 2px; }
.for-text { font-size: 11px; color: #7B8DB0; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
.achievement { font-size: 18px; color: #F0F4FF; font-weight: 400; max-width: 500px; margin: 0 auto; line-height: 1.6; border-left: 3px solid #00E5FF; padding-left: 16px; text-align: left; }
footer { display: flex; justify-content: space-between; align-items: flex-end; }
.sig-block { }
.sig { height: 40px; margin-bottom: 8px; filter: invert(1) sepia(1) saturate(2) hue-rotate(160deg); }
.sig-line { width: 160px; height: 1px; background: rgba(0,229,255,0.4); margin-bottom: 6px; }
.sig-name { font-size: 13px; color: #F0F4FF; font-weight: bold; }
.sig-role { font-size: 11px; color: #7B8DB0; }
.right-block { text-align: right; }
.date { font-size: 12px; color: #7B8DB0; margin-bottom: 8px; }
.qr { width: 56px; height: 56px; margin-bottom: 6px; filter: invert(1) sepia(1) saturate(3) hue-rotate(160deg); }
.serial { font-size: 10px; color: rgba(0,229,255,0.5); letter-spacing: 1px; }`,
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    type: "achievement",
    description: "Elegant royal design with gold borders and flourishes",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="outer-border"></div><div class="inner-border"></div><div class="watermark">★</div><header><div class="medallion"><img src="{{logo_url}}" class="logo" alt="logo"/></div><p class="kingdom">{{club_name}}</p><h1 class="title">Certificate of Excellence</h1><div class="divider"><span class="ornament">❧</span></div></header><main><p class="hereby">This certificate is hereby awarded to</p><h2 class="recipient">{{member_name}}</h2><p class="for-label">for outstanding achievement in</p><p class="achiev">{{achievement}}</p></main><footer><div class="left"><img src="{{signature_image}}" class="sig" alt=""/><div class="sig-rule"></div><p class="signer">{{signed_by_name}}</p><p class="signer-title">{{signed_by_designation}}</p></div><div class="center-seal">SEAL</div><div class="right"><img src="{{qr_code}}" class="qr" alt=""/><p class="dt">{{date}}</p><p class="ser">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:wght@300;400;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1a0a00; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.cert { width: 840px; min-height: 590px; background: linear-gradient(160deg, #fffff8 0%, #fffbee 40%, #fff9e6 100%); padding: 48px 52px; position: relative; overflow: hidden; }
.outer-border { position: absolute; inset: 8px; border: 2px solid #c9a84c; pointer-events: none; }
.inner-border { position: absolute; inset: 14px; border: 1px solid rgba(201,168,76,0.4); pointer-events: none; }
.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 320px; color: rgba(201,168,76,0.04); pointer-events: none; line-height: 1; }
header { text-align: center; margin-bottom: 32px; }
.medallion { width: 80px; height: 80px; margin: 0 auto 14px; border-radius: 50%; background: radial-gradient(circle, #f5d98b 0%, #c9a84c 50%, #a07830 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(160,120,48,0.4); }
.logo { width: 52px; height: 52px; object-fit: contain; border-radius: 50%; }
.kingdom { font-family: 'Cormorant Garamond', serif; font-size: 11px; letter-spacing: 5px; text-transform: uppercase; color: #8a6a1a; margin-bottom: 10px; }
.title { font-family: 'Playfair Display', serif; font-size: 32px; color: #2a1a00; font-weight: 700; letter-spacing: 1px; }
.divider { margin: 12px 0; }
.ornament { font-size: 24px; color: #c9a84c; }
main { text-align: center; margin-bottom: 40px; }
.hereby { font-family: 'Cormorant Garamond', serif; font-size: 14px; color: #8a7050; letter-spacing: 1px; margin-bottom: 14px; }
.recipient { font-family: 'Playfair Display', serif; font-style: italic; font-size: 40px; color: #1a0a00; margin-bottom: 18px; text-shadow: 1px 1px 0 rgba(201,168,76,0.3); }
.for-label { font-family: 'Cormorant Garamond', serif; font-size: 13px; color: #8a7050; margin-bottom: 10px; letter-spacing: 1px; }
.achiev { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: #3a2000; max-width: 480px; margin: 0 auto; line-height: 1.5; }
footer { display: flex; justify-content: space-between; align-items: flex-end; }
.left { text-align: center; }
.sig { height: 44px; margin-bottom: 6px; }
.sig-rule { width: 140px; height: 1px; background: #c9a84c; margin-bottom: 5px; }
.signer { font-family: 'Playfair Display', serif; font-size: 13px; color: #2a1a00; font-weight: 700; }
.signer-title { font-size: 11px; color: #8a7050; font-family: 'Cormorant Garamond', serif; }
.center-seal { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #c9a84c; background: radial-gradient(circle, #fff9e6, #f5e8b0); display: flex; align-items: center; justify-content: center; font-size: 9px; letter-spacing: 1px; color: #8a6a1a; font-family: 'Cormorant Garamond', serif; font-weight: 600; text-transform: uppercase; }
.right { text-align: right; }
.qr { width: 52px; height: 52px; margin-bottom: 4px; }
.dt { font-size: 12px; color: #8a7050; font-family: 'Cormorant Garamond', serif; margin-bottom: 3px; }
.ser { font-size: 10px; color: #b0906a; font-family: monospace; }`,
  },
  {
    id: "minimalist-noir",
    name: "Minimalist Noir",
    type: "completion",
    description: "Ultra-clean black and white with Swiss typography",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="accent-bar"></div><div class="content"><div class="top-row"><div class="logo-zone"><img src="{{logo_url}}" class="logo" alt=""/><span class="org">{{club_name}}</span></div><div class="cert-label">Certificate<br/>of Completion</div></div><div class="divider-line"></div><div class="main"><p class="sub">awarded to</p><h1 class="name">{{member_name}}</h1><p class="ach">{{achievement}}</p></div><div class="bottom-row"><div class="sig-area"><img src="{{signature_image}}" class="sig" alt=""/><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="right-area"><img src="{{qr_code}}" class="qr" alt=""/><p class="date">{{date}}</p><p class="serial">{{serial}}</p></div></div></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #e8e8e8; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
.cert { width: 840px; min-height: 560px; background: #fff; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.15); display: flex; flex-direction: column; }
.accent-bar { height: 6px; background: #111; }
.content { padding: 48px 56px; flex: 1; display: flex; flex-direction: column; gap: 0; }
.top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.logo-zone { display: flex; align-items: center; gap: 14px; }
.logo { width: 44px; height: 44px; object-fit: contain; }
.org { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #111; max-width: 180px; line-height: 1.4; }
.cert-label { font-size: 13px; font-weight: 300; color: #888; text-align: right; line-height: 1.8; letter-spacing: 1px; text-transform: uppercase; }
.divider-line { height: 1px; background: #111; margin-bottom: 40px; }
.main { flex: 1; }
.sub { font-size: 11px; font-weight: 400; color: #999; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
.name { font-size: 52px; font-weight: 900; color: #111; letter-spacing: -2px; line-height: 1.1; margin-bottom: 24px; }
.ach { font-size: 16px; font-weight: 300; color: #444; max-width: 500px; line-height: 1.7; border-left: 3px solid #111; padding-left: 16px; margin-bottom: 48px; }
.bottom-row { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #eee; padding-top: 24px; }
.sig-area { }
.sig { height: 36px; margin-bottom: 8px; filter: grayscale(1); }
.sn { font-size: 13px; font-weight: 700; color: #111; }
.sd { font-size: 11px; color: #888; margin-top: 2px; }
.right-area { text-align: right; }
.qr { width: 52px; height: 52px; margin-bottom: 6px; filter: grayscale(1); }
.date { font-size: 12px; color: #888; }
.serial { font-size: 10px; color: #bbb; font-family: monospace; margin-top: 2px; }`,
  },
  {
    id: "aurora-gradient",
    name: "Aurora Gradient",
    type: "achievement",
    description: "Vibrant aurora borealis inspired gradient certificate",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="glow-orb orb1"></div><div class="glow-orb orb2"></div><div class="glow-orb orb3"></div><div class="glass-panel"><header><img src="{{logo_url}}" class="logo" alt=""/><p class="org">{{club_name}}</p><h1 class="title">ACHIEVEMENT AWARD</h1></header><div class="sep"></div><main><p class="for-text">Proudly presented to</p><h2 class="name">{{member_name}}</h2><p class="ach">{{achievement}}</p></main><footer><div class="sig-col"><img src="{{signature_image}}" class="sig" alt=""/><p class="sname">{{signed_by_name}}</p><p class="stitle">{{signed_by_designation}}</p></div><div class="meta-col"><p class="date">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="serial">{{serial}}</p></div></footer></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #080010; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'DM Sans', sans-serif; }
.cert { width: 860px; min-height: 580px; position: relative; display: flex; align-items: center; justify-content: center; }
.glow-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.6; pointer-events: none; }
.orb1 { width: 400px; height: 400px; background: radial-gradient(circle, #7C3AED, transparent); top: -100px; left: -80px; }
.orb2 { width: 350px; height: 350px; background: radial-gradient(circle, #0EA5E9, transparent); bottom: -80px; right: -60px; }
.orb3 { width: 280px; height: 280px; background: radial-gradient(circle, #10B981, transparent); top: 40%; left: 40%; }
.glass-panel { position: relative; z-index: 1; width: 100%; background: rgba(255,255,255,0.06); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 52px 60px; box-shadow: 0 32px 64px rgba(0,0,0,0.5); }
header { text-align: center; margin-bottom: 28px; }
.logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 12px; border-radius: 12px; background: rgba(255,255,255,0.1); padding: 6px; }
.org { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 12px; font-family: 'DM Sans', sans-serif; }
.title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; background: linear-gradient(90deg, #A78BFA, #60A5FA, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 4px; }
.sep { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); margin: 0 0 32px; }
main { text-align: center; margin-bottom: 44px; }
.for-text { font-size: 12px; color: rgba(255,255,255,0.45); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
.name { font-family: 'Syne', sans-serif; font-size: 44px; font-weight: 800; color: #fff; margin-bottom: 20px; letter-spacing: -1px; text-shadow: 0 0 40px rgba(167,139,250,0.5); }
.ach { font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.75); max-width: 480px; margin: 0 auto; line-height: 1.7; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 28px; }
.sig-col { }
.sig { height: 40px; margin-bottom: 8px; filter: invert(1) opacity(0.7); }
.sname { font-size: 13px; font-weight: 700; color: #fff; }
.stitle { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
.meta-col { text-align: right; }
.date { font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 8px; }
.qr { width: 52px; height: 52px; margin-bottom: 4px; filter: invert(1) opacity(0.6); }
.serial { font-size: 10px; color: rgba(167,139,250,0.5); font-family: monospace; letter-spacing: 1px; }`,
  },
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    type: "completion",
    description: "Professional corporate style with clean blue branding",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="left-panel"><img src="{{logo_url}}" class="logo" alt=""/><p class="org-name">{{club_name}}</p><div class="vert-text">CERTIFICATE</div></div><div class="right-panel"><div class="top-area"><h1 class="title">Certificate of Completion</h1><p class="issued">This certificate is issued to</p><h2 class="name">{{member_name}}</h2><div class="ach-block"><p class="ach-label">Achievement</p><p class="ach">{{achievement}}</p></div></div><div class="bottom-area"><div class="sig-section"><img src="{{signature_image}}" class="sig" alt=""/><div class="sig-line"></div><p class="sname">{{signed_by_name}}</p><p class="srole">{{signed_by_designation}}</p></div><div class="info-section"><p class="date">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="serial">{{serial}}</p></div></div></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f0f4f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Nunito', sans-serif; }
.cert { width: 860px; min-height: 560px; background: #fff; display: flex; box-shadow: 0 20px 60px rgba(0,80,160,0.12); border-radius: 4px; overflow: hidden; }
.left-panel { width: 180px; background: linear-gradient(180deg, #0050FF 0%, #0030B0 100%); display: flex; flex-direction: column; align-items: center; padding: 40px 20px; flex-shrink: 0; }
.logo { width: 64px; height: 64px; object-fit: contain; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; margin-bottom: 20px; }
.org-name { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.8); text-align: center; letter-spacing: 1px; text-transform: uppercase; line-height: 1.5; margin-bottom: 40px; }
.vert-text { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.25); letter-spacing: 6px; text-transform: uppercase; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); margin-top: auto; }
.right-panel { flex: 1; padding: 48px 52px; display: flex; flex-direction: column; }
.top-area { flex: 1; }
.title { font-size: 26px; font-weight: 800; color: #0050FF; letter-spacing: -0.5px; margin-bottom: 28px; }
.issued { font-size: 13px; color: #888; font-weight: 400; margin-bottom: 10px; letter-spacing: 0.5px; }
.name { font-size: 42px; font-weight: 800; color: #111827; letter-spacing: -1px; margin-bottom: 28px; line-height: 1.1; }
.ach-block { background: #f0f4ff; border-left: 4px solid #0050FF; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 32px; }
.ach-label { font-size: 10px; font-weight: 700; color: #0050FF; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
.ach { font-size: 16px; font-weight: 600; color: #111827; line-height: 1.5; }
.bottom-area { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; padding-top: 24px; }
.sig-section { }
.sig { height: 38px; margin-bottom: 8px; }
.sig-line { width: 140px; height: 1px; background: #111827; margin-bottom: 6px; }
.sname { font-size: 13px; font-weight: 700; color: #111827; }
.srole { font-size: 11px; color: #6b7280; margin-top: 2px; }
.info-section { text-align: right; }
.date { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
.qr { width: 52px; height: 52px; margin-bottom: 4px; }
.serial { font-size: 10px; color: #9ca3af; font-family: monospace; }`,
  },
  {
    id: "emerald-nature",
    name: "Emerald Nature",
    type: "participation",
    description: "Organic green theme with botanical aesthetic",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="top-stripe"></div><div class="bottom-stripe"></div><div class="leaf leaf1">🌿</div><div class="leaf leaf2">🌿</div><header><img src="{{logo_url}}" class="logo" alt=""/><h2 class="org">{{club_name}}</h2><h1 class="title">Certificate of Participation</h1></header><div class="line-deco"><span class="dot"></span><span class="rule"></span><span class="dot"></span></div><main><p class="honor">Honoring the contribution of</p><h2 class="name">{{member_name}}</h2><p class="for-text">{{achievement}}</p></main><footer><div class="left-f"><img src="{{signature_image}}" class="sig" alt=""/><div class="sig-line"></div><p class="sn">{{signed_by_name}}</p><p class="st">{{signed_by_designation}}</p></div><div class="right-f"><img src="{{qr_code}}" class="qr" alt=""/><p class="date">{{date}}</p><p class="ser">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Poppins:wght@300;400;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f0f7f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Poppins', sans-serif; }
.cert { width: 840px; min-height: 570px; background: linear-gradient(160deg, #fafff8 0%, #f0fff4 100%); border: 1px solid rgba(34,197,94,0.2); padding: 50px 56px; position: relative; overflow: hidden; box-shadow: 0 20px 60px rgba(21,128,61,0.1); }
.top-stripe { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #15803d, #22c55e, #86efac, #22c55e, #15803d); }
.bottom-stripe { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #15803d, #22c55e, #86efac, #22c55e, #15803d); }
.leaf { position: absolute; font-size: 80px; opacity: 0.06; pointer-events: none; }
.leaf1 { top: 20px; right: 30px; transform: rotate(30deg); }
.leaf2 { bottom: 30px; left: 20px; transform: rotate(-20deg) scaleX(-1); }
header { text-align: center; margin-bottom: 24px; }
.logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 12px; border-radius: 50%; border: 3px solid #22c55e; padding: 6px; background: #f0fff4; }
.org { font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #15803d; margin-bottom: 10px; }
.title { font-family: 'Lora', serif; font-size: 30px; color: #14532d; font-weight: 600; }
.line-deco { display: flex; align-items: center; gap: 12px; margin: 20px 0 28px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.rule { flex: 1; height: 1px; background: linear-gradient(90deg, #22c55e, #86efac, #22c55e); }
main { text-align: center; margin-bottom: 44px; }
.honor { font-size: 13px; color: #4ade80; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px; }
.name { font-family: 'Lora', serif; font-style: italic; font-size: 42px; color: #14532d; margin-bottom: 20px; font-weight: 400; }
.for-text { font-size: 16px; color: #166534; font-weight: 300; max-width: 460px; margin: 0 auto; line-height: 1.7; }
footer { display: flex; justify-content: space-between; align-items: flex-end; }
.left-f { }
.sig { height: 40px; margin-bottom: 6px; filter: sepia(1) saturate(2) hue-rotate(80deg) opacity(0.8); }
.sig-line { width: 150px; height: 1px; background: #22c55e; margin-bottom: 6px; }
.sn { font-size: 13px; font-weight: 600; color: #14532d; }
.st { font-size: 11px; color: #4ade80; }
.right-f { text-align: right; }
.qr { width: 52px; height: 52px; margin-bottom: 6px; filter: sepia(1) saturate(2) hue-rotate(80deg); }
.date { font-size: 12px; color: #4ade80; margin-bottom: 3px; }
.ser { font-size: 10px; color: #86efac; font-family: monospace; }`,
  },
  {
    id: "crimson-prestige",
    name: "Crimson Prestige",
    type: "achievement",
    description: "Bold crimson and charcoal with geometric accents",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="geo-accent top-left"></div><div class="geo-accent top-right"></div><div class="geo-accent bot-left"></div><div class="geo-accent bot-right"></div><header><div class="header-inner"><img src="{{logo_url}}" class="logo" alt=""/><div class="header-text"><p class="org">{{club_name}}</p><h1 class="title">Certificate of Achievement</h1></div></div><div class="red-rule"></div></header><main><div class="name-block"><p class="presented">This certificate is presented to</p><h2 class="name">{{member_name}}</h2></div><div class="ach-ribbon"><p class="ach">{{achievement}}</p></div></main><footer><div class="sig-block"><img src="{{signature_image}}" class="sig" alt=""/><span class="line"></span><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="badge">✦</div><div class="right-block"><p class="date">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="serial">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&family=Playfair+Display:ital,wght@1,400&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1a0505; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Montserrat', sans-serif; }
.cert { width: 850px; min-height: 580px; background: #1c1c1e; border: 1px solid rgba(220,38,38,0.3); padding: 50px 56px; position: relative; overflow: hidden; box-shadow: 0 0 80px rgba(220,38,38,0.1); }
.geo-accent { position: absolute; width: 60px; height: 60px; border-color: rgba(220,38,38,0.4); border-style: solid; pointer-events: none; }
.top-left { top: 0; left: 0; border-width: 3px 0 0 3px; }
.top-right { top: 0; right: 0; border-width: 3px 3px 0 0; }
.bot-left { bottom: 0; left: 0; border-width: 0 0 3px 3px; }
.bot-right { bottom: 0; right: 0; border-width: 0 3px 3px 0; }
header { margin-bottom: 32px; }
.header-inner { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.logo { width: 64px; height: 64px; object-fit: contain; background: rgba(220,38,38,0.1); border-radius: 8px; padding: 8px; border: 1px solid rgba(220,38,38,0.3); }
.org { font-size: 10px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #dc2626; margin-bottom: 6px; }
.title { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.5px; text-transform: uppercase; }
.red-rule { height: 2px; background: linear-gradient(90deg, #dc2626 0%, #ef4444 50%, transparent 100%); }
main { margin-bottom: 44px; }
.name-block { margin-bottom: 24px; }
.presented { font-size: 11px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; margin-top: 28px; }
.name { font-size: 46px; font-weight: 900; color: #fff; letter-spacing: -2px; line-height: 1.1; }
.ach-ribbon { background: rgba(220,38,38,0.12); border-left: 4px solid #dc2626; padding: 14px 20px; }
.ach { font-size: 16px; font-weight: 300; color: rgba(255,255,255,0.8); line-height: 1.6; font-family: 'Playfair Display', serif; font-style: italic; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; }
.sig-block { }
.sig { height: 38px; margin-bottom: 8px; filter: invert(1) sepia(1) saturate(3) hue-rotate(320deg) opacity(0.8); }
.line { display: block; width: 140px; height: 1px; background: rgba(220,38,38,0.5); margin-bottom: 6px; }
.sn { font-size: 13px; font-weight: 700; color: #fff; }
.sd { font-size: 11px; color: #666; margin-top: 2px; }
.badge { font-size: 32px; color: rgba(220,38,38,0.3); }
.right-block { text-align: right; }
.date { font-size: 12px; color: #666; margin-bottom: 8px; }
.qr { width: 52px; height: 52px; margin-bottom: 4px; filter: invert(1) sepia(1) saturate(3) hue-rotate(320deg) opacity(0.6); }
.serial { font-size: 10px; color: rgba(220,38,38,0.4); font-family: monospace; letter-spacing: 1px; }`,
  },
  {
    id: "ocean-wave",
    name: "Ocean Wave",
    type: "participation",
    description: "Serene ocean blue with flowing wave patterns",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="wave-bg"></div><div class="content"><header><img src="{{logo_url}}" class="logo" alt=""/><h2 class="org">{{club_name}}</h2><h1 class="title">Certificate of Participation</h1><div class="wave-line"></div></header><main><p class="sub">Awarded with pride to</p><h2 class="name">{{member_name}}</h2><p class="desc">{{achievement}}</p></main><footer><div class="left"><img src="{{signature_image}}" class="sig" alt=""/><div class="sig-underline"></div><p class="sn">{{signed_by_name}}</p><p class="sr">{{signed_by_designation}}</p></div><div class="right"><p class="dt">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="srl">{{serial}}</p></div></footer></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #001829; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Raleway', sans-serif; }
.cert { width: 860px; min-height: 580px; background: linear-gradient(160deg, #001829 0%, #003366 60%, #004080 100%); border: 1px solid rgba(56,189,248,0.25); border-radius: 16px; position: relative; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.6); }
.wave-bg { position: absolute; bottom: 0; left: 0; right: 0; height: 200px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200'%3E%3Cpath d='M0 100 Q300 20 600 100 Q900 180 1200 100 L1200 200 L0 200Z' fill='rgba(56,189,248,0.06)'/%3E%3Cpath d='M0 130 Q300 60 600 130 Q900 200 1200 130 L1200 200 L0 200Z' fill='rgba(56,189,248,0.04)'/%3E%3C/svg%3E") no-repeat bottom; background-size: cover; pointer-events: none; }
.content { position: relative; z-index: 1; padding: 50px 56px; }
header { text-align: center; margin-bottom: 32px; }
.logo { width: 64px; height: 64px; object-fit: contain; margin-bottom: 14px; border-radius: 50%; background: rgba(56,189,248,0.1); padding: 8px; border: 2px solid rgba(56,189,248,0.3); }
.org { font-size: 11px; font-weight: 600; letter-spacing: 4px; color: #38bdf8; text-transform: uppercase; margin-bottom: 12px; }
.title { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: 2px; text-transform: uppercase; }
.wave-line { margin: 18px auto 0; width: 200px; height: 3px; background: linear-gradient(90deg, transparent, #38bdf8, #7dd3fc, #38bdf8, transparent); border-radius: 2px; }
main { text-align: center; margin-bottom: 48px; }
.sub { font-size: 12px; color: rgba(56,189,248,0.6); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; margin-top: 28px; }
.name { font-size: 44px; font-weight: 800; color: #fff; letter-spacing: -1px; margin-bottom: 20px; text-shadow: 0 0 40px rgba(56,189,248,0.4); }
.desc { font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.7); max-width: 480px; margin: 0 auto; line-height: 1.8; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(56,189,248,0.15); padding-top: 24px; }
.left { }
.sig { height: 38px; margin-bottom: 8px; filter: invert(1) sepia(1) saturate(3) hue-rotate(180deg) opacity(0.7); }
.sig-underline { width: 150px; height: 1px; background: rgba(56,189,248,0.4); margin-bottom: 6px; }
.sn { font-size: 13px; font-weight: 700; color: #fff; }
.sr { font-size: 11px; color: rgba(56,189,248,0.6); margin-top: 2px; }
.right { text-align: right; }
.dt { font-size: 12px; color: rgba(56,189,248,0.5); margin-bottom: 8px; }
.qr { width: 52px; height: 52px; margin-bottom: 6px; filter: invert(1) sepia(1) saturate(3) hue-rotate(180deg) opacity(0.5); }
.srl { font-size: 10px; color: rgba(56,189,248,0.3); font-family: monospace; letter-spacing: 1px; }`,
  },
  {
    id: "sunset-warmth",
    name: "Sunset Warmth",
    type: "achievement",
    description: "Warm sunset gradient with orange and purple tones",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="sun-glow"></div><header><div class="brand"><img src="{{logo_url}}" class="logo" alt=""/><div><p class="org">{{club_name}}</p><p class="tagline">Excellence · Innovation · Impact</p></div></div><h1 class="title">CERTIFICATE OF ACHIEVEMENT</h1></header><div class="hor-rule"></div><main><p class="honor">With great pride, we honor</p><h2 class="name">{{member_name}}</h2><div class="ach-wrap"><p class="ach">{{achievement}}</p></div></main><footer><div class="left-f"><img src="{{signature_image}}" class="sig" alt=""/><div class="line"></div><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="right-f"><img src="{{qr_code}}" class="qr" alt=""/><p class="date">{{date}}</p><p class="serial">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Josefin+Sans:wght@300;400;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1a0820; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Josefin Sans', sans-serif; }
.cert { width: 860px; min-height: 580px; background: linear-gradient(135deg, #1a0820 0%, #2d1040 40%, #1a0820 100%); border: 1px solid rgba(251,146,60,0.2); padding: 50px 56px; position: relative; overflow: hidden; box-shadow: 0 0 100px rgba(251,146,60,0.08); }
.sun-glow { position: absolute; top: -120px; right: -80px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(251,146,60,0.15), transparent 70%); pointer-events: none; }
header { margin-bottom: 28px; }
.brand { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.logo { width: 56px; height: 56px; object-fit: contain; border-radius: 10px; background: rgba(251,146,60,0.1); padding: 6px; border: 1px solid rgba(251,146,60,0.25); }
.org { font-size: 14px; font-weight: 700; color: #fb923c; letter-spacing: 2px; text-transform: uppercase; }
.tagline { font-size: 10px; color: rgba(251,146,60,0.4); letter-spacing: 2px; margin-top: 3px; }
.title { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; background: linear-gradient(90deg, #fb923c, #fbbf24, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 5px; }
.hor-rule { height: 1px; background: linear-gradient(90deg, rgba(251,146,60,0.5), rgba(251,191,36,0.8), rgba(251,146,60,0.5)); margin-bottom: 36px; }
main { margin-bottom: 44px; }
.honor { font-size: 12px; color: rgba(251,146,60,0.5); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px; }
.name { font-family: 'Cinzel', serif; font-size: 44px; font-weight: 700; color: #fff; letter-spacing: -1px; margin-bottom: 24px; line-height: 1.1; text-shadow: 0 0 40px rgba(251,146,60,0.3); }
.ach-wrap { border-left: 3px solid #fb923c; padding-left: 18px; }
.ach { font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.75); line-height: 1.7; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(251,146,60,0.15); padding-top: 24px; }
.left-f { }
.sig { height: 38px; margin-bottom: 8px; filter: sepia(1) saturate(4) hue-rotate(10deg) opacity(0.7); }
.line { width: 140px; height: 1px; background: rgba(251,146,60,0.4); margin-bottom: 6px; }
.sn { font-size: 13px; font-weight: 700; color: #fff; }
.sd { font-size: 11px; color: rgba(251,146,60,0.5); margin-top: 2px; }
.right-f { text-align: right; }
.qr { width: 52px; height: 52px; margin-bottom: 6px; filter: sepia(1) saturate(4) hue-rotate(10deg) opacity(0.5); }
.date { font-size: 12px; color: rgba(251,146,60,0.5); margin-bottom: 3px; }
.serial { font-size: 10px; color: rgba(251,146,60,0.25); font-family: monospace; }`,
  },
  {
    id: "elegant-ivory",
    name: "Elegant Ivory",
    type: "completion",
    description: "Sophisticated ivory parchment with calligraphy style",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="border-outer"></div><div class="border-inner"></div><div class="flourish fl-tl">✦</div><div class="flourish fl-tr">✦</div><div class="flourish fl-bl">✦</div><div class="flourish fl-br">✦</div><header><img src="{{logo_url}}" class="logo" alt=""/><p class="issuer">{{club_name}}</p><div class="double-rule"><div class="r1"></div><div class="r2"></div></div><h1 class="title">Certificate of Completion</h1><div class="double-rule"><div class="r1"></div><div class="r2"></div></div></header><main><p class="presented">This document certifies that</p><h2 class="name">{{member_name}}</h2><p class="has-completed">has successfully completed</p><p class="achievement">{{achievement}}</p></main><footer><div class="sig-col"><img src="{{signature_image}}" class="sig" alt=""/><div class="line"></div><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="divider-vert"></div><div class="info-col"><p class="dt">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="ser">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #d4c4a0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Crimson Text', serif; }
.cert { width: 840px; min-height: 590px; background: linear-gradient(160deg, #fdf8ee 0%, #faf3e0 100%); padding: 50px 56px; position: relative; overflow: hidden; box-shadow: 0 20px 60px rgba(100,80,20,0.3); }
.border-outer { position: absolute; inset: 10px; border: 2px solid #8B6914; pointer-events: none; }
.border-inner { position: absolute; inset: 16px; border: 1px solid rgba(139,105,20,0.35); pointer-events: none; }
.flourish { position: absolute; font-size: 20px; color: #8B6914; pointer-events: none; }
.fl-tl { top: 28px; left: 28px; }
.fl-tr { top: 28px; right: 28px; }
.fl-bl { bottom: 28px; left: 28px; }
.fl-br { bottom: 28px; right: 28px; }
header { text-align: center; margin-bottom: 20px; }
.logo { width: 64px; height: 64px; object-fit: contain; margin-bottom: 12px; border-radius: 50%; border: 2px solid #8B6914; padding: 6px; background: rgba(139,105,20,0.05); }
.issuer { font-family: 'IM Fell English', serif; font-size: 13px; letter-spacing: 3px; color: #5a420e; text-transform: uppercase; margin-bottom: 14px; }
.double-rule { margin: 8px auto; width: 320px; }
.r1 { height: 2px; background: #8B6914; margin-bottom: 3px; }
.r2 { height: 1px; background: rgba(139,105,20,0.4); }
.title { font-family: 'IM Fell English', serif; font-size: 28px; color: #2a1a00; margin: 14px 0; }
main { text-align: center; margin-bottom: 40px; }
.presented { font-size: 14px; color: #7a5c20; margin-bottom: 12px; margin-top: 20px; font-style: italic; }
.name { font-family: 'IM Fell English', serif; font-style: italic; font-size: 44px; color: #1a0e00; margin-bottom: 16px; }
.has-completed { font-size: 14px; color: #7a5c20; margin-bottom: 10px; font-style: italic; }
.achievement { font-family: 'IM Fell English', serif; font-size: 20px; color: #3a2800; max-width: 460px; margin: 0 auto; line-height: 1.5; }
footer { display: flex; justify-content: center; align-items: flex-end; gap: 48px; border-top: 1px solid rgba(139,105,20,0.3); padding-top: 24px; }
.sig-col { text-align: center; }
.sig { height: 40px; margin-bottom: 6px; filter: sepia(1) saturate(2) hue-rotate(20deg); }
.line { width: 150px; height: 1px; background: #8B6914; margin: 0 auto 6px; }
.sn { font-size: 13px; font-weight: 600; color: #2a1a00; }
.sd { font-size: 11px; color: #7a5c20; margin-top: 2px; font-style: italic; }
.divider-vert { width: 1px; height: 80px; background: rgba(139,105,20,0.3); }
.info-col { text-align: center; }
.dt { font-size: 12px; color: #7a5c20; margin-bottom: 8px; font-style: italic; }
.qr { width: 50px; height: 50px; margin-bottom: 4px; filter: sepia(1); }
.ser { font-size: 10px; color: rgba(139,105,20,0.5); font-family: monospace; }`,
  },
  {
    id: "tech-blueprint",
    name: "Tech Blueprint",
    type: "completion",
    description: "Engineering blueprint style with grid lines and technical aesthetics",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="grid-bg"></div><div class="corner-mark cm1"></div><div class="corner-mark cm2"></div><div class="corner-mark cm3"></div><div class="corner-mark cm4"></div><div class="header-bar"><img src="{{logo_url}}" class="logo" alt=""/><div class="title-block"><p class="doc-type">[ OFFICIAL DOCUMENT ]</p><h1 class="title">COMPLETION CERTIFICATE</h1><p class="org">{{club_name}}</p></div><div class="id-block"><p class="id-label">DOCUMENT ID</p><p class="id-val">{{serial}}</p></div></div><div class="main-section"><div class="label-row"><span class="lbl">RECIPIENT</span></div><h2 class="name">{{member_name}}</h2><div class="label-row"><span class="lbl">CERTIFICATION</span></div><p class="ach">{{achievement}}</p></div><div class="footer-bar"><div class="auth-block"><p class="auth-label">AUTHORIZED BY</p><img src="{{signature_image}}" class="sig" alt=""/><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="date-block"><p class="dt-label">ISSUED ON</p><p class="dt">{{date}}</p></div><div class="qr-block"><img src="{{qr_code}}" class="qr" alt=""/><p class="verify">VERIFY ONLINE</p></div></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #000810; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Exo 2', sans-serif; }
.cert { width: 860px; min-height: 580px; background: #00080f; border: 1px solid rgba(0,180,255,0.3); padding: 0; position: relative; overflow: hidden; box-shadow: 0 0 60px rgba(0,180,255,0.08); }
.grid-bg { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,180,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.04) 1px, transparent 1px); background-size: 30px 30px; pointer-events: none; }
.corner-mark { position: absolute; width: 20px; height: 20px; border-color: rgba(0,180,255,0.5); border-style: solid; pointer-events: none; }
.cm1 { top: 8px; left: 8px; border-width: 1px 0 0 1px; }
.cm2 { top: 8px; right: 8px; border-width: 1px 1px 0 0; }
.cm3 { bottom: 8px; left: 8px; border-width: 0 0 1px 1px; }
.cm4 { bottom: 8px; right: 8px; border-width: 0 1px 1px 0; }
.header-bar { background: rgba(0,180,255,0.06); border-bottom: 1px solid rgba(0,180,255,0.2); padding: 24px 40px; display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
.logo { width: 52px; height: 52px; object-fit: contain; border: 1px solid rgba(0,180,255,0.3); border-radius: 6px; padding: 6px; background: rgba(0,180,255,0.05); }
.title-block { flex: 1; }
.doc-type { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: rgba(0,180,255,0.4); letter-spacing: 3px; margin-bottom: 4px; }
.title { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 3px; text-transform: uppercase; }
.org { font-size: 11px; font-weight: 400; color: rgba(0,180,255,0.6); letter-spacing: 2px; margin-top: 4px; }
.id-block { text-align: right; }
.id-label { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: rgba(0,180,255,0.4); letter-spacing: 2px; margin-bottom: 4px; }
.id-val { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: rgba(0,180,255,0.7); }
.main-section { padding: 36px 40px; position: relative; z-index: 1; flex: 1; }
.label-row { margin-bottom: 8px; margin-top: 20px; }
.lbl { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: rgba(0,180,255,0.4); letter-spacing: 3px; border-bottom: 1px solid rgba(0,180,255,0.15); padding-bottom: 4px; display: block; }
.name { font-size: 46px; font-weight: 900; color: #00b4ff; letter-spacing: -1px; text-shadow: 0 0 30px rgba(0,180,255,0.4); margin-bottom: 20px; }
.ach { font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.7); line-height: 1.7; max-width: 580px; margin-bottom: 32px; }
.footer-bar { background: rgba(0,180,255,0.04); border-top: 1px solid rgba(0,180,255,0.2); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
.auth-block { }
.auth-label { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: rgba(0,180,255,0.4); letter-spacing: 2px; margin-bottom: 6px; }
.sig { height: 34px; margin-bottom: 4px; filter: invert(1) sepia(1) saturate(10) hue-rotate(185deg) opacity(0.6); }
.sn { font-size: 12px; font-weight: 700; color: #fff; }
.sd { font-size: 10px; color: rgba(0,180,255,0.5); }
.date-block { text-align: center; }
.dt-label { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: rgba(0,180,255,0.4); letter-spacing: 2px; margin-bottom: 4px; }
.dt { font-size: 14px; font-weight: 600; color: rgba(0,180,255,0.8); }
.qr-block { text-align: right; }
.qr { width: 52px; height: 52px; margin-bottom: 4px; filter: invert(1) sepia(1) saturate(10) hue-rotate(185deg) opacity(0.5); }
.verify { font-family: 'Share Tech Mono', monospace; font-size: 8px; color: rgba(0,180,255,0.3); letter-spacing: 2px; }`,
  },
  {
    id: "pastel-soft",
    name: "Pastel Soft",
    type: "participation",
    description: "Soft pastel colors with rounded modern design",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="inner"><header><div class="logo-ring"><img src="{{logo_url}}" class="logo" alt=""/></div><p class="org">{{club_name}}</p><h1 class="title">Certificate of Participation</h1></header><main><p class="given">Given with appreciation to</p><h2 class="name">{{member_name}}</h2><p class="ach">{{achievement}}</p></main><footer><div class="left"><img src="{{signature_image}}" class="sig" alt=""/><div class="sig-line"></div><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="stamps"><div class="star-badge">⭐</div><p class="date">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="serial">{{serial}}</p></div></footer></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Nunito:ital,wght@0,300;0,400;0,700;1,400&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f8f0ff; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Quicksand', sans-serif; }
.cert { width: 840px; min-height: 560px; background: #fff; border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 20px 60px rgba(150,100,200,0.15); }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
.b1 { width: 320px; height: 320px; background: rgba(196,181,253,0.35); top: -80px; left: -60px; }
.b2 { width: 280px; height: 280px; background: rgba(251,207,232,0.35); top: -40px; right: -40px; }
.b3 { width: 240px; height: 240px; background: rgba(167,243,208,0.3); bottom: -40px; right: 100px; }
.inner { position: relative; z-index: 1; padding: 50px 56px; }
header { text-align: center; margin-bottom: 32px; }
.logo-ring { width: 80px; height: 80px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg, #c4b5fd, #f9a8d4, #6ee7b7); padding: 3px; }
.logo { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; background: #fff; padding: 8px; }
.org { font-size: 12px; font-weight: 700; letter-spacing: 3px; color: #a78bfa; text-transform: uppercase; margin-bottom: 12px; }
.title { font-size: 30px; font-weight: 700; color: #1f1040; }
main { text-align: center; margin-bottom: 44px; }
.given { font-size: 13px; color: #9ca3af; letter-spacing: 1px; margin-bottom: 14px; margin-top: 24px; font-family: 'Nunito', sans-serif; font-style: italic; }
.name { font-size: 44px; font-weight: 700; color: #1f1040; margin-bottom: 20px; letter-spacing: -1px; }
.ach { font-size: 17px; font-weight: 400; color: #6b7280; max-width: 460px; margin: 0 auto; line-height: 1.7; font-family: 'Nunito', sans-serif; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px dashed rgba(167,139,250,0.2); padding-top: 28px; }
.left { }
.sig { height: 36px; margin-bottom: 8px; filter: saturate(0) opacity(0.6); }
.sig-line { width: 140px; height: 2px; background: linear-gradient(90deg, #c4b5fd, #f9a8d4); border-radius: 2px; margin-bottom: 6px; }
.sn { font-size: 13px; font-weight: 700; color: #1f1040; }
.sd { font-size: 11px; color: #a78bfa; margin-top: 2px; }
.stamps { text-align: right; }
.star-badge { font-size: 28px; margin-bottom: 6px; }
.date { font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
.qr { width: 48px; height: 48px; margin-bottom: 4px; filter: saturate(0) opacity(0.4); }
.serial { font-size: 10px; color: #d1d5db; font-family: monospace; }`,
  },
  {
    id: "diamond-luxury",
    name: "Diamond Luxury",
    type: "achievement",
    description: "Ultra-premium diamond pattern with luxury metallic finish",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="diamond-bg"></div><div class="frame-top"></div><div class="frame-bottom"></div><div class="content"><header><div class="emblem"><img src="{{logo_url}}" class="logo" alt=""/></div><p class="issuer">{{club_name}}</p><div class="crown">◆ ◆ ◆</div><h1 class="title">DISTINGUISHED ACHIEVEMENT AWARD</h1></header><div class="sep-line"></div><main><p class="this-certifies">This certificate is bestowed upon</p><h2 class="name">{{member_name}}</h2><p class="for-excellence">{{achievement}}</p></main><div class="sep-line"></div><footer><div class="sig-group"><img src="{{signature_image}}" class="sig" alt=""/><div class="sig-rule"></div><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="center-diamond">◆</div><div class="info-group"><p class="dt">{{date}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="serial">{{serial}}</p></div></footer></div></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.cert { width: 860px; min-height: 590px; background: linear-gradient(160deg, #1a1208 0%, #0f0c06 40%, #1a1208 100%); position: relative; overflow: hidden; box-shadow: 0 0 100px rgba(212,175,55,0.2); }
.diamond-bg { position: absolute; inset: 0; opacity: 0.04; background-image: repeating-linear-gradient(45deg, #d4af37 0, #d4af37 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #d4af37 0, #d4af37 1px, transparent 0, transparent 50%); background-size: 30px 30px; pointer-events: none; }
.frame-top { position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #8B6914, #d4af37, #f5e6a3, #d4af37, #8B6914); }
.frame-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #8B6914, #d4af37, #f5e6a3, #d4af37, #8B6914); }
.content { position: relative; z-index: 1; padding: 44px 56px; }
header { text-align: center; margin-bottom: 24px; }
.emblem { width: 88px; height: 88px; margin: 0 auto 16px; border-radius: 50%; background: radial-gradient(circle, #f5e6a3 0%, #d4af37 40%, #8B6914 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.2); }
.logo { width: 56px; height: 56px; object-fit: contain; border-radius: 50%; }
.issuer { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 5px; color: #d4af37; text-transform: uppercase; margin-bottom: 10px; }
.crown { font-size: 14px; color: #d4af37; letter-spacing: 8px; margin-bottom: 12px; }
.title { font-family: 'Cinzel Decorative', serif; font-size: 18px; font-weight: 700; background: linear-gradient(90deg, #8B6914, #d4af37, #f5e6a3, #d4af37, #8B6914); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px; line-height: 1.4; }
.sep-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.6), #d4af37, rgba(212,175,55,0.6), transparent); margin: 20px 0; }
main { text-align: center; padding: 8px 0 20px; }
.this-certifies { font-family: 'EB Garamond', serif; font-style: italic; font-size: 15px; color: rgba(212,175,55,0.6); margin-bottom: 14px; letter-spacing: 1px; }
.name { font-family: 'Cinzel Decorative', serif; font-size: 38px; font-weight: 700; background: linear-gradient(180deg, #f5e6a3, #d4af37); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 18px; line-height: 1.2; }
.for-excellence { font-family: 'EB Garamond', serif; font-size: 18px; color: rgba(245,230,163,0.8); max-width: 500px; margin: 0 auto; line-height: 1.7; font-style: italic; }
footer { display: flex; justify-content: space-between; align-items: flex-end; }
.sig-group { }
.sig { height: 38px; margin-bottom: 6px; filter: sepia(1) saturate(3) hue-rotate(30deg) opacity(0.7); }
.sig-rule { width: 150px; height: 1px; background: linear-gradient(90deg, #8B6914, #d4af37); margin-bottom: 6px; }
.sn { font-family: 'Cinzel', serif; font-size: 12px; color: #d4af37; }
.sd { font-family: 'EB Garamond', serif; font-style: italic; font-size: 12px; color: rgba(212,175,55,0.5); margin-top: 2px; }
.center-diamond { font-size: 36px; color: rgba(212,175,55,0.2); }
.info-group { text-align: right; }
.dt { font-family: 'Cinzel', serif; font-size: 11px; color: rgba(212,175,55,0.5); margin-bottom: 8px; letter-spacing: 1px; }
.qr { width: 52px; height: 52px; margin-bottom: 4px; filter: sepia(1) saturate(3) hue-rotate(30deg) opacity(0.4); }
.serial { font-size: 10px; color: rgba(212,175,55,0.25); font-family: monospace; letter-spacing: 1px; }`,
  },
  {
    id: "neon-pop",
    name: "Neon Pop",
    type: "achievement",
    description: "Bold neon pop-art style with vibrant color blocks",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><div class="block-top"></div><div class="block-right"></div><header><div class="left-head"><img src="{{logo_url}}" class="logo" alt=""/><div class="org-text"><p class="org">{{club_name}}</p><p class="sub-org">OFFICIAL CERTIFICATE</p></div></div><div class="cert-type-badge">ACHIEVEMENT</div></header><main><div class="name-section"><p class="awarded-to">awarded to</p><h1 class="name">{{member_name}}</h1></div><div class="ach-section"><div class="ach-tag">FOR</div><p class="ach">{{achievement}}</p></div></main><footer><div class="sig-area"><img src="{{signature_image}}" class="sig" alt=""/><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="qr-area"><img src="{{qr_code}}" class="qr" alt=""/><p class="date">{{date}}</p><p class="serial">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #111; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Space Grotesk', sans-serif; }
.cert { width: 860px; min-height: 570px; background: #0d0d0d; border: 2px solid #39ff14; padding: 44px 48px; position: relative; overflow: hidden; }
.block-top { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #39ff14, #00e5ff, #ff00ff, #ffff00, #39ff14); }
.block-right { position: absolute; top: 0; right: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #39ff14, #00e5ff, #ff00ff, #ffff00, #39ff14); }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px; }
.left-head { display: flex; align-items: center; gap: 14px; }
.logo { width: 52px; height: 52px; object-fit: contain; background: rgba(57,255,20,0.1); border: 1px solid #39ff14; border-radius: 8px; padding: 6px; }
.org { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 1px; }
.sub-org { font-family: 'Space Mono', monospace; font-size: 9px; color: #39ff14; letter-spacing: 3px; margin-top: 3px; }
.cert-type-badge { background: #39ff14; color: #000; font-size: 11px; font-weight: 700; letter-spacing: 3px; padding: 6px 14px; border-radius: 4px; }
main { margin-bottom: 40px; }
.name-section { border-left: 4px solid #39ff14; padding-left: 20px; margin-bottom: 28px; }
.awarded-to { font-family: 'Space Mono', monospace; font-size: 10px; color: #39ff14; letter-spacing: 3px; margin-bottom: 10px; text-transform: uppercase; }
.name { font-size: 50px; font-weight: 700; color: #fff; letter-spacing: -2px; line-height: 1.1; }
.ach-section { display: flex; align-items: flex-start; gap: 16px; }
.ach-tag { background: transparent; border: 1px solid #00e5ff; color: #00e5ff; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 2px; padding: 4px 8px; flex-shrink: 0; margin-top: 4px; }
.ach { font-size: 18px; font-weight: 300; color: rgba(255,255,255,0.8); line-height: 1.6; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(57,255,20,0.2); padding-top: 24px; }
.sig-area { }
.sig { height: 34px; margin-bottom: 6px; filter: invert(1) sepia(1) saturate(10) hue-rotate(80deg) opacity(0.7); }
.sn { font-size: 13px; font-weight: 700; color: #fff; }
.sd { font-size: 11px; color: rgba(57,255,20,0.6); font-family: 'Space Mono', monospace; margin-top: 2px; }
.qr-area { text-align: right; }
.qr { width: 52px; height: 52px; margin-bottom: 6px; filter: invert(1) sepia(1) saturate(10) hue-rotate(80deg) opacity(0.5); }
.date { font-size: 12px; color: rgba(57,255,20,0.5); margin-bottom: 3px; font-family: 'Space Mono', monospace; }
.serial { font-size: 10px; color: rgba(0,229,255,0.3); font-family: 'Space Mono', monospace; letter-spacing: 1px; }`,
  },
  {
    id: "monochrome-bold",
    name: "Monochrome Bold",
    type: "achievement",
    description: "High-impact black and white with massive typography",
    htmlContent: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Certificate</title></head><body><div class="cert"><header><div class="top-row"><div class="logo-unit"><img src="{{logo_url}}" class="logo" alt=""/></div><div class="title-unit"><p class="type">Certificate</p><h1 class="h1">of Achievement</h1></div></div><div class="big-rule"></div></header><main><div class="for-row"><span class="for-label">FOR</span><span class="for-line"></span></div><h2 class="name">{{member_name}}</h2><p class="ach">{{achievement}}</p></main><footer><div class="fb-left"><img src="{{signature_image}}" class="sig" alt=""/><p class="sn">{{signed_by_name}}</p><p class="sd">{{signed_by_designation}}</p></div><div class="fb-right"><p class="org">{{club_name}}</p><img src="{{qr_code}}" class="qr" alt=""/><p class="date">{{date}}</p><p class="serial">{{serial}}</p></div></footer></div></body></html>`,
    cssContent: `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'DM Sans', sans-serif; }
.cert { width: 860px; min-height: 560px; background: #fff; padding: 52px 60px; position: relative; box-shadow: 8px 8px 0 #111, 0 0 0 1px #111; }
header { margin-bottom: 0; }
.top-row { display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px; }
.logo-unit { width: 72px; height: 72px; border: 3px solid #111; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.logo { width: 52px; height: 52px; object-fit: contain; filter: grayscale(1); }
.title-unit { }
.type { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 4px; text-transform: uppercase; color: #555; margin-bottom: 4px; }
.h1 { font-family: 'Bebas Neue', sans-serif; font-size: 52px; color: #111; letter-spacing: 2px; line-height: 1; }
.big-rule { height: 4px; background: #111; margin-bottom: 36px; }
main { margin-bottom: 44px; }
.for-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.for-label { font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 4px; color: #555; flex-shrink: 0; }
.for-line { flex: 1; height: 1px; background: #ddd; }
.name { font-family: 'Bebas Neue', sans-serif; font-size: 64px; color: #111; letter-spacing: -1px; line-height: 1; margin-bottom: 20px; }
.ach { font-size: 18px; font-weight: 300; color: #444; line-height: 1.7; max-width: 560px; border-left: 4px solid #111; padding-left: 16px; }
footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #111; padding-top: 24px; }
.fb-left { }
.sig { height: 38px; margin-bottom: 8px; filter: grayscale(1); }
.sn { font-size: 14px; font-weight: 500; color: #111; }
.sd { font-size: 12px; color: #888; margin-top: 2px; }
.fb-right { text-align: right; }
.org { font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 2px; color: #555; margin-bottom: 10px; }
.qr { width: 52px; height: 52px; margin-bottom: 6px; filter: grayscale(1); }
.date { font-size: 12px; color: #888; margin-bottom: 2px; }
.serial { font-size: 10px; color: #bbb; font-family: monospace; }`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreviewHtml(htmlContent: string, cssContent: string): string {
  let filled = htmlContent;
  for (const [placeholder, sample] of Object.entries(SAMPLE_DATA)) {
    filled = filled.split(placeholder).join(sample);
  }

  // Inject CSS into head if it contains a <head> tag
  const hasHead = /<head[\s>]/i.test(filled);
  const styleTag = `<style>\n${cssContent}\n</style>`;

  if (hasHead) {
    return filled.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }

  // Wrap in a full document if no head
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styleTag}</head><body>${filled}</body></html>`;
}

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement>,
  text: string
): void {
  const el = ref.current;
  if (!el) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;

  const newValue =
    el.value.slice(0, start) + text + el.value.slice(end);

  // Trigger React's onChange by using native input value setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, newValue);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.value = newValue;
  }

  // Restore cursor position after the inserted text
  const newCursor = start + text.length;
  requestAnimationFrame(() => {
    el.selectionStart = newCursor;
    el.selectionEnd = newCursor;
    el.focus();
  });
}

// ─── LineNumbers ──────────────────────────────────────────────────────────────

interface LineNumbersProps {
  content: string;
  scrollTop: number;
  lineHeight: number;
  className?: string;
}

function LineNumbers({
  content,
  scrollTop,
  lineHeight,
  className,
}: LineNumbersProps): JSX.Element {
  const lineCount = (content.match(/\n/g)?.length ?? 0) + 1;

  return (
    <div
      className={cn(
        "select-none text-right pr-2 overflow-hidden",
        "text-[var(--color-text-secondary)] font-mono text-xs leading-5",
        "bg-[var(--color-bg-surface)] border-r border-[var(--color-border)]",
        className
      )}
      style={{
        paddingTop: "8px",
        lineHeight: `${lineHeight}px`,
        transform: `translateY(-${scrollTop}px)`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i} style={{ height: lineHeight }}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ─── CodeEditor ───────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string;
  onChange(value: string): void;
  label: string;
  height?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  id?: string;
}

function CodeEditor({
  value,
  onChange,
  label,
  height = 300,
  textareaRef,
  id,
}: CodeEditorProps): JSX.Element {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = textareaRef ?? internalRef;
  const [scrollTop, setScrollTop] = useState(0);
  const LINE_HEIGHT = 20;

  const handleScroll = useCallback(() => {
    const el = resolvedRef.current;
    if (el) {
      setScrollTop(el.scrollTop);
    }
  }, [resolvedRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle Tab key for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newValue =
          el.value.slice(0, start) + "  " + el.value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = start + 2;
          el.selectionEnd = start + 2;
        });
      }
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <div
        className={cn(
          "relative flex overflow-hidden rounded-lg border border-[var(--color-border)]",
          "bg-[var(--color-bg-base)] focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:border-[var(--color-accent)]"
        )}
        style={{ height }}
      >
        {/* Line numbers column */}
        <div
          className="overflow-hidden shrink-0"
          style={{ width: "36px", height: "100%" }}
        >
          <LineNumbers
            content={value}
            scrollTop={scrollTop}
            lineHeight={LINE_HEIGHT}
          />
        </div>

        {/* Textarea */}
        <textarea
          ref={resolvedRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          className={cn(
            "flex-1 resize-none overflow-auto",
            "bg-transparent text-[var(--color-text-primary)]",
            "font-mono text-xs leading-5",
            "p-2 focus:outline-none",
            "placeholder:text-[var(--color-text-secondary)]"
          )}
          style={{ height: "100%", lineHeight: `${LINE_HEIGHT}px` }}
        />
      </div>
    </div>
  );
}

// ─── PlaceholderDropdown ──────────────────────────────────────────────────────

interface PlaceholderDropdownProps {
  onInsert(placeholder: string): void;
}

function PlaceholderDropdown({ onInsert }: PlaceholderDropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
          "border border-[var(--color-border)]",
          "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}
      >
        Insert Placeholder
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform duration-150",
            open ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available placeholders"
          className={cn(
            "absolute left-0 top-full mt-1 z-50",
            "w-64 max-h-60 overflow-y-auto",
            "rounded-lg border border-[var(--color-border)]",
            "bg-[var(--color-bg-elevated)] shadow-lg",
            "py-1"
          )}
        >
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => {
                onInsert(p.key);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2",
                "hover:bg-[var(--color-bg-surface)]",
                "focus:outline-none focus:bg-[var(--color-bg-surface)]",
                "transition-colors duration-100"
              )}
            >
              <p className="text-xs font-mono text-[var(--color-accent)]">
                {p.key}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {p.label}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CertificateTemplateEditor ────────────────────────────────────────────────

export function CertificateTemplateEditor({
  initialData,
  onSubmit,
  onClose,
}: CertificateTemplateEditorProps): JSX.Element {
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "participation");
  const [htmlContent, setHtmlContent] = useState(
    initialData?.htmlContent ?? DEFAULT_HTML
  );
  const [cssContent, setCssContent] = useState(() => {
    const raw = initialData?.cssContent ?? DEFAULT_CSS;
    // Strip auto-generated watermark CSS so it doesn't show in editor
    const watermarkIndex = raw.indexOf("/* ── Logo Watermark (auto-generated) ── */");
    return watermarkIndex > -1 ? raw.slice(0, watermarkIndex).trimEnd() : raw;
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [logoWatermark, setLogoWatermark] = useState(() => {
    return (initialData?.cssContent ?? "").includes("Logo Watermark (auto-generated)");
  });
  const [watermarkOpacity, setWatermarkOpacity] = useState(() => {
    const match = (initialData?.cssContent ?? "").match(/opacity: ([\d.]+) !important/);
    return match ? Math.round(parseFloat(match[1]) * 100) : 8;
  });
  const [watermarkSize, setWatermarkSize] = useState(() => {
    const match = (initialData?.cssContent ?? "").match(/width: (\d+)px !important/);
    return match ? parseInt(match[1]) : 300;
  });

  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── buildFinalCss must be declared BEFORE hooks that depend on it ──
  const buildFinalCss = useCallback((baseCss: string, resolvedLogoUrl?: string): string => {
    if (!logoWatermark) return baseCss;
    // Use the resolved logo URL if provided (for preview), otherwise keep the placeholder (for saved CSS)
    const logoValue = resolvedLogoUrl ?? "{{logo_url}}";
    const watermarkCss = `
/* ── Logo Watermark (auto-generated) ── */
body, .certificate, .cert, body > div:first-of-type {
  position: relative !important;
}
body::after, .certificate::before, .cert::before, body > div:first-of-type::before {
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: ${watermarkSize}px !important;
  height: ${watermarkSize}px !important;
  background-image: url("${logoValue}") !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  opacity: ${watermarkOpacity / 100} !important;
  pointer-events: none !important;
  z-index: 0 !important;
}`;
    return baseCss + watermarkCss;
  }, [logoWatermark, watermarkOpacity, watermarkSize]);

  // Update preview with debounce whenever content changes
  useEffect(() => {
    if (!previewVisible) return;

    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    previewDebounceRef.current = setTimeout(() => {
      setPreviewSrc(buildPreviewHtml(htmlContent, buildFinalCss(cssContent, SAMPLE_DATA["{{logo_url}}"])));
    }, 500);

    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, [htmlContent, cssContent, previewVisible, buildFinalCss]);

  // Build preview immediately when toggled on
  const handleTogglePreview = useCallback(() => {
    setPreviewVisible((prev) => {
      if (!prev) {
        setPreviewSrc(buildPreviewHtml(htmlContent, buildFinalCss(cssContent, SAMPLE_DATA["{{logo_url}}"])));
      }
      return !prev;
    });
  }, [htmlContent, cssContent, buildFinalCss]);

  const handleInsertPlaceholder = useCallback(
    (placeholder: string) => {
      // Determine which editor is focused or default to HTML
      const activeElement = document.activeElement;
      const isHtmlFocused = htmlRef.current === activeElement;
      const isCssFocused = cssRef.current === activeElement;

      if (isCssFocused) {
        insertAtCursor(cssRef as React.RefObject<HTMLTextAreaElement>, placeholder);
      } else {
        // Default to HTML editor
        if (htmlRef.current) {
          htmlRef.current.focus();
        }
        insertAtCursor(htmlRef as React.RefObject<HTMLTextAreaElement>, placeholder);
      }
    },
    []
  );

  const handleHtmlChange = useCallback((value: string) => {
    setHtmlContent(value);
  }, []);

  const handleCssChange = useCallback((value: string) => {
    setCssContent(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate
    setNameError(null);
    setSubmitError(null);

    if (!name.trim()) {
      setNameError("Template name is required.");
      return;
    }

    if (!htmlContent.trim()) {
      setSubmitError("HTML content cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        htmlContent,
        cssContent: buildFinalCss(cssContent),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save template.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, type, htmlContent, cssContent, onSubmit]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-surface)] rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4",
          "border-b border-[var(--color-border)]",
          "bg-[var(--color-bg-elevated)] shrink-0"
        )}
      >
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {initialData?.id ? "Edit Certificate Template" : "New Certificate Template"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePreview}
            aria-pressed={previewVisible}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              "border transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              previewVisible
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/30"
                : "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {previewVisible ? (
              <EyeOff size={14} aria-hidden="true" />
            ) : (
              <Eye size={14} aria-hidden="true" />
            )}
            {previewVisible ? "Hide Preview" : "Show Preview"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className={cn(
              "rounded-lg p-1.5 text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Editors ── */}
        <div
          className={cn(
            "flex flex-col gap-4 overflow-y-auto p-5",
            "border-r border-[var(--color-border)]",
            previewVisible ? "w-1/2" : "w-full"
          )}
          style={{ transition: "width 0.2s ease" }}
        >
          {/* Starter Templates */}
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
              Start from a starter template:
            </p>
            <div className="flex gap-2 flex-wrap">
              {STARTER_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.description}
onClick={() => {
setName(t.name);
setType(t.type);
setHtmlContent(t.htmlContent);
setCssContent(t.cssContent);
if (previewVisible) {
setPreviewSrc(buildPreviewHtml(t.htmlContent, buildFinalCss(t.cssContent, SAMPLE_DATA["{{logo_url}}"])));
}
}}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
                    "border-[var(--color-border)] text-[var(--color-text-secondary)]",
                    "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Watermark Toggle */}
          <div
            className={cn(
              "rounded-xl border p-4 transition-all duration-200",
              logoWatermark
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5"
                : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={logoWatermark}
                  onClick={() => setLogoWatermark((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
                    logoWatermark
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--color-bg-base)] border border-[var(--color-border)]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                      logoWatermark ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Club Logo Watermark
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Shows the club logo as a faint background watermark on the certificate
                  </p>
                </div>
              </div>
              {logoWatermark && (
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                    "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/25"
                  )}
                >
                  ON
                </span>
              )}
            </div>

            {/* Controls shown only when ON */}
            {logoWatermark && (
              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-accent)]/20">
                {/* Opacity slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Opacity
                    </label>
                    <span className="text-xs font-mono text-[var(--color-accent)]">
                      {watermarkOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className={cn(
                      "w-full h-1.5 rounded-full appearance-none cursor-pointer",
                      "bg-[var(--color-bg-base)] accent-[var(--color-accent)]"
                    )}
                    style={{
                      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((watermarkOpacity - 2) / 28) * 100}%, var(--color-bg-base) ${((watermarkOpacity - 2) / 28) * 100}%, var(--color-bg-base) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-[var(--color-text-secondary)] opacity-50">Subtle</span>
                    <span className="text-xs text-[var(--color-text-secondary)] opacity-50">Bold</span>
                  </div>
                </div>

                {/* Size slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Size
                    </label>
                    <span className="text-xs font-mono text-[var(--color-accent)]">
                      {watermarkSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={600}
                    step={20}
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((watermarkSize - 100) / 500) * 100}%, var(--color-bg-base) ${((watermarkSize - 100) / 500) * 100}%, var(--color-bg-base) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-[var(--color-text-secondary)] opacity-50">Small</span>
                    <span className="text-xs text-[var(--color-text-secondary)] opacity-50">Large</span>
                  </div>
                </div>

                {/* Preview hint */}
                <div className="col-span-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                      "bg-[var(--color-bg-base)] border border-[var(--color-border)]",
                      "text-[var(--color-text-secondary)]"
                    )}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M6 5.5v3M6 4h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    The watermark uses <code className="font-mono text-[var(--color-accent)] mx-1">{"{{logo_url}}"}</code> — enable preview to see the effect live.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Template Name"
              id="cert-template-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Participation Certificate 2026"
              error={nameError ?? undefined}
              required
            />
            <Select
              label="Template Type"
              id="cert-template-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={TEMPLATE_TYPES.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
          </div>

          {/* Placeholder toolbar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Insert into editor:
            </span>
            <PlaceholderDropdown onInsert={handleInsertPlaceholder} />
          </div>

          {/* HTML Editor */}
          <CodeEditor
            id="cert-html-editor"
            label="HTML Template"
            value={htmlContent}
            onChange={handleHtmlChange}
            height={300}
            textareaRef={htmlRef as React.RefObject<HTMLTextAreaElement>}
          />

          {/* CSS Editor */}
          <CodeEditor
            id="cert-css-editor"
            label="CSS Styles"
            value={cssContent}
            onChange={handleCssChange}
            height={180}
            textareaRef={cssRef as React.RefObject<HTMLTextAreaElement>}
          />

          {/* Placeholder reference */}
          <details className="group">
            <summary
              className={cn(
                "cursor-pointer text-xs font-medium text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-text-primary)] transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
              )}
            >
              Available Placeholder Variables
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <div
                  key={p.key}
                  className={cn(
                    "rounded-md px-2 py-1.5",
                    "bg-[var(--color-bg-base)] border border-[var(--color-border)]"
                  )}
                >
                  <p className="text-xs font-mono text-[var(--color-accent)] truncate">
                    {p.key}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                    {p.label}
                  </p>
                </div>
              ))}
            </div>
          </details>

          {/* Error display */}
          {submitError && (
            <Alert
              variant="error"
              message={submitError}
              dismissible
              onDismiss={() => setSubmitError(null)}
            />
          )}
        </div>

        {/* ── Right Panel: Preview ── */}
        {previewVisible && (
          <div className="flex flex-col w-1/2 overflow-hidden">
            <div
              className={cn(
                "shrink-0 px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)]",
                "bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]",
                "flex items-center gap-2"
              )}
            >
              <Eye size={12} aria-hidden="true" />
              Live Preview — sample data applied
            </div>
            <div className="flex-1 overflow-hidden bg-[var(--color-bg-base)]">
              {previewSrc ? (
                <iframe
                  title="Certificate Preview"
                  srcDoc={previewSrc}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                  aria-label="Certificate template preview with sample data"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Spinner size="md" label="Building preview…" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-end gap-3 px-5 py-4",
          "border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium",
            "text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)]",
            "border border-[var(--color-border)]",
            "hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
            "hover:brightness-110 active:brightness-95",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" label="Saving…" />
              Saving…
            </>
          ) : (
            <>
              <Save size={14} aria-hidden="true" />
              {initialData?.id ? "Save Changes" : "Create Template"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}