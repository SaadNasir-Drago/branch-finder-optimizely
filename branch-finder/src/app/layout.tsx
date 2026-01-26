import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Branch Finder | Brightstream Bank",
  description:
    "Find your nearest Brightstream Bank branch. Search by location, city, or country to locate our 1,000+ branches worldwide.",
  keywords: "bank branch, branch finder, Brightstream, bank locations, ATM",
  openGraph: {
    title: "Branch Finder | Brightstream Bank",
    description: "Find your nearest Brightstream Bank branch worldwide.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${jost.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
