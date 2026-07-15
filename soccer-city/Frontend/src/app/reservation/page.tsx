"use client";

import { useSearchParams } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import type { EventType } from "@/lib/types";

export default function EventReservationPage() {
  const searchParams = useSearchParams();

  const selectedType =
    (searchParams.get("type") as EventType | null) ?? undefined;

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <p className="speed-eyebrow mb-4 justify-center">
            Demande de réservation
          </p>

          <h1 className="display text-4xl sm:text-6xl">
            Organiser votre{" "}
            <span className="text-primary">
              {selectedType ?? "événement"}
            </span>
          </h1>

          <p className="mt-5 text-muted-foreground">
            Remplissez le formulaire ci-dessous. Notre équipe vous attribuera le
            terrain le plus adapté selon le type d’événement et le nombre de
            participants.
          </p>
        </header>

        <div className="mx-auto max-w-3xl">
          <EventForm selectedType={selectedType} />
        </div>
      </div>
    </main>
  );
}