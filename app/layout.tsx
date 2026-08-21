import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";

export const metadata: Metadata = {
  title: "Cross-Border Trade Platform",
  description: "China–Zimbabwe cross-border trade, sourcing, and compliance platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TradeLink",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
