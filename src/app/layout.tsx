import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans',
});

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
      <body className={`${notoSans.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
