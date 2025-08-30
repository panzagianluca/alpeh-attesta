import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/web3-provider";
import { ConditionalFloatingDock } from "@/components/layout/conditional-floating-dock";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Attesta - Guarantee Your IPFS Data Availability",
  description: "Attesta provides economic guarantees for IPFS content availability. Validators stake tokens to ensure your data remains accessible when you need it.",
  keywords: ["IPFS", "blockchain", "data availability", "validators", "economic guarantees", "decentralized storage"],
  authors: [{ name: "Attesta Team" }],
  creator: "Attesta",
  publisher: "Attesta",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://attesta.io"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://attesta.io",
    siteName: "Attesta",
    title: "Attesta - Guarantee Your IPFS Data Availability",
    description: "Economic guarantees for IPFS content availability through validator networks.",
    images: [
      {
        url: "/attesta.svg",
        width: 1200,
        height: 630,
        alt: "Attesta Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Attesta - Guarantee Your IPFS Data Availability",
    description: "Economic guarantees for IPFS content availability through validator networks.",
    images: ["/attesta.svg"],
  },
  icons: {
    icon: [
      {
        url: "/FaviconBlack.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/FaviconWhite.svg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: "/FaviconBlack.svg",
    apple: "/FaviconBlack.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#0A0A0A] text-[#EDEDED]`}>
        <Web3Provider>
          <ConditionalFloatingDock />
          <main>
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}
