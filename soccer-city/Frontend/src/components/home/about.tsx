"use client";

import Image from "next/image";
import Link from "next/link";
import { Gauge, MapPin, CalendarCheck, Users, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SpeedLines } from "@/components/motion/speed-lines";

const VALUES = [
  {
    Icon: Gauge,
    title: "Installation moderne",
    text: "Gazon synthétique 5G dernière génération, éclairage LED et marquage professionnel. Un rebond constant, un jeu rapide, une expérience optimale.",
  },
  {
    Icon: MapPin,
    title: "Facilité d'accès",
    text: "Emplacement central avec stationnement gratuit sur place. Arrivez, jouez, repartez — sans complications.",
  },
  {
    Icon: Users,
    title: "Ambiance conviviale",
    text: "Une communauté de joueurs passionnés et un personnel accueillant, sur place de 8 h à 23 h, avec arbitres certifiés sur demande.",
  },
  {
    Icon: MousePointerClick,
    title: "Réservation en ligne",
    text: "Terrain, date, créneau, paiement sécurisé : quatre gestes, zéro appel téléphonique, disponibilités toujours à jour.",
  },
];

export function About() {
  return (
    <section id="apropos" className="container py-24 md:py-32">
      {/* ===== À propos de nous (style Foot5) ===== */}
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <p className="speed-eyebrow mb-4">À propos de nous</p>
            <h2 className="display text-4xl sm:text-5xl">
              Nous sommes le meilleur centre de{" "}
              <span className="text-primary">soccer intérieur</span> de votre ville
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Soccer City est une destination idéale pour les passionnés de soccer,
              débutants comme joueurs expérimentés. Nous offrons une installation
              moderne, un terrain synthétique de grande qualité et une ambiance
              conviviale qui permet de jouer toute l&apos;année, peu importe la météo.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Anniversaires, tournois, activités d&apos;entreprise, sorties scolaires,
              matchs privés ou compétitions — le complexe s&apos;adapte à vos besoins,
              avec vestiaires confortables et espace de détente pour relaxer après
              l&apos;effort.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-8 flex items-center gap-6">
              <Button asChild variant="brand" className="rounded-full px-8">
                <Link href="/evenements">
                  <CalendarCheck className="size-4" /> Découvrir nos offres
                </Link>
              </Button>
              <SpeedLines className="hidden w-28 sm:block" />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="relative overflow-hidden rounded-lg shadow-card slash-cut">
            <Image
              src="/images/hero-field.jpg"
              alt="Terrain intérieur de Soccer City en gazon synthétique"
              width={952}
              height={1269}
              className="h-[420px] w-full object-cover transition-transform duration-700 hover:scale-105 lg:h-[520px]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <p className="font-display text-lg font-bold italic text-white">
                Notre terrain intérieur — jouez toute l&apos;année ⚽
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ===== Pourquoi choisir notre centre ? (style Foot5) ===== */}
      <div className="mt-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="speed-eyebrow mb-4 justify-center">Nos atouts</p>
          <h2 className="display text-3xl sm:text-4xl">
            Pourquoi choisir <span className="text-primary">notre centre ?</span>
          </h2>
        </Reveal>

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ Icon, title, text }) => (
            <StaggerItem key={title}>
              <article className="card-hover group h-full rounded-lg border bg-card p-6 text-center slash-cut">
                <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-glow-sm">
                  <Icon className="size-6" />
                </div>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
