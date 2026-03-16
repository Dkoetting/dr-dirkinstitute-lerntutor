import { LernTutorApp } from "@/components/lerntutor-app";
import { lernTutorConfig } from "@/lib/lerntutor-config";

export default function HomePage() {
  return <LernTutorApp config={lernTutorConfig} />;
}
