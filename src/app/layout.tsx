import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nadeem Jamal | Zoology & Science Education",
  description: "Portfolio of Nadeem Jamal, a zoology graduate, research assistant, and science educator.",
  keywords: ["Nadeem Jamal", "zoology", "biodiversity", "research assistant", "science educator"],
  openGraph: {
    title: "Nadeem Jamal | Zoology & Science Education",
    description: "Research-minded. Field-curious. Always learning from the living world.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nadeem Jamal | Zoology & Science Education",
    description: "Research-minded. Field-curious. Always learning from the living world.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
