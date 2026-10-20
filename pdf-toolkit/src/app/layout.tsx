import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PDF Toolkit — Everyday PDF Tools",
    template: "%s | PDF Toolkit",
  },
  description:
    "Merge, split, compress, and convert PDF documents with a simple, responsive online toolkit.",
  applicationName: "PDF Toolkit",
  keywords: [
    "PDF tools",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF converter",
    "online PDF tools",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <Suspense>
        {children}
        </Suspense>
      </body>
    </html>
  );
}
