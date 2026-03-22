// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const revalidate = 3600;
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export default async function OgImage(): Promise<ImageResponse> {
  const config = await prisma.clubConfig
    .findUnique({
      where: { id: "main" },
      select: {
        clubName: true,
        clubShortName: true,
        clubMotto: true,
        universityName: true,
        ogImageUrl: true,
        foundedYear: true,
      },
    })
    .catch(() => null);

  // If a custom OG image URL is configured, use it directly
  if (config?.ogImageUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#060B14",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.ogImageUrl}
            alt={config.clubName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const clubName = config?.clubName ?? "GSTU Robotics & Research Club";
  const clubShort = config?.clubShortName ?? "GSTU RRC";
  const motto = config?.clubMotto ?? "Innovate. Build. Inspire.";
  const university = config?.universityName ?? "Gopalganj Science and Technology University";
  const year = config?.foundedYear ?? 2020;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#060B14",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(0,80,255,0.18) 0%, transparent 60%)",
          }}
        />

        {/* Accent glow top right */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(0,229,255,0.08)",
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background:
              "linear-gradient(to right, #0050FF, #00E5FF, transparent)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Founded badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#00E5FF",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                color: "#00E5FF",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Est. {year} · Robotics & Research
            </span>
          </div>

          {/* Club short name */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "#F0F4FF",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              marginBottom: "12px",
            }}
          >
            {clubShort}
          </div>

          {/* Full club name */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#7B8DB0",
              lineHeight: 1.3,
              marginBottom: "20px",
              maxWidth: "700px",
            }}
          >
            {clubName}
          </div>

          {/* Motto */}
          <div
            style={{
              fontSize: "18px",
              color: "#00E5FF",
              fontStyle: "italic",
              marginBottom: "32px",
            }}
          >
            &ldquo;{motto}&rdquo;
          </div>

          {/* University */}
          <div
            style={{
              fontSize: "14px",
              color: "#4A5568",
              letterSpacing: "0.05em",
              maxWidth: "600px",
            }}
          >
            {university}
          </div>
        </div>

        {/* Bottom right decoration */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "80px",
            display: "flex",
            gap: "6px",
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: i === 3 ? "40px" : i === 2 || i === 4 ? "20px" : "8px",
                height: "3px",
                borderRadius: "2px",
                backgroundColor: "#00E5FF",
                opacity: i === 3 ? 1 : i === 2 || i === 4 ? 0.6 : 0.3,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}