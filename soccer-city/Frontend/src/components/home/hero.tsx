// components/home/hero.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarCheck, ChevronDown, Clock, MapPin, PartyPopper, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/motion/counter";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { CONTACT } from "@/lib/data";

interface HomepageStats {
  fields_count: number;
  reservations_count: number;
  satisfaction_percent: number;
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const { fields } = useAppStore();
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [homepageStats, setHomepageStats] = useState<HomepageStats | null>(null);

  useEffect(() => {
    // ✅ Statistiques réelles en temps réel via une fonction SQL sécurisée
    // (aucune donnée client individuelle n'est exposée, uniquement des agrégats).
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc("get_homepage_stats").single();
        if (error) throw error;
        setHomepageStats(data as HomepageStats);
      } catch (error) {
        console.error("❌ Erreur chargement statistiques:", error);
      }
    };
    fetchStats();

    // Récupérer la vidéo mise en avant depuis Supabase Storage (facultatif :
    // si aucune vidéo, la photo du terrain reste le fond du hero).
    const fetchVideo = async () => {
      try {
        const { data, error } = await supabase
          .from('media')
          .select('url, thumbnail')
          .eq('type', 'video')
          .eq('is_featured', true)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setVideoUrl(data.url);
          if (data.thumbnail) {
            setPosterUrl(data.thumbnail);
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement vidéo:', error);
      }
    };

    fetchVideo();
  }, []);

  return (
    <>
      <section
        ref={ref}
        className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#050607]"
      >
        {/* ===== Fond : photo du terrain (style Foot5) + vidéo mise en avant si dispo ===== */}
        <motion.div style={{ y: bgY }} className="absolute inset-0 gpu" aria-hidden>
          <Image
            src="/images/hero-field.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {videoUrl && (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster={posterUrl || '/images/hero-field.jpg'}
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          )}

          {/* Voile sombre à la Foot5 pour la lisibilité */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
        </motion.div>

        {/* ===== Contenu centré (style Foot5) ===== */}
        <motion.div
          style={{ opacity: fade }}
          className="container relative z-10 flex flex-1 flex-col items-center justify-center pt-28 pb-24 text-center"
        >
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mb-4 font-display text-sm font-bold uppercase italic tracking-[0.3em] text-primary sm:text-base"
          >
            Centre de soccer 5 contre 5
          </motion.p>

          <h1 className="display text-6xl leading-[0.95] text-white sm:text-8xl lg:text-9xl">
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                Bienvenue
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-6 max-w-2xl text-base text-white/80 sm:text-lg"
          >
            Terrain intérieur premium en gazon synthétique, éclairage LED et
            réservation en ligne simplifiée. Matchs, anniversaires, tournois,
            activités d&apos;entreprise — jouez toute l&apos;année, peu importe la météo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Button
              asChild
              variant="brand"
              size="lg"
              className="animate-pulse-glow rounded-full px-10"
            >
              <Link href="/reservation" className="flex items-center gap-2">
                <CalendarCheck className="size-5" />
                Réservez maintenant
              </Link>
            </Button>
            <Button
              asChild
              variant="glass"
              size="lg"
              className="rounded-full px-8 text-white"
            >
              <Link href="/evenements" className="flex items-center gap-2">
                <PartyPopper className="size-5" />
                Organiser un événement
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/40"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          aria-hidden
        >
          <ChevronDown className="size-6" />
        </motion.div>
      </section>

      {/* ===== Bandeau infos (style Foot5 : Heures / Adresse / Téléphone) ===== */}
      <section className="container relative z-10 -mt-2 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="grid gap-px overflow-hidden rounded-lg glass sm:grid-cols-3"
        >
          <div className="flex items-start gap-4 bg-white/[0.02] p-6">
            <Clock className="mt-1 size-6 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="display text-lg text-white">Heures d&apos;ouverture</h3>
              <p className="mt-1 text-sm text-white/60">{CONTACT.hours}</p>
            </div>
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(CONTACT.mapsQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.05]"
          >
            <MapPin className="mt-1 size-6 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="display text-lg text-white">Adresse</h3>
              <p className="mt-1 text-sm text-white/60">{CONTACT.address}</p>
            </div>
          </a>
          <a
            href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`}
            className="flex items-start gap-4 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.05]"
          >
            <Phone className="mt-1 size-6 shrink-0 text-primary" />
            <div className="text-left">
              <h3 className="display text-lg text-white">Téléphone</h3>
              <p className="mt-1 text-sm text-white/60">{CONTACT.phone}</p>
            </div>
          </a>
        </motion.div>

        {/* Statistiques en temps réel (logique conservée) */}
        <motion.dl
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-lg glass sm:grid-cols-4"
        >
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Terrains</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={fields.length} />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">
              Terrains
            </p>
          </div>
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Matchs</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={homepageStats?.reservations_count ?? 0} />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">
              Matchs joués
            </p>
          </div>
          <div className="bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Satisfaction</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              <Counter value={homepageStats?.satisfaction_percent ?? 0} suffix="%" />
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">
              Satisfaction
            </p>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/[0.02] p-5 text-center sm:p-6">
            <dt className="sr-only">Disponibilité</dt>
            <dd className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
              7j/7
            </dd>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">
              Ouvert
            </p>
          </div>
        </motion.dl>

        {/* Indicateur de disponibilité temps réel */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-white/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch" />
          </span>
          Disponibilités en temps réel · {new Date().toLocaleTimeString("fr-CA")}
        </div>
      </section>
    </>
  );
}
