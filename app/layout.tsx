import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/rasa/SiteHeader";
import { SiteFooter } from "@/components/rasa/SiteFooter";
import { Providers } from "@/components/rasa/Providers";

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
    <html lang="en">
      <body className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] font-body text-ink antialiased md:pb-0">
        <Providers>
          <SiteHeader />
          <main className="min-w-0 flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}