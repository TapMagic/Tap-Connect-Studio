import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Tap Connect Studio",
  description:
    "Turn physical NFC and QR touchpoints into dynamic branded mini-webpages with measurable conversion data.",
  icons: {
    icon: "/tap-connect-logo.png",
    apple: "/tap-connect-logo.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070b12",
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
