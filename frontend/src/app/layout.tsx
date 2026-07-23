import type { Metadata } from "next";
import "./globals.css";

import { ThemeInitializationScript } from "@/components/theme-initialization-script";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Pocket Ledger AI",
  description: "Local-first AI expense manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <ThemeInitializationScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
