"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarCheck, PartyPopper, ChevronDown, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/motion/counter";
import { useAppStore } from "@/lib/store";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  
  const { fields, reservations } = useAppStore();
  const activeFields = fields.filter(f => f.active).length;
  const todayReservations = reservations.filter(r => r.status === "confirmed").length;

  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#050607]">
      {/* Arrière-plan immersif */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 gpu" aria-hidden>
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          autoPlay muted loop playsInline
          poster="/fields/field-3.svg"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-hero-radial" />
        <div className="absolute inset-0 bg-field-lines" />

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

        <motion.div
          className="absolute -right-24 top-1/2 hidden w-[560px] -translate-y-1/2 opacity-[0.07] lg:block"
          animate={{ x: [0, 14, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src="/logo.png" alt="" width={560} height={400} className="w-full" />
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </motion.div>

      {/* Contenu */}
      <motion.div style={{ opacity: fade }} className="container relative z-10 flex flex-1 flex-col justify-center pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-8 flex items-center gap-4"
        >
          <Image
            src="/logo.png"
            alt="Soccer City"
            width={80}
            height={80}
            className="h-16 w-auto drop-shadow-glow"
            priority
          />
          <div className="h-12 w-px bg-white/10" />
          <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
            Complexe Premium
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="speed-eyebrow mb-6 text-primary/80"
        >
          ⚡ Le jeu s'accélère ici
        </motion.p>

        <h1 className="display max-w-4xl text-5xl leading-[0.95] text-white sm:text-7xl lg:text-8xl">
          {["Réservez", "votre terrain", "en 60 secondes"].map((line, i) => (
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
          {activeFields} terrains d&apos;exception, éclairage LED, réservation instantanée.
          {todayReservations > 0 && ` Déjà ${todayReservations} matchs aujourd'hui.`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button asChild variant="brand" size="lg" className="animate-pulse-glow group">
            <Link href="/reservation" className="flex items-center gap-2">
              <CalendarCheck className="size-5" />
              Réserver un terrain
              <Zap className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg" className="text-white hover:text-white/90 group">
            <Link href="/evenements" className="flex items-center gap-2">
              <PartyPopper className="size-5" />
              Organiser un événement
            </Link>
          </Button>
        </motion.div>

        {/* Statistiques en temps réel */}
        <motion.dl
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.1 }}
          className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg glass sm:grid-cols-4"
        >
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Terrains</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={activeFields} />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">Terrains</p>
          </div>
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Matchs</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={12500} suffix="+" />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">Matchs joués</p>
          </div>
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Satisfaction</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={98} suffix="%" />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">Satisfaction</p>
          </div>
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Expérience</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={8} suffix="+" />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">Années</p>
          </div>
        </motion.dl>

        {/* Indicateur de disponibilité temps réel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 flex items-center gap-3 text-xs text-white/40"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch" />
          </span>
          Disponibilités en temps réel · {new Date().toLocaleTimeString('fr-CA')}
        </motion.div>
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