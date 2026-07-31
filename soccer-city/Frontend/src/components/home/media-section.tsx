// components/home/media-section.tsx
"use client";

import { useEffect, useState } from "react";
import { Play, Video, Music, ImageIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { useAppStore } from "@/lib/store";

export function MediaSection() {
  const { media, syncMedia } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMedia = async () => {
      await syncMedia();
      setLoading(false);
    };
    loadMedia();
  }, []);

  // Filtrer les vidéos mises en avant
  const featuredVideos = media.filter(m => m.type === 'video' && m.isFeatured);
  const otherVideos = media.filter(m => m.type === 'video' && !m.isFeatured);

  if (loading) {
    return (
      <section className="container py-24 md:py-32">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">🎬</div>
          <p className="text-muted-foreground">Chargement des médias...</p>
        </div>
      </section>
    );
  }

  if (media.length === 0) {
    return null;
  }

  return (
    <section className="container py-24 md:py-32">
      <Reveal className="mb-14 max-w-2xl">
        <p className="speed-eyebrow mb-4">Médias</p>
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
              {video.thumbnail ? (
                <div className="aspect-video relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="size-12 text-white" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-primary/10">
                  <Video className="size-12 text-primary" />
                </div>
              )}
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
              {video.thumbnail ? (
                <div className="aspect-video relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-primary/5">
                  <Video className="size-8 text-primary/50" />
                </div>
              )}
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