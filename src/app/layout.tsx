import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { NavigationProgress } from "@/components/NavigationProgress";
import { PageTransition } from "@/components/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";
import { AxeDevTools } from "@/components/AxeDevTools";
import { WebVitals } from "@/components/WebVitals";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DEFAULT_THEME } from "@/lib/theme-constants";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gitinsight.app",
  ),
  title: {
    default: "GitInsight",
    template: "%s | GitInsight",
  },
  description:
    "Visualize GitHub profiles, contributions, languages, stars, and activity streaks in a clean, GitHub-inspired dashboard.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "GitInsight",
    title: "GitInsight",
    description:
      "Visualize GitHub profiles, contributions, languages, stars, and activity streaks in a clean, GitHub-inspired dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitInsight",
    description:
      "Visualize GitHub profiles, contributions, languages, stars, and activity streaks.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: "/icons/mark-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2da44e",
  width: "device-width",
  initialScale: 1,
};

const isDev = process.env.NODE_ENV === "development";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} app-shell ${DEFAULT_THEME} h-dvh max-h-dvh min-h-0 overflow-hidden${isDev ? " debug-screens" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://api.github.com" />
        <link rel="preconnect" href="https://avatars.githubusercontent.com" crossOrigin="anonymous" />
      </head>
      <body className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gh-gray-0 font-sans antialiased">
        <ThemeProvider defaultTheme={DEFAULT_THEME} enableSystem={false}>
          <ToastProvider>
            <AxeDevTools />
            <NavigationProgress />
            <WebVitals />
            <SiteHeader />
            <main className="app-main flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-hidden">
              <PageTransition>{children}</PageTransition>
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
