// app/page.tsx
"use client";

import { useEffect } from "react";
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
import { useAppStore } from "@/lib/store";

export default function HomePage() {
  const { loadInitialData, isInitialized, isLoading } = useAppStore();

  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, [isInitialized, loadInitialData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-950">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">⚽</div>
          <div className="h-2 w-48 bg-blue-600/20 rounded-full mx-auto overflow-hidden">
            <div className="h-full w-1/2 bg-blue-500 rounded-full animate-[slide_1s_ease-in-out_infinite]" />
          </div>
          <p className="mt-4 text-blue-300/60 text-sm">Chargement du complexe...</p>
        </div>
      </div>
    );
  }

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