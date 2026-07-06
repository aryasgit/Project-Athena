import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Athena — Enterprise Decision Intelligence",
  description:
    "Turning organizational data into strategic recommendations. Placement Intelligence module.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-[1180px] px-6 py-8 md:px-10 md:py-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
