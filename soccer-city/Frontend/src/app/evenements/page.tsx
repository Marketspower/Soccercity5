import type { Metadata } from "next";
import { Briefcase, Cake, GraduationCap, Medal, PartyPopper, Trophy } from "lucide-react";
import { EventForm } from "@/components/events/event-form";

export const metadata: Metadata = {
  title: "Organiser un événement",
  description: "Anniversaires, tournois, événements d'entreprise, sorties scolaires : privatisez Soccer City.",
};

const TYPES = [
  { Icon: Cake, title: "Anniversaires", text: "Terrain privatisé, animation et espace gâteau pour un anniversaire inoubliable." },
  { Icon: Trophy, title: "Tournois", text: "Format championnat ou coupe, arbitres officiels et tableau des scores sur écran géant." },
  { Icon: Briefcase, title: "Entreprises", text: "Team-building clé en main : matchs, traiteur et captation vidéo." },
  { Icon: GraduationCap, title: "Écoles", text: "Sorties scolaires encadrées, créneaux de jour et tarifs de groupe adaptés." },
  { Icon: PartyPopper, title: "Événements privés", text: "Le complexe entier rien que pour vous : soirée, lancement, célébration." },
  { Icon: Medal, title: "Compétitions", text: "Ligues et qualifications sur des surfaces homologuées, chronométrage officiel." },
];

export default function EvenementsPage() {
  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container relative">
        <header className="mx-auto mb-16 max-w-2xl text-center">
          <p className="speed-eyebrow mb-4 justify-center">Événements privés</p>
          <h1 className="display text-4xl sm:text-6xl">
            Un événement <span className="text-primary">à votre image</span>
          </h1>
          <p className="mt-5 text-muted-foreground">
            De 10 à 500 personnes, notre équipe conçoit votre événement de A à Z.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {TYPES.map(({ Icon, title, text }) => (
              <article key={title} className="card-hover h-full rounded-lg border bg-card p-5">
                <Icon className="mb-3 size-6 text-primary" />
                <h2 className="font-display text-base font-bold">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
          <EventForm />
        </div>
      </div>
    </div>
  );
}