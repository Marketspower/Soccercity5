// components/home/fields.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarSearch, CircleParking, DoorOpen, Lightbulb, Ruler, Sprout, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";
import type { Field } from "@/lib/types";
import { FieldGalleryTrigger } from "@/components/home/field-gallery-modal";

function Spec({ Icon, label }: { Icon: React.ElementType; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary" />
      {label}
    </li>
  );
}

function FieldCard({ field }: { field: Field }) {
  const imageUrl = field.image || '';

  return (
    <article className="card-hover group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-glow-sm">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${field.name} — ${field.players}`}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Afficher le fallback
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'flex h-full w-full items-center justify-center bg-primary/5';
                fallback.innerHTML = '<span class="text-6xl">⚽</span>';
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/5">
            <span className="text-6xl">⚽</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge>{field.players}</Badge>
          {field.indoor && <Badge variant="secondary">Intérieur</Badge>}
        </div>
        <p className="absolute bottom-4 right-4 rounded-md glass px-3 py-1.5 font-display text-lg font-extrabold italic text-white">
          {formatCAD(field.pricePerHour)}
          <span className="text-xs font-medium not-italic text-white/70"> / h</span>
        </p>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="display text-2xl">{field.name}</h3>
          <FieldGalleryTrigger field={field} />
        </div>

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
              <CalendarSearch className="size-4" /> Disponibilités
            </Link>
          </Button>
          <Button asChild variant="brand" className="flex-1">
            <Link href={`/reservation?terrain=${field.id}`}>
              <Zap className="size-4" /> Réserver
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function Fields() {
  const { fields, loadFields, isLoading, gallery, syncGallery } = useAppStore();
  const [fieldsWithImages, setFieldsWithImages] = useState<Field[]>([]);

  useEffect(() => {
    loadFields();
    syncGallery();
  }, []);

  useEffect(() => {
    // Associer les images de la galerie aux terrains
    if (fields.length > 0) {
      const updatedFields = fields.map(field => {
        // Si le terrain a déjà une image valide, la garder
        if (field.image && field.image.startsWith('http')) {
          return field;
        }
        
        // Chercher une image dans la galerie associée à ce terrain
        const galleryImage = gallery.find(g => 
          g.alt?.toLowerCase().includes(field.name.toLowerCase()) ||
          g.eventId === field.id ||
          g.imageUrl?.includes(field.slug || '')
        );
        
        if (galleryImage) {
          return { ...field, image: galleryImage.imageUrl };
        }
        
        return field;
      });
      setFieldsWithImages(updatedFields);
    } else {
      setFieldsWithImages(fields);
    }
  }, [fields, gallery]);

  const activeFields = fieldsWithImages.filter(f => f.active);

  if (isLoading) {
    return (
      <section className="container py-16">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">⚽</div>
          <p className="text-muted-foreground">Chargement des terrains...</p>
        </div>
      </section>
    );
  }

  if (activeFields.length === 0) {
    return (
      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-8">
          Nos <span className="text-primary">terrains</span>
        </h2>
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Aucun terrain disponible.</p>
          <p className="text-sm text-muted-foreground">Ajoutez-en depuis l&apos;administration.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="terrains" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-field-lines" aria-hidden />
      <div className="container relative">
        <Reveal className="mb-14 max-w-2xl">
          <p className="speed-eyebrow mb-4">Nos terrains</p>
          <h2 className="display text-4xl sm:text-5xl">
            Choisissez votre <span className="text-primary">surface de jeu</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            {activeFields.length} terrains disponibles
          </p>
        </Reveal>

        <Stagger className="grid gap-8 md:grid-cols-2">
          {activeFields.map((f) => (
            <StaggerItem key={f.id}>
              <FieldCard field={f} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}