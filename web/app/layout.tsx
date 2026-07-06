import type { Metadata } from "next";
import "./globals.css";
import { Masthead } from "@/components/Masthead";

export const metadata: Metadata = {
  title: "Athena · Enterprise Decision Intelligence",
  description:
    "Turning organizational data into strategic recommendations. Placement Intelligence module.",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Libre+Caslon+Display&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="min-h-screen">
        <Masthead />
        <main className="mx-auto max-w-[1080px] px-6 pb-32 pt-12 md:px-10">
          {children}
        </main>
      </body>
    </html>
  );
}
