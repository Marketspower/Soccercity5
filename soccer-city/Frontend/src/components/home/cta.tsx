"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export function CtaBanner() {
  return (
    <section className="container pb-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-lg bg-primary p-10 text-center text-white shadow-glow md:p-16 slash-cut">
          <Image
            src="/brand/emblem.png"
            alt=""
            width={420}
            height={300}
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-10 w-72 opacity-15 md:w-96"
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_-20%,rgba(255,255,255,.35),transparent)]" aria-hidden />

          <h2 className="display relative text-3xl sm:text-5xl">Rejoignez-nous&nbsp;!</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">
            Nous sommes impatients de vous accueillir à Soccer City et de partager
            avec vous notre passion pour le soccer. Réservez votre terrain dès
            aujourd’hui et profitez de notre installation exceptionnelle.
          </p>
          <Button asChild size="lg" className="relative mt-8 rounded-full bg-white font-display uppercase italic tracking-wider text-primary hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-xl">
            <Link href="/reservation"><CalendarCheck /> Réservez maintenant</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}