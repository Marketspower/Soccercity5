// components/events/event-detail.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Clock
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { EventForm } from "@/components/events/event-form";
import { EventBooking } from "@/components/events/event-booking";
import { eventPackage } from "@/config/packages";
import type { EventType, GalleryImage, MediaItem } from "@/lib/types";
import { MediaBands } from "@/components/media/media-bands";

const EVENT_ICONS: Record<EventType, string> = {
  "Anniversaire": "🎂",
  "Tournoi": "🏆",
  "Entreprise": "💼",
  "École": "🎓",
  "Événement privé": "🎉",
  "Compétition": "🥇"
};

const EVENT_DESCRIPTIONS: Record<EventType, string> = {
  "Anniversaire": "Célébrez votre anniversaire sur un terrain de soccer premium. Animations, matchs et moments inoubliables pour petits et grands.",
  "Tournoi": "Organisez un tournoi mémorable avec plusieurs équipes. Arbitres certifiés, tableaux de scores et trophées pour les vainqueurs.",
  "Entreprise": "Renforcez la cohésion de votre équipe avec des activités sportives. Team-building, matchs amicaux et esprit d'équipe garantis.",
  "École": "Offrez à vos élèves une expérience sportive éducative et ludique. Encadrement professionnel et activités adaptées à tous les niveaux.",
  "Événement privé": "Créez un moment unique pour votre groupe. Privatisation du terrain, ambiance personnalisée et service sur mesure.",
  "Compétition": "Organisez une compétition officielle avec classement, arbitrage et remise des prix. Structure professionnelle pour tous les niveaux."
};

const EVENT_FEATURES: Record<EventType, string[]> = {
  "Anniversaire": [
    "Terrain privatisé",
    "Ballons de match fournis",
    "Chapeaux et décorations",
    "Gâteau d'anniversaire",
    "Photos souvenirs",
    "Animation par un coach"
  ],
  "Tournoi": [
    "Terrain officiel",
    "Arbitres certifiés",
    "Tableau des scores",
    "Trophées et médailles",
    "Podium de remise",
    "Espace accueil équipes"
  ],
  "Entreprise": [
    "Complexe privatisé",
    "Équipement professionnel",
    "Cafétéria inclusive",
    "Espace détente",
    "Photos de groupe",
    "Animation team-building"
  ],
  "École": [
    "Encadrement pédagogique",
    "Équipement adapté",
    "Activités éducatives",
    "Vestiaires sécurisés",
    "Infirmier sur place",
    "Goûter inclus"
  ],
  "Événement privé": [
    "Personnalisation complète",
    "Décorations sur mesure",
    "Sonorisation incluse",
    "Catering possible",
    "Espace VIP",
    "Photos professionnelles"
  ],
  "Compétition": [
    "Règlement officiel",
    "Arbitres expérimentés",
    "Classement en direct",
    "Récompenses",
    "Statistiques",
    "Diffusion possible"
  ]
};

interface EventDetailProps {
  eventType: EventType;
}

export function EventDetail({ eventType }: EventDetailProps) {
  const { gallery, media, loadGallery, loadMedia } = useAppStore();

  // Charger les données
  useEffect(() => {
    loadGallery();
    loadMedia();
  }, []);

  // Photos et vidéos rattachées à CE type d'événement (choisi dans l'admin).
  // S'il n'y en a pas encore, on affiche la galerie générale en secours.
  const typedImages = [
    ...gallery.filter((img) => img.eventType === eventType),
    ...media
      .filter((m) => m.type === "photo" && m.eventType === eventType)
      .map((m) => ({ id: m.id, imageUrl: m.url, alt: m.title } as GalleryImage)),
  ];
  const eventImages = typedImages.length > 0 ? typedImages : gallery.filter((img) => !img.eventType);

  const typedVideos = media.filter((v) => v.type === "video" && v.eventType === eventType);
  const eventVideos: MediaItem[] = typedVideos;

  const [showCustomForm, setShowCustomForm] = useState(false);
  const pkg = eventPackage(eventType);

  const icon = EVENT_ICONS[eventType];
  const description = EVENT_DESCRIPTIONS[eventType];

  return (
    <div className="min-h-screen pt-28 pb-24">
      <div className="container">
        {/* Retour */}
        <Link 
          href="/evenements" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Retour aux événements
        </Link>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Colonne gauche - Images et médias */}
          <div className="min-w-0">
            {/* En-tête de l'événement */}
            <div className="mb-6">
              <span className="text-4xl block mb-2">{icon}</span>
              <h1 className="text-4xl font-bold">{eventType}</h1>
              <p className="text-muted-foreground mt-2">{description}</p>
            </div>

            {/* Photos et vidéos en bandes défilantes (plein écran au clic) */}
            {(eventImages.length > 0 || eventVideos.length > 0) && (
              <MediaBands
                size="sm"
                className="-mx-4 sm:mx-0"
                rows={[
                  {
                    items: eventImages.map((img, i) => ({
                      id: `p-${img.id}`,
                      kind: "photo" as const,
                      src: img.imageUrl,
                      alt: img.alt || `${eventType} chez Soccer City — photo ${i + 1}`,
                    })),
                  },
                  {
                    reverse: true,
                    items: eventVideos.map((v) => ({
                      id: `v-${v.id}`,
                      kind: "video" as const,
                      src: v.url,
                      alt: v.title,
                      poster: v.thumbnail,
                    })),
                  },
                ]}
              />
            )}
          </div>

          {/* Colonne droite - Formulaire */}
          <div>
            <div className="sticky top-28">
              <div className="bg-card rounded-xl border p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{icon}</span>
                  <h2 className="text-2xl font-bold">Réserver un {eventType.toLowerCase()}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Choisissez vos dates, payez en ligne — votre événement est confirmé
                  immédiatement.
                </p>

                {/* Infos rapides */}
                <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-primary" />
                    <span>Réponse sous 24h</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-primary" />
                    <span>7j/7</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-primary" />
                    <span>Saint-Jean-sur-Richelieu</span>
                  </div>
                </div>

                {/* ===== Réservation en ligne (ou forfait pour l'anniversaire) ===== */}
                {eventType === "Anniversaire" ? (
                  <div className="space-y-3">
                    <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm">
                      🎂 L'anniversaire a son <b>forfait tout inclus</b> : 2 h 30
                      (animation, gâteau et match) à prix fixe.
                    </p>
                    <Link
                      href="/forfaits/anniversaire"
                      className="block w-full rounded-md bg-primary py-3 text-center font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Réserver le forfait anniversaire →
                    </Link>
                  </div>
                ) : pkg ? (
                  <EventBooking eventType={eventType} pkg={pkg} />
                ) : (
                  <EventForm selectedType={eventType} />
                )}

                {/* ===== Projet sur mesure : l'ancien formulaire de demande ===== */}
                {eventType !== "Anniversaire" && pkg && (
                  <div className="mt-6 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm((s) => !s)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showCustomForm
                        ? "Masquer le formulaire sur mesure"
                        : "Projet sur mesure (traiteur, très grand groupe…) ? Envoyez-nous une demande →"}
                    </button>
                    {showCustomForm && (
                      <div className="mt-4">
                        <EventForm selectedType={eventType} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}