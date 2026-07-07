import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";

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
      <body className="min-h-screen md:pl-[214px]">
        <Sidebar />
        <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 md:px-10 md:pt-12">
          {children}
        </main>
        <StatusBar />
      </body>
    </html>
  );
}
