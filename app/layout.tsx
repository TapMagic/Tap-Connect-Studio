import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { Geist, Geist_Mono } from "next/font/google";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { isClerkConfigured } from "@/lib/utils/app";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://tapconnectstudio.com"),
  applicationName: "TapConnect Studio",
  title: {
    default: "TapConnect Studio | Tap Cards, Smart Signs, Campaigns & Lead Capture",
    template: "%s | TapConnect Studio",
  },
  description:
    "TapConnect Studio turns Tap Cards, smart signs, product displays, review stations, and event touchpoints into live campaigns with lead capture, offers, booking links, branded follow-up emails, and analytics.",
  keywords: [
    "Tap Connect",
    "TapConnect Studio",
    "Tap Connect Card",
    "digital marketing card",
    "smart business card",
    "tap card builder",
    "lead capture",
    "review station",
    "campaign builder",
    "smart signs",
    "physical touchpoint marketing",
    "local business marketing",
    "contact collector",
    "branded follow-up email",
    "scheduled offers",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TapConnect Studio",
    title: "TapConnect Studio | Every Tap Becomes a Customer Journey",
    description:
      "Build Tap Card, smart sign, review, event, and product-display campaigns with offers, lead capture, branded emails, and analytics.",
    images: [
      {
        url: TAP_CONNECT_LOGO,
        width: 1200,
        height: 1200,
        alt: "TapConnect Studio logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TapConnect Studio | Tap Cards, Smart Signs, Campaigns & Lead Capture",
    description:
      "Turn real-world taps into customer journeys with campaign pages, offers, reviews, bookings, lead capture, and analytics.",
    images: [TAP_CONNECT_LOGO],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "marketing software",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: TAP_CONNECT_LOGO, type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#050814",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <body className="min-h-full flex flex-col bg-background text-foreground">
      {isClerkConfigured() ? (
        <ClerkProvider appearance={{ theme: [shadcn, dark] }}>{children}</ClerkProvider>
      ) : (
        children
      )}
    </body>
  );

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="dark"
      style={{ colorScheme: "only dark" }}
      suppressHydrationWarning
    >
      {body}
    </html>
  );
}
