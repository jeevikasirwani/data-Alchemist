import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Alchemist - AI-Powered Data Validation",
  description: "Intelligent data validation and correction tool with AI capabilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
