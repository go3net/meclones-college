import { notFound } from "next/navigation";
import { SAMPLE_SCHOOLS, getSampleSchool } from "../data";
import { SampleBanner } from "./SampleBanner";
import { ThemedHeader, ThemedFooter } from "./ThemedChrome";

// Pre-render the three sample sites at build time.
export function generateStaticParams() {
  return SAMPLE_SCHOOLS.map(s => ({ school: s.slug }));
}

export async function generateMetadata({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) return { title: "Sample school" };
  return {
    title: `${school.name} — sample school website`,
    description: `${school.tagline}. Sample design — your school's site would be custom-built for your brand.`,
  };
}

export default function SampleSchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { school: string };
}) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <div
      className={`min-h-screen flex flex-col ${school.theme.bodyClass}`}
      style={{ backgroundColor: school.theme.bg, color: school.theme.text }}
    >
      <SampleBanner schoolName={school.name} />
      <ThemedHeader school={school} />
      <main className="flex-1">{children}</main>
      <ThemedFooter school={school} />
    </div>
  );
}
