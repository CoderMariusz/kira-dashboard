import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { Toaster } from "sonner";
import { SSEProvider } from "./providers";
import { RoleProvider } from "@/contexts/RoleContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kira Dashboard",
  description: "AI Pipeline Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SSEProvider />
        <RoleProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </RoleProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          duration={4000}
          richColors={false}
          closeButton={true}
        />
      </body>
    </html>
  );
}
