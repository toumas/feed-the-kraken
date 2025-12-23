import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { GameProvider } from "../context/GameContext";
import { languages } from "../i18n/settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Feed The Kraken",
  description: "Companion app for Feed The Kraken board game",
};

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}

export default async function LngLayout({ children, params }: LayoutProps) {
  const { lng } = await params;

  return (
    <html lang={lng}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
