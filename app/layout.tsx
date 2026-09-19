import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaCoach — Speak. Learn. Improve.",
  description: "Voice-first AI language coaching for natural conversation practice.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
