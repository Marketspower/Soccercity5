// app/page.tsx
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
import { MediaSection } from "@/components/home/media-section";

export default function HomePage() {
  // Plus d'écran de chargement bloquant : le contenu est rendu tout de suite
  // (les données sont chargées en arrière-plan par <Providers />).
  return (
    <>
      <Hero />
      <About />
      <Fields />
      <Pricing />
      <Services />
      <Gallery />
      <MediaSection />
      <Reviews />
      <Faq />
      <Contact />
      <CtaBanner />
    </>
  );
}
