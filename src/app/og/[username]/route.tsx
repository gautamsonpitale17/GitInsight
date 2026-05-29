import { ImageResponse } from "next/og";
import { OG_EXPLORE_HOST } from "@/lib/app-url";
import { fetchOgDashboardData } from "@/lib/og-data";
import { loadInterFonts } from "@/lib/og-fonts";
import { OG_HEATMAP_COLORS } from "@/lib/og-heatmap";
import { formatCount } from "@/lib/format";
import type { HeatmapLevel } from "@/types/github";

export const runtime = "nodejs";
export const revalidate = 300;

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
  canvas: "#ffffff",
  fg: "#24292f",
  muted: "#656d76",
  border: "#d0d7de",
  green: "#2da44e",
  greenText: "#1a7f37",
  statBg: "#f6f8fa",
} as const;

type RouteContext = {
  params: Promise<{ username: string }>;
};

function GitInsightLogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill={COLORS.green} />
      <path
        fill="#ffffff"
        d="M16 7c-4.2 0-7.6 3.1-7.6 7.4 0 3.3 2.1 6.1 5 7.1.4.1.5-.2.5-.4v-1.4c-2 .4-2.4-1-2.4-1-.3-.8-.8-1-.8-1-.6-.4.1-.4.1-.4.7 0 1 .7 1 .7.6 1.1 1.7.8 2.1.6.1-.5.2-1 .4-1.2-1.6-.2-3.3-.8-3.3-3.6 0-.8.3-1.4.7-1.9-.1-.2-.3-1 .1-2.1 0 0 .6-.2 2 .7.6-.2 1.2-.3 1.8-.3s1.2.1 1.8.3c1.4-.9 2-.7 2-.7.4 1.1.2 1.9.1 2.1.5.5.7 1.1.7 1.9 0 2.8-1.7 3.4-3.3 3.6.3.2.5.7.5 1.4v2.1c0 .2.1.5.5.4 2.9-1 5-3.8 5-7.1C23.6 10.1 20.2 7 16 7Z"
      />
      <path
        fill="#ffffff"
        fillOpacity="0.9"
        d="M10 24.5c-.6.4-1.2.7-1.2 1.2 0 .6.7.6 1.5.6.8 0 1.6-.2 2.2-.5.5-.3 1-.7 1.4-1.1.4.4.9.8 1.4 1.1.6.3 1.4.5 2.2.5.8 0 1.5 0 1.5-.6 0-.5-.6-.8-1.2-1.2-2.4-1.7-3.8-1.4-4.8-1.4s-2.4-.3-4.8 1.4Z"
      />
    </svg>
  );
}

function HeatmapPreviewGrid({ preview }: { preview: HeatmapLevel[][] }) {
  const weeks = preview[0]?.length ?? 12;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 4,
      }}
    >
      {Array.from({ length: weeks }, (_, weekIndex) => (
        <div
          key={weekIndex}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const level = preview[dayIndex]?.[weekIndex] ?? 0;
            return (
              <div
                key={dayIndex}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: OG_HEATMAP_COLORS[level],
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function OgStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "16px 20px",
        backgroundColor: COLORS.statBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        minWidth: 140,
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: 14,
          color: COLORS.muted,
          fontWeight: 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginTop: 6,
          fontSize: 32,
          fontWeight: 700,
          color: COLORS.fg,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;
  const login = decodeURIComponent(username).trim();

  if (!login) {
    return new Response("Missing username", { status: 400 });
  }

  const [data, fonts] = await Promise.all([fetchOgDashboardData(login), loadInterFonts()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.canvas,
          fontFamily: "Inter",
          color: COLORS.fg,
          padding: "44px 48px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <GitInsightLogoMark size={44} />
          <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.fg }}>GitInsight</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            marginTop: 36,
            gap: 32,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 24,
              minWidth: 360,
            }}
          >
            <img
              src={data.avatarUrl}
              alt=""
              width={120}
              height={120}
              style={{
                borderRadius: 60,
                border: `3px solid ${COLORS.border}`,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>
                {data.displayName}
              </span>
              <span style={{ fontSize: 24, color: COLORS.muted, fontWeight: 400 }}>
                @{data.login}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 14,
              flex: 1,
            }}
          >
            <OgStatCard label="Repos" value={formatCount(data.repos)} />
            <OgStatCard label="Stars" value={formatCount(data.stars)} />
            <OgStatCard label="Streak" value={formatCount(data.streak)} />
            <OgStatCard label="Languages" value={formatCount(data.languages)} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 28,
          }}
        >
          <HeatmapPreviewGrid preview={data.heatmapPreview} />
          <span style={{ fontSize: 14, color: COLORS.muted, fontWeight: 400 }}>
            Last 12 weeks of push activity
          </span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <span style={{ fontSize: 20, color: COLORS.greenText, fontWeight: 600 }}>
            Explore on {OG_EXPLORE_HOST}
          </span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
