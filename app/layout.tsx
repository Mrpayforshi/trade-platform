import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Zilla_Slab } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";

const zilla = Zilla_Slab({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-zilla" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

export const metadata: Metadata = {
  title: { default: "Nexum — buy from China, receive in Zimbabwe", template: "%s | Nexum" },
  description:
    "Nexum manages supplier checks, compliance, payment, freight, customs and delivery as one transaction on the China–Zimbabwe corridor.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nexum" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1626" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${zilla.variable} ${hanken.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
