"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarSearch, CircleParking, DoorOpen, Lightbulb, Ruler, Sprout, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";
import type { Field } from "@/lib/types";

/** Ligne caractéristique d'un terrain. */
function Spec({ Icon, label }: { Icon: React.ElementType; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary" />
      {label}
    </li>
  );
}

function FieldCard({ field }: { field: Field }) {
  return (
    <article className="card-hover group overflow-hidden rounded-lg border bg-card">
      {/* Visuel avec zoom + voile bleu au survol */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={field.image}
          alt={`${field.name} — ${field.players}`}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge>{field.players}</Badge>
          {field.indoor && <Badge variant="secondary">Intérieur</Badge>}
        </div>
        <p className="absolute bottom-4 right-4 rounded-md glass px-3 py-1.5 font-display text-lg font-extrabold italic text-white">
          {formatCAD(field.pricePerHour)}<span className="text-xs font-medium not-italic text-white/70"> / h</span>
        </p>
      </div>

      <div className="p-6">
        <h3 className="display text-2xl">{field.name}</h3>

        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <Spec Icon={Ruler} label={field.dimensions} />
          <Spec Icon={Sprout} label={field.turf} />
          <Spec Icon={Lightbulb} label={field.lighting ? "Éclairage LED" : "Sans éclairage"} />
          <Spec Icon={DoorOpen} label={`${field.lockerRooms} vestiaires`} />
          <Spec Icon={CircleParking} label={field.parking ? "Parking gratuit" : "Sans parking"} />
          <Spec Icon={Users} label={field.players} />
        </ul>

        <div className="mt-6 flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/reservation?terrain=${field.id}`}>
              <CalendarSearch /> Disponibilités
            </Link>
          </Button>
          <Button asChild variant="brand" className="flex-1">
            <Link href={`/reservation?terrain=${field.id}`}>
              <Zap /> Réserver
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function Fields() {
  // Terrains gérés dans le store (l'admin peut en ajouter/retirer)
  const fields = useAppStore((s) => s.fields).filter((f) => f.active);

  return (
    <section id="terrains" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-field-lines" aria-hidden />
      <div className="container relative">
        <Reveal className="mb-14 max-w-2xl">
          <p className="speed-eyebrow mb-4">Nos terrains</p>
          <h2 className="display text-4xl sm:text-5xl">Choisissez votre <span className="text-primary">surface de jeu</span></h2>
          <p className="mt-4 text-muted-foreground">
            Du 5 contre 5 rapide au 11 contre 11 grand format : chaque terrain est éclairé,
            entretenu quotidiennement et réservable à l&apos;heure.
          </p>
        </Reveal>

        <Stagger className="grid gap-8 md:grid-cols-2">
          {fields.map((f) => (
            <StaggerItem key={f.id}>
              <FieldCard field={f} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
