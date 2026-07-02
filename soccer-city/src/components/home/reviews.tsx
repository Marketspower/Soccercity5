"use client";

import { Star } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { REVIEWS } from "@/lib/data";
import type { Review } from "@/lib/types";

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} étoiles sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < n ? "fill-primary text-primary" : "text-muted"}`} />
      ))}
    </div>
  );
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <figure className="w-[320px] shrink-0 rounded-lg border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-glow-sm sm:w-[380px]">
      <Stars n={r.rating} />
      <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">« {r.text} »</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        {/* Avatar initiales — remplacer par de vraies photos clients */}
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold italic text-primary">
          {r.avatar}
        </span>
        <div>
          <p className="text-sm font-semibold">{r.author}</p>
          <p className="text-xs text-muted-foreground">{r.role}</p>
        </div>
      </figcaption>
    </figure>
  );
}

/** Défilement automatique infini (marquee), pause au survol. */
export function Reviews() {
  const doubled = [...REVIEWS, ...REVIEWS];
  return (
    <section id="avis" className="overflow-hidden py-24 md:py-32">
      <div className="container">
        <Reveal className="mb-12 max-w-2xl">
          <p className="speed-eyebrow mb-4">Avis clients</p>
          <h2 className="display text-4xl sm:text-5xl">Ils jouent <span className="text-primary">chez nous</span></h2>
        </Reveal>
      </div>

      <div className="group relative" role="region" aria-label="Avis de nos clients">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max gap-6 animate-marquee px-6 group-hover:[animation-play-state:paused]">
          {doubled.map((r, i) => (
            <ReviewCard key={`${r.id}-${i}`} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
}
