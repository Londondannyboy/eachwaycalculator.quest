import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { BetaBanner } from "@/components/BetaBanner";
import { CookieConsent } from "@/components/CookieConsent";
import "@copilotkit/react-ui/styles.css";
import "./globals.css";

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
    default: "Each-Way Calculator | Free Betting Returns Calculator",
    template: "%s | Each-Way Calculator",
  },
  description:
    "Each way calculator for UK betting - free tool to calculate your potential returns for horse racing, golf, and sports. Instant win and place payouts with AI assistant.",
  keywords: [
    "each way calculator",
    "each-way bet calculator",
    "horse racing calculator",
    "betting calculator",
    "place bet calculator",
    "each way returns",
    "betting odds calculator",
    "golf betting calculator",
    "sports betting calculator",
    "each way betting explained",
  ],
  authors: [{ name: "Each-Way Calculator" }],
  creator: "Each-Way Calculator",
  publisher: "Each-Way Calculator",
  metadataBase: new URL("https://eachwaycalculator.quest"),
  alternates: {
    canonical: "https://eachwaycalculator.quest",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://eachwaycalculator.quest",
    siteName: "Each-Way Calculator",
    title: "Each Way Calculator | Free UK Betting Returns Calculator",
    description:
      "Each way calculator for UK betting - calculate your potential returns for horse racing, golf, and sports. Free tool with AI-powered assistance for win and place payouts.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Each Way Calculator | Free UK Betting Returns",
    description:
      "Each way calculator for horse racing, golf, and sports. Free UK betting tool to calculate win and place returns with AI assistance.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://eachwaycalculator.quest/#website",
  name: "Each-Way Calculator",
  alternateName: ["Each Way Bet Calculator", "E/W Calculator", "Betting Returns Calculator"],
  url: "https://eachwaycalculator.quest",
  description:
    "Free each-way bet calculator for horse racing, golf, and sports betting. Calculate win and place returns instantly.",
  inLanguage: "en-GB",
  publisher: {
    "@type": "Organization",
    "@id": "https://eachwaycalculator.quest/#organization",
    name: "Each-Way Calculator",
    url: "https://eachwaycalculator.quest",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://eachwaycalculator.quest/#app",
  name: "Each-Way Calculator",
  description:
    "Free online each-way bet calculator for horse racing, golf, and sports betting. Calculate potential returns instantly.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  featureList: [
    "Each-way bet calculation",
    "Win and place returns",
    "Multiple odds formats (fractional, decimal)",
    "Standard horse racing terms",
    "Golf and sports betting support",
    "AI-powered assistance",
    "Visual returns breakdown",
    "Odds comparison charts",
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Each-Way Calculator",
      item: "https://eachwaycalculator.quest",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Each-Way Calculator" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <BetaBanner />
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
