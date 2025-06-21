import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { SignUpProvider } from '@/contexts/SignUpContext';
import { Toaster } from 'react-hot-toast';
import GoogleAnalytics from "@/components/GoogleAnalytics";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Sketch Music - Create Viral Campaigns",
  description: "Empower creators and launch viral marketing campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <SignUpProvider>
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Toaster />
            <GoogleAnalytics />
          </SignUpProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
