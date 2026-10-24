// components/media/video-player.tsx
// Lecteur vidéo unique pour tout le site :
//  • YouTube / Vimeo : vignette légère, le lecteur ne se charge qu'au clic
//    (page plus rapide, pas de cookies avant l'interaction).
//  • Fichier (Supabase Storage) : balise <video> native avec contrôles.
"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { parseVideoUrl } from "@/lib/video";

export function VideoPlayer({
  url,
  title,
  poster,
}: {
  url: string;
  title: string;
  poster?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const src = parseVideoUrl(url);
  if (!src) return null;

  if (src.kind === "file") {
    return (
      <video
        src={src.url}
        poster={poster || undefined}
        controls
        preload="metadata"
        playsInline
        className="aspect-video w-full rounded-lg bg-black object-cover"
      >
        Votre navigateur ne peut pas lire cette vidéo.
      </video>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`${src.embedUrl}${src.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const thumb = poster || (src.kind === "youtube" ? src.thumbnail : null);
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-black"
      aria-label={`Lire la vidéo : ${title}`}
    >
      {thumb ? (
        <img src={thumb} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" loading="lazy" />
      ) : (
        <div className="h-full w-full bg-primary/10" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition group-hover:scale-110">
          <Play className="size-6 translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}
