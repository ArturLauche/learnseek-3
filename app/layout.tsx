import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { AppProviders } from "@/components/providers";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Oriel",
    template: "%s · Oriel",
  },
  description:
    "Oriel is a window that lets in light. Turn idle scrolling into useful microlearning — 15 seconds to 3 minutes per item. Free, open, and self-hostable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={`${newsreader.variable} ${sourceSans.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
