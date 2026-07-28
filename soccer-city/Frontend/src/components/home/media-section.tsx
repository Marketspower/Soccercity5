// components/home/media-section.tsx
"use client";

import { useAppStore } from "@/lib/store";
import { Reveal } from "@/components/motion/reveal";
import { Play, Video, Music, ImageIcon } from "lucide-react";

export function MediaSection() {
  const { media } = useAppStore();
  const videos = media.filter(m => m.type === 'video' && m.isFeatured);

  if (videos.length === 0) return null;

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <div key={video.id} className="group relative rounded-lg overflow-hidden bg-muted">
            {video.thumbnail ? (
              <div className="aspect-video relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
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
            <div className="p-4">
              <h3 className="font-semibold">{video.title}</h3>
              {video.description && (
                <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
              )}
              {video.duration && (
                <p className="text-xs text-muted-foreground mt-2">{video.duration}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}