import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Soccer City — Location de terrains de soccer premium",
  description: "Réservez un terrain de soccer en moins de 60 secondes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}