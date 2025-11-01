import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-instrument-serif",
    weight: "400",
});

export const metadata: Metadata = {
    title: "ASTRA AI SDK",
    description: "Local AI console powered by Ollama",
    generator: "v0.app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${instrumentSerif.variable} antialiased`}>
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
        {/* Toaster global Sonner */}
        <Toaster richColors position="bottom-center" />
        </body>
        </html>
    );
}
