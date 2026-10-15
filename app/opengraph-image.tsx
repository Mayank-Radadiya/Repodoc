import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static social card for the landing page (og:image / twitter:image). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "36px",
            fontWeight: 700,
            color: "#0F172A",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#005FD6",
            }}
          />
          {site.name}
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "62px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "#020617",
          }}
        >
          Repository Intelligence &amp; Automated Health Remediation
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "28px",
            color: "#475569",
          }}
        >
          100-point health audit · dynamic badge · 1-click atomic PR
        </div>
        <div
          style={{
            marginTop: "auto",
            width: "160px",
            height: "8px",
            background: "#005FD6",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
