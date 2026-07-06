import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../components/Toast";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { StatsTicker } from "../components/StatsTicker";
import { VisitorTracker } from "../components/VisitorTracker";

export const metadata: Metadata = {
  title: { default: "yotweek — Discover Events, Businesses & Destinations", template: "%s | yotweek" },
  description: "Find and book local and international events, businesses, and tourism destinations. Smart recommendations powered by your interests.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col bg-slate-50">
        <AuthProvider>
          <ToastProvider>
            <VisitorTracker />
            <StatsTicker />
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
