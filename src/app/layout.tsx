import type { Metadata } from "next";
import { Playfair_Display, Inter, Dancing_Script } from "next/font/google";
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
  title: "Merit Royal Kariyer",
  description: "Merit Royal Hotels — Kariyer ve başvuru platformu",
  icons: {
    icon: "/images/image.ico",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "Merit Royal Kariyer",
    description: "Merit Royal Hotels — Kariyer ve başvuru platformu",
    url: "https://royalcareer.erkanerdem.net",
    siteName: "Merit Royal Kariyer",
    images: [
      {
        url: "/images/logo.png",
        width: 512,
        height: 512,
        alt: "Merit Royal Hotels Logo",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Merit Royal Kariyer",
    description: "Merit Royal Hotels — Kariyer ve başvuru platformu",
    images: ["/images/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${playfair.variable} ${inter.variable} ${dancingScript.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
