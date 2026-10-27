// components/media/event-type-bands.tsx
// Photos et vidéos d'un type d'événement (ajoutées dans Admin → Événements →
// « Photos et vidéos »), en bandes défilantes. N'affiche rien s'il n'y en a pas.
"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { MediaEventType } from "@/lib/types";
import { MediaBands } from "./media-bands";

export function EventTypeBands({ eventType, className = "" }: { eventType: MediaEventType; className?: string }) {
  const { gallery, media, loadGallery, loadMedia } = useAppStore();

  useEffect(() => {
    loadGallery();
    loadMedia();
  }, [loadGallery, loadMedia]);

  const photos = [
    ...gallery.filter((g) => g.eventType === eventType).map((g) => ({ id: `p-${g.id}`, src: g.imageUrl, alt: g.alt })),
    ...media.filter((m) => m.type === "photo" && m.eventType === eventType).map((m) => ({ id: `m-${m.id}`, src: m.url, alt: m.title })),
  ];
  const videos = media.filter((m) => m.type === "video" && m.eventType === eventType);
  if (!photos.length && !videos.length) return null;

  return (
    <MediaBands
      size="sm"
      className={className}
      rows={[
        { items: photos.map((p, i) => ({ ...p, kind: "photo" as const, alt: p.alt || `${eventType} chez Soccer City — photo ${i + 1}` })) },
        { reverse: true, items: videos.map((v) => ({ id: `v-${v.id}`, kind: "video" as const, src: v.url, alt: v.title, poster: v.thumbnail })) },
      ]}
    />
  );
}
