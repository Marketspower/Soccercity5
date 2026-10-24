import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { LayoutContent } from "@/components/layout/layout-content";
import { Analytics } from "@/components/layout/analytics";
import { CONTACT } from "@/lib/data";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Soccer City — Location de terrains de soccer à Saint-Jean-sur-Richelieu",
    template: "%s | Soccer City",
  },
  description:
    "Location de terrains de soccer, anniversaires, tournois, événements d'entreprise et académie à Saint-Jean-sur-Richelieu. Réservation et paiement en ligne.",
  alternates: { canonical: "/" },
  keywords: ["location terrain soccer", "réservation terrain football", "soccer intérieur"],
  authors: [{ name: "Soccer City" }],
  openGraph: {
    title: "Soccer City — Le complexe où le jeu s'accélère",
    description: "Terrains premium, réservation en ligne instantanée, événements privés.",
    type: "website",
    locale: "fr_CA",
    siteName: "Soccer City",
    images: [{ url: "/images/hero-field.jpg", width: 1200, height: 630, alt: "Terrain de soccer Soccer City" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <script
          type="application/ld+json"
          // Données structurées : fiche « établissement sportif » pour Google
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsActivityLocation",
              name: "Soccer City",
              url: SITE_URL,
              telephone: CONTACT.phone,
              email: CONTACT.email,
              address: {
                "@type": "PostalAddress",
                streetAddress: "835 rue Saint-Jacques",
                addressLocality: "Saint-Jean-sur-Richelieu",
                addressRegion: "QC",
                postalCode: "J3B 2N2",
                addressCountry: "CA",
              },
              openingHours: "Mo-Su 08:00-23:00",
            }),
          }}
        />
        <Analytics />
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}