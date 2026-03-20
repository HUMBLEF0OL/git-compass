import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Git Compass Dashboard",
  description: "Local-first Git analytics dashboard",
};

import { SettingsProvider } from "@/context/SettingsContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SettingsProvider>
          <div className="flex h-screen overflow-hidden text-foreground">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-background p-8">
              {children}
            </main>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
