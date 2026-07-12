import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { CurrencyProvider } from "../context/CurrencyContext";
import { ToastProvider } from "../components/Toast";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { StatsTicker } from "../components/StatsTicker";
import { VisitorTracker } from "../components/VisitorTracker";

export const metadata: Metadata = {
  title: { default: "Yotweek — Promote Active and Engaging Living", template: "%s | Yotweek" },
  description: "Yotweek is the community-driven SaaS platform for discovering and booking local and international events, businesses, and tourism destinations — with smart recommendations that learn from your interests.",
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
          <CurrencyProvider>
            <ToastProvider>
              <VisitorTracker />
              <StatsTicker />
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </ToastProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
