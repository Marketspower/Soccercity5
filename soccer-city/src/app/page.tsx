import { Hero } from "@/components/home/hero";
import { About } from "@/components/home/about";
import { Fields } from "@/components/home/fields";
import { Gallery } from "@/components/home/gallery";
import { Pricing } from "@/components/home/pricing";
import { Services } from "@/components/home/services";
import { Reviews } from "@/components/home/reviews";
import { Faq } from "@/components/home/faq";
import { Contact } from "@/components/home/contact";
import { CtaBanner } from "@/components/home/cta";

/**
 * Page d'accueil — parcours de conversion :
 * Hero (CTA) → Preuves (valeurs, terrains) → Offre (tarifs, services)
 * → Réassurance (avis, galerie, FAQ) → Contact → CTA final.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Fields />
      <Pricing />
      <Services />
      <Gallery />
      <Reviews />
      <Faq />
      <Contact />
      <CtaBanner />
    </>
  );
}
