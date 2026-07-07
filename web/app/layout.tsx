import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { StatusBar } from "@/components/StatusBar";
import { WordmarkFooter } from "@/components/WordmarkFooter";

export const metadata: Metadata = {
  title: "Athena · Enterprise Decision Intelligence",
  description:
    "Turning organizational data into strategic recommendations. Placement Intelligence module.",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-[1320px] px-5 pb-4 pt-10 md:px-10 md:pt-16">
          {children}
        </main>
        <WordmarkFooter />
        <StatusBar />
      </body>
    </html>
  );
}
