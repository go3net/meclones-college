import type { MetadataRoute } from "next";
import { getSchoolPublic } from "@/lib/tenant";

/**
 * PWA manifest — drives the "Add to home screen" prompt + how the
 * installed app looks (standalone window, no browser chrome).
 *
 * Next.js serves this at /manifest.webmanifest with the right Content-Type
 * automatically. The matching icon convention lives at app/icon.svg.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const school = await getSchoolPublic();
  return {
    name: `${school.name} Portal`,
    short_name: school.shortName,
    description: `Parents, teachers and students sign in to ${school.name} for results, fees, attendance, messages and more.`,
    start_url: "/portal/me",
    scope: "/",
    display: "standalone",
    background_color: "#0B1F4B",
    theme_color: "#0B1F4B",
    orientation: "portrait",
    categories: ["education"],
    lang: "en-NG",
    dir: "ltr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Sign in",
        url: "/portal/login",
        description: "Open the parent / teacher / student portal",
      },
      {
        name: "Admissions",
        url: "/admission",
        description: "Apply for a place at the school",
      },
      {
        name: "Contact",
        url: "/contact",
        description: "Reach the school office",
      },
    ],
  };
}
