"use client";

import { Gauge, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SpeedLines } from "@/components/motion/speed-lines";

const VALUES = [
  {
    Icon: Gauge,
    title: "Surfaces de niveau pro",
    text: "Gazon synthétique 5G dernière génération et gazon naturel entretenu quotidiennement. Un rebond constant, un jeu rapide.",
  },
  {
    Icon: Timer,
    title: "Réservation en 60 secondes",
    text: "Terrain, date, créneau, confirmation. Quatre gestes, zéro appel téléphonique, disponibilités toujours à jour.",
  },
  {
    Icon: Sparkles,
    title: "Expérience complète",
    text: "Vestiaires impeccables, douches, snack, écran géant et Wi-Fi. Tout est pensé pour l'avant, le pendant et l'après-match.",
  },
  {
    Icon: ShieldCheck,
    title: "Encadrement de confiance",
    text: "Équipe sur place de 8 h à 23 h, arbitres certifiés sur demande et protocole de sécurité pour les groupes d'enfants.",
  },
];

/** Présentation du centre : positionnement + 4 valeurs différenciantes. */
export function About() {
  return (
    <section id="apropos" className="container py-24 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="speed-eyebrow mb-4">Le centre</p>
            <h2 className="display text-4xl sm:text-5xl">
              Plus qu&apos;un terrain, <span className="text-primary">un stade à vous.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Depuis 8 ans, Soccer City réunit les joueurs de tous les niveaux autour d&apos;une
              même exigence : offrir des conditions de jeu professionnelles, accessibles à tous,
              tous les jours. Ligues entre amis, entraînements de clubs, tournois d&apos;entreprise
              ou anniversaires — le complexe s&apos;adapte à votre match.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <SpeedLines className="mt-8 w-28" />
          </Reveal>
        </div>

        {/* Pourquoi nous choisir */}
        <Stagger className="grid gap-6 sm:grid-cols-2">
          {VALUES.map(({ Icon, title, text }) => (
            <StaggerItem key={title}>
              <article className="card-hover group h-full rounded-lg border bg-card p-6 slash-cut">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-glow-sm">
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
