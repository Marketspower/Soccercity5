"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, MessageSquarePlus, Star } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface PublicReview {
  id: string;
  author: string;
  role: string | null;
  rating: number;
  text: string;
  verified: boolean;
  created_at: string;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} étoiles sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < n ? "fill-primary text-primary" : "text-muted"}`} />
      ))}
    </div>
  );
}

function ReviewCard({ r }: { r: PublicReview }) {
  const initials = r.author.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <figure className="w-[300px] shrink-0 rounded-lg border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-glow-sm sm:w-[380px]">
      <Stars n={r.rating} />
      <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">« {r.text} »</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold italic text-primary">
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold">{r.author}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {r.verified && <BadgeCheck className="size-3.5 text-primary" />}
            {r.verified ? "Client vérifié" : r.role || "Client"} ·{" "}
            {new Date(r.created_at).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

/** Avis approuvés dans l'admin. Section masquée tant qu'il n'y en a aucun. */
export function Reviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    supabase
      .from("public_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setReviews((data as PublicReview[]) || []));
  }, []);

  if (reviews.length === 0) return null;

  const average = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  // Défilement continu seulement s'il y a assez d'avis pour remplir l'écran
  const scrolling = reviews.length >= 3;
  const items = scrolling ? [...reviews, ...reviews] : reviews;

  return (
    <section id="avis" className="overflow-hidden py-24 md:py-32">
      <div className="container">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="speed-eyebrow mb-4 justify-center">Témoignages</p>
          <h2 className="display text-4xl sm:text-5xl">Ce qu&apos;ils disent de <span className="text-primary">Soccer City</span></h2>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Stars n={Math.round(average)} />
            <span>
              <b className="text-foreground">{average.toFixed(1)}</b> / 5 · {reviews.length} avis
            </span>
          </p>
        </Reveal>
      </div>

      <div className="group relative" role="region" aria-label="Avis de nos clients">
        {scrolling && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
          </>
        )}
        <div
          className={
            scrolling
              ? "flex w-max gap-6 animate-marquee px-6 group-hover:[animation-play-state:paused]"
              : "container flex flex-wrap justify-center gap-6"
          }
        >
          {items.map((r, i) => (
            <ReviewCard key={`${r.id}-${i}`} r={r} />
          ))}
        </div>
      </div>

      <div className="mt-10 text-center">
        <Button asChild variant="outline">
          <Link href="/avis">
            <MessageSquarePlus className="size-4" /> Laisser un avis
          </Link>
        </Button>
      </div>
    </section>
  );
}
