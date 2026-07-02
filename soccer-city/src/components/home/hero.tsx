"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarCheck, PartyPopper, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/motion/counter";
import { STATS } from "@/lib/data";

/**
 * Hero plein écran.
 * Fond : vidéo immersive si /public/hero.mp4 est fourni, sinon
 * scène animée aux couleurs de la marque (faisceaux de projecteurs,
 * grille de terrain, halo bleu). Parallaxe légère au scroll.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#050607]">
      {/* ── Arrière-plan immersif ── */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 gpu" aria-hidden>
        {/* Vidéo optionnelle : déposer hero.mp4 dans /public pour l'activer */}
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          autoPlay muted loop playsInline
          poster="/fields/field-3.svg"
          onError={(e) => ((e.target as HTMLVideoElement).style.display = "none")}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Halo bleu + grille de terrain */}
        <div className="absolute inset-0 bg-hero-radial" />
        <div className="absolute inset-0 bg-field-lines" />

        {/* Faisceaux de projecteurs animés */}
        <motion.div
          className="absolute -top-24 left-[12%] h-[70vh] w-40 rotate-[18deg] bg-gradient-to-b from-primary/25 to-transparent blur-2xl"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-24 right-[16%] h-[75vh] w-52 -rotate-[16deg] bg-gradient-to-b from-primary/20 to-transparent blur-2xl"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Emblème du logo en filigrane, côté droit */}
        <motion.div
          className="absolute -right-24 top-1/2 hidden w-[560px] -translate-y-1/2 opacity-[0.07] lg:block"
          animate={{ x: [0, 14, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src="/brand/emblem.png" alt="" width={560} height={400} className="w-full" />
        </motion.div>

        {/* Fondu vers la section suivante */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </motion.div>

      {/* ── Contenu ── */}
      <motion.div style={{ opacity: fade }} className="container relative z-10 flex flex-1 flex-col justify-center pt-28 pb-16">
        <motion.p
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="speed-eyebrow mb-6"
        >
          Complexe de soccer premium
        </motion.p>

        <h1 className="display max-w-4xl text-5xl leading-[0.95] text-white sm:text-7xl lg:text-8xl">
          {["Le jeu", "s'accélère", "ici."].map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {i === 1 ? <span className="text-shine">{line}</span> : line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className="mt-6 max-w-xl text-base text-white/70 sm:text-lg"
        >
          Quatre terrains d&apos;exception, un éclairage digne des grands stades et une
          réservation en ligne qui prend moins de 60 secondes.
        </motion.p>

        {/* Double CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button asChild variant="brand" size="lg" className="animate-pulse-glow">
            <Link href="/reservation"><CalendarCheck /> Réserver un terrain</Link>
          </Button>
          <Button asChild variant="glass" size="lg" className="text-white">
            <Link href="/evenements"><PartyPopper /> Organiser un événement</Link>
          </Button>
        </motion.div>

        {/* ── Statistiques animées ── */}
        <motion.dl
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.1 }}
          className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg glass sm:grid-cols-4"
        >
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/[0.02] p-5 text-center sm:p-6">
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
                <Counter value={s.value} suffix={s.suffix} />
              </dd>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">{s.label}</p>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      {/* Indicateur de scroll */}
      <motion.div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/40"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        aria-hidden
      >
        <ChevronDown className="size-6" />
      </motion.div>
    </section>
  );
}
