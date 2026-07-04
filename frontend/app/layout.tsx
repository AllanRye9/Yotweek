import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/playfair-display";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { VisitorTracker } from "../components/VisitorTracker";

export const metadata: Metadata = {
  title: "yotweek — Discover events, places & businesses",
  description: "yotweek connects people with shared interests and passions for exploration — find nearby and international events, tours, and local businesses, free or paid, all verified.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <VisitorTracker />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
