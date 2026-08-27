import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VedaAI – AI Teacher's Toolkit",
  description: "Upload question papers and answer sheets, extract questions and answers, map them automatically, and grade with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
