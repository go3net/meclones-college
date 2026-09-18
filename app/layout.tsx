import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import { PLATFORM_ROOT_DOMAIN, isPlatformHost } from "@/lib/host-utils";
import { getSchoolPublic } from "@/lib/tenant";
import { Providers } from "@/components/Providers";
import { SchoolProvider } from "@/components/SchoolProvider";

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
/** Metadata must never be able to take a page down over a bad address. */
function safeUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    return new URL(`https://${PLATFORM_ROOT_DOMAIN}`);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  // Same check middleware.ts uses (lib/host-utils.ts), so titles and
  // routing can never disagree about which host is the platform.
  const isSchoolbot = isPlatformHost(headers().get("host"));

  if (isSchoolbot) {
    const SBOT_URL = `https://${PLATFORM_ROOT_DOMAIN}`;
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

  // A school's own brand, resolved from the request host.
  const school = await getSchoolPublic();
  const tagline = school.tagline ? ` — ${school.tagline}` : "";
  return {
    // The host we serve, never a PORTAL-only school's own website.
    metadataBase: safeUrl(school.portalUrl),
    title: {
      default:  `${school.name}${tagline}`,
      template: `%s · ${school.name}`,
    },
    description: `${school.name} is a private secondary school in Nigeria. We nurture values, ignite potential, and prepare students for lifelong success across JSS 1–3, SS 1–3 and top-tier exam preparation.`,
    keywords: [school.name, "secondary school Nigeria", "school portal", "JSS SSS", "WAEC NECO JAMB prep"],
    openGraph: {
      type: "website",
      locale: "en_NG",
      url: school.website,
      siteName: school.name,
      title: `${school.name}${tagline}`,
      description: `Raising confident, responsible students at ${school.name}.`,
    },
    twitter: { card: "summary_large_image" },
    // PWA niceties — manifest is auto-resolved from app/manifest.ts; the
    // appleWebApp block makes iOS Safari treat the installed app properly.
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: school.shortName,
      statusBarStyle: "black-translucent",
    },
    applicationName: `${school.shortName} Portal`,
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved once per request from the host; client components read it
  // through useSchool(), server code through getSchoolPublic().
  const school = await getSchoolPublic();
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <SchoolProvider school={school}>
          <Providers>{children}</Providers>
        </SchoolProvider>
      </body>
    </html>
  );
}
