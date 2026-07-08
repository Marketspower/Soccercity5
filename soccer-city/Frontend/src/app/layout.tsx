import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { LayoutContent } from "@/components/layout/layout-content";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Soccer City — Location de terrains de soccer premium",
  description: "Réservez un terrain de soccer en moins de 60 secondes.",
  keywords: ["location terrain soccer", "réservation terrain football", "soccer intérieur"],
  authors: [{ name: "Soccer City" }],
  openGraph: {
    title: "Soccer City — Le complexe où le jeu s'accélère",
    description: "Terrains premium, réservation en ligne instantanée, événements privés.",
    type: "website",
    locale: "fr_CA",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}