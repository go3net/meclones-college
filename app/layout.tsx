import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import { SCHOOL } from "@/lib/constants";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "500", "600", "700", "800"],
});

// Hosts that should render with the SchoolBot SaaS brand instead of
// the Meclones school brand. Kept in sync with middleware.ts —
// changes here without changes there (or vice versa) cause titles
// and routing to disagree, which is exactly the kind of subtle bug
// that's hard to spot in production.
const SCHOOLBOT_HOSTS = new Set(["schoolbot.com.ng", "www.schoolbot.com.ng"]);

/**
 * Host-aware metadata. Same Next.js app serves two brands from one
 * deployment (Meclones the school + SchoolBot the SaaS), so the
 * <title>, OpenGraph, keywords, and PWA hints all need to flip
 * based on which domain the request arrived on.
 *
 * Without this, schoolbot.com.ng/ would still emit titles like
 * "Your school runs on WhatsApp · Meclones College Lekki" — the
 * "· Meclones" template suffix was leaking SchoolBot's brand
 * into a school-specific tail. The whole metadata block is now
 * computed per-request from the host header.
 */
export async function generateMetadata(): Promise<Metadata> {
  const host = (headers().get("host") ?? "").toLowerCase().split(":")[0];
  const isSchoolbot = SCHOOLBOT_HOSTS.has(host);

  if (isSchoolbot) {
    const SBOT_URL = "https://schoolbot.com.ng";
    return {
      metadataBase: new URL(SBOT_URL),
      title: {
        default:  "SchoolBot — WhatsApp school management for Nigerian secondary schools",
        template: "%s · SchoolBot",
      },
      description: "The only school management product Nigerian parents and teachers don't have to learn. Everything happens in WhatsApp — payments, results, attendance, scores, messaging. The portal stays behind, for admin work.",
      keywords: [
        "school management software Nigeria",
        "WhatsApp school management",
        "Paystack school fees",
        "school portal Nigeria",
        "Nigerian secondary school SaaS",
        "SchoolBot",
      ],
      openGraph: {
        type: "website",
        locale: "en_NG",
        url: SBOT_URL,
        siteName: "SchoolBot",
        title: "SchoolBot — WhatsApp school management for Nigerian secondary schools",
        description: "Parents pay fees, check results, message teachers — all from WhatsApp. The admin portal stays behind for the work that needs a screen.",
      },
      twitter: { card: "summary_large_image" },
      manifest: "/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        title: "SchoolBot",
        statusBarStyle: "black-translucent",
      },
      applicationName: "SchoolBot",
    };
  }

  // Default — Meclones school brand. Identical to the previous
  // static export, just lifted into the host-aware generator so
  // both branches live in one place.
  return {
    metadataBase: new URL(SCHOOL.website),
    title: {
      default:  `${SCHOOL.name} — ${SCHOOL.tagline}`,
      template: `%s · ${SCHOOL.name}`,
    },
    description: `${SCHOOL.name} is a premier private secondary school in Lekki, Lagos. We nurture values, ignite potential, and prepare students for lifelong success across JSS 1–3, SS 1–3 and top-tier exam preparation.`,
    keywords: ["Meclones College Lekki", "secondary school Lagos", "school in Lekki", "JSS SSS Lagos", "WAEC NECO JAMB SAT TOEFL prep"],
    openGraph: {
      type: "website",
      locale: "en_NG",
      url: SCHOOL.website,
      siteName: SCHOOL.name,
      title: `${SCHOOL.name} — ${SCHOOL.tagline}`,
      description: `Raising confident, responsible students at ${SCHOOL.name}.`,
    },
    twitter: { card: "summary_large_image" },
    // PWA niceties — manifest is auto-resolved from app/manifest.ts; the
    // appleWebApp block makes iOS Safari treat the installed app properly.
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: SCHOOL.shortName,
      statusBarStyle: "black-translucent",
    },
    applicationName: `${SCHOOL.shortName} Portal`,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B1F4B" },
    { media: "(prefers-color-scheme: dark)",  color: "#0B1F4B" },
  ],
  width: "device-width",
  initialScale: 1,
  // Prevent iOS auto-zoom on input focus; doesn't disable user pinch-zoom.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
