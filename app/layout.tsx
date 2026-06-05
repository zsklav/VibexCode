import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "./store/provider";
import RouteProgress from "./components/RouteProgress";
import AuthGuard from "./components/AuthGuard";
import GlobalAIOrb from "./components/GlobalAIOrb";

// Load Geist for main text
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono for code blocks
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://vibexcode.netlify.app";
const SITE_NAME = "VibeXcode";
const SITE_TITLE = "VibeXcode — A collaborative way to vibe and code";
const SITE_DESCRIPTION =
  "VibeXcode is a developer community platform with real-time forum chat, a multi-language code playground powered by Judge0, leaderboards, and a collaborative Q&A.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · VibeXcode",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "VibeXcode",
    "coding playground",
    "collaborative coding",
    "developer community",
    "code execution",
    "Judge0",
    "real-time chat",
    "leaderboard",
    "competitive programming",
    "Next.js",
  ],
  authors: [{ name: "VibeXcode" }],
  creator: "VibeXcode",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased text-slate-100 min-h-screen bg-[#05070d]">
        {/* Global app background — dark gradient + glow + grid, fixed behind every page */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#070a13_0%,#090c16_45%,#05070d_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,229,255,0.18),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(139,92,246,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.11),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        <RouteProgress />
        <ReduxProvider>
          <AuthGuard>
            <div className="relative z-10 flex flex-col min-h-screen">
              {children}
            </div>
            <GlobalAIOrb />
          </AuthGuard>
        </ReduxProvider>
      </body>
    </html>
  );
}
