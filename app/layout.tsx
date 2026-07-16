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
  title: "TapConnect Studio — Every Tap Becomes a Customer Journey",
  description:
    "Turn cards, Tap Devices, smart signs, and product displays into live campaigns with Workbench, scheduled offers, contact collectors, branded emails, and analytics.",
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
