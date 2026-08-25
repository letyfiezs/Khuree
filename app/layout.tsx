import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { InstallApp } from "@/components/install-app";
import "./globals.css";
import "./extended.css";
import "./upload.css";
import "./auth-catalog.css";
import "./player-clean.css";
import "./live.css";
import "./live-mobile.css";
import "./live-desktop.css";
import "./player-autohide.css";
import "./admin-actions.css";
import "./mobile-fixes.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "cyrillic"],
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: { default: "Хүрээ — Монгол кино стриминг", template: "%s · Хүрээ" },
  description: "Монгол бүтээлүүдийг нэг дороос үзэх premium стриминг платформ.",
  applicationName: "Хүрээ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Хүрээ",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/pwa/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/pwa/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/pwa/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/pwa/favicon-32.png?v=2", type: "image/png" }],
    apple: [{ url: "/pwa/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Хүрээ — Монгол кино стриминг",
    description: "Монгол түүх. Шинэ мэдрэмж.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Хүрээ — Монгол кино стриминг",
    description: "Монгол түүх. Шинэ мэдрэмж.",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#070707" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body className={geist.variable}>
        {children}
        <InstallApp />
        <PwaRegister />
      </body>
    </html>
  );
}
