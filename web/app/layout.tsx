import type { Metadata } from "next";
import "./globals.css";
import { TopologyField } from "@/components/TopologyField";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "ATHENA // Organizational Digital Twin",
  description:
    "Signal over noise. A living systems observatory — create a company, run the simulation, and watch an organization evolve through thousands of interacting decisions.",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="min-h-screen">
        {/* the living system, ambient */}
        <TopologyField className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-70" />
        <SmoothScroll>{children}</SmoothScroll>
        <div className="scanlines" aria-hidden />
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
