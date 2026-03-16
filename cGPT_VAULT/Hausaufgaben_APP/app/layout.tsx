import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr. DirKInstitute LernTutor",
  description:
    "Ein digitaler LernTutor fuer Klassen 5 bis 13 mit Fachauswahl, Schulart, Lernmodi und Schritt-fuer-Schritt-Begleitung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
