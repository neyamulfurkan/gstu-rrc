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
        foundedYear: true,
      },
    })
    .catch(() => null);

  const clubName = config?.clubName ?? "GSTU Robotics & Research Club";
  const clubShort = config?.clubShortName ?? "GSTU RRC";
  const motto = config?.clubMotto ?? "Innovate. Build. Inspire.";
  const university =
    config?.universityName ?? "Gopalganj Science and Technology University";
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
        {/* top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(to right, #0050FF, #00E5FF, transparent)",
            display: "flex",
          }}
        />

        {/* background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(0,229,255,0.08)",
            display: "flex",
          }}
        />

        {/* main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#00E5FF",
                marginRight: "8px",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                color: "#00E5FF",
                letterSpacing: "0.2em",
                fontWeight: 600,
              }}
            >
              Est. {year} - Robotics & Research
            </span>
          </div>

          {/* short name */}
          <div
            style={{
              display: "flex",
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

          {/* full name */}
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              fontWeight: 600,
              color: "#7B8DB0",
              marginBottom: "20px",
            }}
          >
            {clubName}
          </div>

          {/* motto */}
          <div
            style={{
              display: "flex",
              fontSize: "18px",
              color: "#00E5FF",
              fontStyle: "italic",
              marginBottom: "32px",
            }}
          >
            {motto}
          </div>

          {/* university */}
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              color: "#4A5568",
            }}
          >
            {university}
          </div>
        </div>

        {/* bottom decoration */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "80px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "#00E5FF",
              opacity: 0.3,
              marginRight: "6px",
              display: "flex",
            }}
          />
          <div
            style={{
              width: "20px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "#00E5FF",
              opacity: 0.6,
              marginRight: "6px",
              display: "flex",
            }}
          />
          <div
            style={{
              width: "40px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "#00E5FF",
              opacity: 1,
              marginRight: "6px",
              display: "flex",
            }}
          />
          <div
            style={{
              width: "20px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "#00E5FF",
              opacity: 0.6,
              marginRight: "6px",
              display: "flex",
            }}
          />
          <div
            style={{
              width: "8px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "#00E5FF",
              opacity: 0.3,
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}