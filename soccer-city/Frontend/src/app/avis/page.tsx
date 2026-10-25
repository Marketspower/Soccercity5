// app/avis/page.tsx — formulaire « Laisser un avis »
import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  title: "Laisser un avis",
  description: "Partagez votre expérience chez Soccer City.",
  robots: { index: false, follow: true },
};

export default function AvisPage() {
  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container mx-auto max-w-xl">
        <header className="mb-10 text-center">
          <p className="speed-eyebrow mb-4 justify-center">Votre avis</p>
          <h1 className="display text-4xl sm:text-5xl">
            Comment s&apos;est passé <span className="text-primary">votre&nbsp;match&nbsp;?</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Votre avis aide d&apos;autres joueurs à nous découvrir. Il sera publié après une courte vérification.
          </p>
        </header>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-card" />}>
          <ReviewForm />
        </Suspense>
      </div>
    </div>
  );
}
