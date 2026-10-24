// components/home/media-section.tsx
"use client";

import { useEffect } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useAppStore } from "@/lib/store";
import { VideoPlayer } from "@/components/media/video-player";

export function MediaSection() {
  const { media, syncMedia } = useAppStore();
  useEffect(() => {
    syncMedia();
  }, [syncMedia]);

  // Accueil : vidéos mises en avant + vidéos générales (celles rattachées à
  // un type d'événement s'affichent sur la page de cet événement).
  const featuredVideos = media.filter((m) => m.type === "video" && m.isFeatured);
  const otherVideos = media.filter((m) => m.type === "video" && !m.isFeatured && !m.eventType);

  if (featuredVideos.length + otherVideos.length === 0) {
    return null;
  }

  return (
    <section className="container py-24 md:py-32">
      <Reveal className="mx-auto mb-14 max-w-2xl text-center">
        <p className="speed-eyebrow mb-4 justify-center">Médias</p>
        <h2 className="display text-4xl sm:text-5xl">
          Nos <span className="text-primary">vidéos</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Découvrez l'ambiance de Soccer City en images
        </p>
      </Reveal>

      {/* Vidéos mises en avant */}
      {featuredVideos.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {featuredVideos.map((video) => (
            <div key={video.id} className="group relative rounded-lg overflow-hidden bg-muted">
              <VideoPlayer url={video.url} title={video.title} poster={video.thumbnail} />
              <div className="p-4 bg-card">
                <h3 className="font-semibold">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                )}
                {video.duration && (
                  <p className="text-xs text-muted-foreground mt-2">{video.duration}</p>
                )}
                <span className="inline-block mt-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  ★ Mis en avant
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Autres vidéos */}
      {otherVideos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {otherVideos.map((video) => (
            <div key={video.id} className="group relative rounded-lg overflow-hidden bg-muted border border-white/10">
              <VideoPlayer url={video.url} title={video.title} poster={video.thumbnail} />
              <div className="p-3 bg-card/80">
                <p className="text-sm font-medium truncate">{video.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
