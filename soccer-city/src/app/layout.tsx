import type { Metadata, Viewport } from "next";
import { Saira, Archivo } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CONTACT } from "@/lib/data";
import "./globals.css";

/* Typographies de marque :
   — Saira (italique extra-bold) : l'inclinaison « vitesse » du logo
   — Archivo : lisibilité premium pour le texte courant */
const display = Saira({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800", "900"], style: ["normal", "italic"] });
const body = Archivo({ subsets: ["latin"], variable: "--font-body" });

const SITE_URL = "https://soccercity.ca";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Soccer City — Location de terrains de soccer premium", template: "%s · Soccer City" },
  description:
    "Réservez un terrain de soccer en moins de 60 secondes. 4 terrains premium, gazon 5G, éclairage LED, vestiaires. Ouvert 7j/7 de 8 h à 23 h.",
  keywords: ["location terrain soccer", "réservation terrain football", "soccer intérieur", "tournoi soccer", "Soccer City"],
  openGraph: {
    type: "website",
    locale: "fr_CA",
    siteName: "Soccer City",
    title: "Soccer City — Le complexe où le jeu s'accélère",
    description: "Terrains premium, réservation en ligne instantanée, événements privés.",
    images: [{ url: "/brand/logo-dark-bg.png", width: 836, height: 247, alt: "Soccer City" }],
  },
  icons: { icon: "/brand/emblem.png", apple: "/brand/emblem.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050607" },
    { media: "(prefers-color-scheme: light)", color: "#FAFBFC" },
  ],
};

/* Données structurées — référencement local (Google) */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "Soccer City",
  description: "Centre de location de terrains de soccer premium.",
  telephone: CONTACT.phone,
  email: CONTACT.email,
  address: { "@type": "PostalAddress", streetAddress: CONTACT.address },
  openingHours: "Mo-Su 08:00-23:00",
  url: SITE_URL,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} font-sans`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
