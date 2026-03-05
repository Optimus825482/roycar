import type { Metadata } from "next";
import { Playfair_Display, Inter, Dancing_Script } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://royalcareer.erkanerdem.net"),
  title: "F&B Career System",
  description: "F&B Career System — Kariyer ve başvuru platformu",
  icons: {
    icon: "/images/image.ico",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "F&B Career System",
    description: "F&B Career System — Kariyer ve başvuru platformu",
    url: "https://royalcareer.erkanerdem.net",
    siteName: "F&B Career System",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} ${dancingScript.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-mr-navy focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-mr-gold"
        >
          İçeriğe atla
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
