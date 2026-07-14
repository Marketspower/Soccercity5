import type { Metadata } from "next";
import { EventOptions } from "@/components/events/event-options";

export const metadata: Metadata = {
  title: "Organiser un événement",
  description:
    "Anniversaires, tournois, événements d'entreprise, sorties scolaires, compétitions et réservations de terrains chez Soccer City.",
};

export default function EvenementsPage() {
  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container relative">
        <header className="mx-auto mb-16 max-w-3xl text-center">
          <p className="speed-eyebrow mb-4 justify-center">
            Événements et terrains
          </p>

          <h1 className="display text-4xl sm:text-6xl">
            Quel événement souhaitez-vous{" "}
            <span className="text-primary">organiser ?</span>
          </h1>

          <p className="mt-5 text-muted-foreground">
            Choisissez votre type d’événement. Soccer City vous proposera le
            terrain le plus adapté à la taille et aux besoins de votre groupe.
          </p>
        </header>

        <EventOptions />
      </div>
    </div>
  );
}