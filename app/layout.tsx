import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <body className="min-h-full flex flex-col bg-background text-foreground">
      {isClerkConfigured() ? (
        <ClerkProvider appearance={{ theme: shadcn }}>{children}</ClerkProvider>
      ) : (
        children
      )}
    </body>
  );

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      {body}
    </html>
  );
}
