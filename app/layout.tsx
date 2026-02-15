import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getTheme } from "./actions";
import { ThemeSync } from "./components/ThemeSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Overseer - Infrastructure Monitoring",
  description: "Monitor and manage your infrastructure components with Overseer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme();

  return (
    <html lang="en" suppressHydrationWarning className={theme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-[#0a0a0a] transition-colors duration-300`}
        suppressHydrationWarning
      >
        <ThemeSync theme={theme} />
        {children}
      </body>
    </html>
  );
}
