import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Réserver un terrain",
  description: "Réservez votre terrain de soccer en moins de 60 secondes. Créneaux d'une heure, de 8 h à 23 h, 7 jours sur 7.",
};

export default function ReservationPage() {
  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-60" aria-hidden />
      <div className="container relative">
        <header className="mb-12 text-center">
          <p className="speed-eyebrow mb-4 justify-center">Réservation en ligne</p>
          <h1 className="display text-4xl sm:text-6xl">
            Votre terrain en <span className="text-primary">60 secondes</span>
          </h1>
        </header>
        {/* useSearchParams (pré-sélection ?terrain=) impose une frontière Suspense */}
        <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl rounded-lg" />}>
          <BookingFlow />
        </Suspense>
      </div>
    </div>
  );
}
