import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/src/app/components/ui/site-header";
import { ThingiverseAuthProvider } from './contexts/ThingiverseAuthContext';
import {PrintablesAuthProvider} from "@/src/app/contexts/PrintablesAuthContext";
import {MakerWorldAuthProvider} from "@/src/app/contexts/MakerWorldAuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PubMan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThingiverseAuthProvider><PrintablesAuthProvider><MakerWorldAuthProvider>
          <div className="flex w-screen flex-row md:flex-row">
              <SiteHeader />
          </div>
          <div className="flex-grow p-6 md:px-12">{children}</div>
        </MakerWorldAuthProvider></PrintablesAuthProvider></ThingiverseAuthProvider>
      </body>
    </html>
  );
}