import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/rasa/Providers";
import { SiteFrame } from "@/components/rasa/SiteFrame";

export const metadata: Metadata = {
  title: "RASA, Roots to Rhythm",
  description:
    "RASA, Roots to Rhythm: music, dance and wellness, 8 to 10 January 2027 at the Prestige Centre for Performing Arts, Bengaluru. A fundraiser for HCG Foundation and IHDUA.",
  openGraph: {
    title: "RASA, Roots to Rhythm",
    description:
      "Music, dance and wellness, 8 to 10 January 2027 at the Prestige Centre for Performing Arts, Bengaluru.",
    type: "website",
  },
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  applicationName: "RASA, Roots to Rhythm",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3f1441",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col font-body text-ink antialiased">
        <Providers>
          <SiteFrame>{children}</SiteFrame>
        </Providers>
      </body>
    </html>
  );
}