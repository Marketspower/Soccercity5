"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Briefcase,
  Cake,
  GraduationCap,
  MapPin,
  Medal,
  PartyPopper,
  Trophy,
  Users,
} from "lucide-react";
import type { EventType } from "@/lib/types";
import { useAppStore } from "@/lib/store";

const TYPES: {
  Icon: typeof Cake;
  title: EventType;
  text: string;
  terrain: "Petit terrain" | "Grand terrain";
}[] = [
  {
    Icon: Cake,
    title: "Anniversaire",
    text: "Anniversaire sportif, fête familiale ou célébration en petit groupe.",
    terrain: "Petit terrain",
  },
  {
    Icon: Trophy,
    title: "Tournoi",
    text: "Tournoi réunissant plusieurs équipes, avec matchs et classement.",
    terrain: "Grand terrain",
  },
  {
    Icon: Briefcase,
    title: "Entreprise",
    text: "Team-building, activité corporative ou rencontre entre collègues.",
    terrain: "Grand terrain",
  },
  {
    Icon: GraduationCap,
    title: "École",
    text: "Sortie scolaire, activité éducative ou journée sportive encadrée.",
    terrain: "Grand terrain",
  },
  {
    Icon: PartyPopper,
    title: "Événement privé",
    text: "Fête privée, célébration, rencontre familiale ou activité de groupe.",
    terrain: "Petit terrain",
  },
  {
    Icon: Medal,
    title: "Compétition",
    text: "Ligue, qualification, championnat ou compétition officielle.",
    terrain: "Grand terrain",
  },
];

export function EventOptions() {
  const [showFields, setShowFields] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string>();

  const { fields } = useAppStore();

  const availableFields = Array.isArray(fields)
    ? fields.filter((field) => field.active).slice(0, 2)
    : [];

  function chooseField(fieldId: string) {
    setSelectedFieldId(fieldId);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map(({ Icon, title, text, terrain }) => (
          <Link
            key={title}
            href={`/reservation?type=${encodeURIComponent(title)}`}
            className="card-hover flex h-full flex-col rounded-lg border bg-card p-5 text-left transition hover:border-primary"
          >
            <Icon className="mb-3 size-7 text-primary" />

            <h2 className="font-display text-lg font-bold">{title}</h2>

            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>

            <p className="mt-4 text-sm font-semibold text-primary">
              Terrain recommandé : {terrain}
            </p>

            <span className="mt-5 inline-flex items-center font-semibold text-primary">
              Choisir cet événement →
            </span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => {
            setShowFields(true);
            setSelectedFieldId(undefined);
          }}
          className="card-hover flex h-full flex-col rounded-lg border bg-card p-5 text-left transition hover:border-primary"
        >
          <MapPin className="mb-3 size-7 text-primary" />

          <h2 className="font-display text-lg font-bold">
            Réservation de terrain
          </h2>

          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            Découvrez les terrains disponibles et consultez leurs informations
            avant de faire votre choix.
          </p>

          <span className="mt-5 inline-flex items-center font-semibold text-primary">
            Voir les terrains →
          </span>
        </button>
      </div>

      {showFields && (
        <section className="mt-16">
          <div className="mb-8 text-center">
            <h2 className="display text-3xl sm:text-4xl">
              Choisissez un terrain
            </h2>

            <p className="mt-3 text-muted-foreground">
              Soccer City possède un petit terrain et un grand terrain.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {availableFields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => chooseField(field.id)}
                className={`overflow-hidden rounded-lg border bg-card text-left transition ${
                  selectedFieldId === field.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "hover:border-primary"
                }`}
              >
                <div className="h-56 overflow-hidden bg-muted">
                  {field.image ? (
                    <img
                      src={field.image}
                      alt={field.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Image du terrain
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold">
                    {field.name}
                  </h3>

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    <p>Dimensions : {field.dimensions}</p>
                    <p>Surface : {field.turf}</p>
                    <p>Joueurs : {field.players}</p>
                    <p>Éclairage LED : {field.lighting ? "Oui" : "Non"}</p>
                    <p>Vestiaires : {field.lockerRooms}</p>
                    <p>Stationnement : {field.parking ? "Oui" : "Non"}</p>
                  </div>

                  <p className="mt-5 text-xl font-bold text-primary">
                    {field.pricePerHour} $ / heure
                  </p>

                  <span className="mt-5 inline-flex items-center font-semibold text-primary">
                    Choisir ce terrain
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedFieldId && (
            <div className="mt-8 rounded-lg border border-primary/30 bg-primary/10 p-6 text-center">
              <Users className="mx-auto mb-3 size-7 text-primary" />

              <h3 className="font-display text-xl font-bold">
                Terrain sélectionné
              </h3>

              <p className="mt-2 text-muted-foreground">
                Le système de réservation est actuellement en cours de
                construction pour tous les événements.
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Vous pouvez contacter Soccer City pour finaliser votre demande.
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}