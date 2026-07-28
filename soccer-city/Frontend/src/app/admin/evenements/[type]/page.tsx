// app/evenements/[type]/page.tsx
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/events/event-detail";
import type { EventType } from "@/lib/types";

interface EventPageProps {
  params: {
    type: string;
  };
}

// Types d'événements valides
const VALID_TYPES: EventType[] = [
  "Anniversaire",
  "Tournoi",
  "Entreprise",
  "École",
  "Événement privé",
  "Compétition"
];

// Générer les métadonnées dynamiques
export async function generateMetadata({ params }: EventPageProps) {
  const type = decodeURIComponent(params.type);
  const validType = VALID_TYPES.find(t => t === type);
  
  if (!validType) {
    return {
      title: "Événement non trouvé",
    };
  }

  const titles: Record<EventType, string> = {
    "Anniversaire": "Organiser un anniversaire sportif",
    "Tournoi": "Organiser un tournoi de soccer",
    "Entreprise": "Organiser un événement d'entreprise",
    "École": "Organiser une sortie scolaire",
    "Événement privé": "Organiser un événement privé",
    "Compétition": "Organiser une compétition"
  };

  return {
    title: `${titles[validType]} | Soccer City`,
    description: `Réservez votre ${validType.toLowerCase()} chez Soccer City. Terrains premium, encadrement professionnel et équipements de qualité.`,
  };
}

export default function EventDetailPage({ params }: EventPageProps) {
  const type = decodeURIComponent(params.type);
  const validType = VALID_TYPES.find(t => t === type);

  if (!validType) {
    notFound();
  }

  return <EventDetail eventType={validType} />;
}