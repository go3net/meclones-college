import "./globals.css";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(SCHOOL.website),
  title: {
    default: `${SCHOOL.name} — ${SCHOOL.tagline}`,
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
