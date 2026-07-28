// components/events/event-detail.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { EventForm } from "@/components/events/event-form";
import type { EventType, GalleryImage, MediaItem } from "@/lib/types";

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
  const { gallery, media, loadGallery, loadMedia, isLoading } = useAppStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les données
  useEffect(() => {
    loadGallery();
    loadMedia();
  }, []);

  // Filtrer les images et médias liés à l'événement (ou tous si aucun n'est associé)
  const eventImages = gallery.filter(img => 
    img.event?.type === eventType || !img.eventId
  );

  const eventVideos = media.filter(v => 
    v.type === 'video' && (v.event?.type === eventType || !v.eventId)
  );

  // Carrousel automatique
  useEffect(() => {
    if (isAutoPlaying && eventImages.length > 1) {
      autoPlayRef.current = setInterval(() => {
        nextImage();
      }, 5000);
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, eventImages.length]);

  const nextImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex((prev) => (prev + 1) % eventImages.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const prevImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex((prev) => (prev - 1 + eventImages.length) % eventImages.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const icon = EVENT_ICONS[eventType];
  const description = EVENT_DESCRIPTIONS[eventType];
  const features = EVENT_FEATURES[eventType];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">⚽</div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

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
          <div>
            {/* En-tête de l'événement */}
            <div className="mb-6">
              <span className="text-4xl block mb-2">{icon}</span>
              <h1 className="text-4xl font-bold">{eventType}</h1>
              <p className="text-muted-foreground mt-2">{description}</p>
            </div>

            {/* Carrousel d'images */}
            {eventImages.length > 0 && (
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                <div 
                  className="flex transition-transform duration-500 ease-out h-full"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {eventImages.map((img, index) => (
                    <div key={img.id} className="min-w-full h-full relative">
                      <img
                        src={img.imageUrl}
                        alt={img.alt || `${eventType} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Contrôles du carrousel */}
                {eventImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all hover:scale-110"
                      aria-label="Image précédente"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all hover:scale-110"
                      aria-label="Image suivante"
                    >
                      <ChevronRight className="size-6" />
                    </button>

                    <button
                      onClick={toggleAutoPlay}
                      className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                      aria-label={isAutoPlaying ? "Pause" : "Lecture automatique"}
                    >
                      {isAutoPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>

                    {/* Indicateurs */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {eventImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setCurrentImageIndex(index);
                          }}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex 
                              ? 'bg-white w-6' 
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                          aria-label={`Aller à l'image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Vidéos */}
            {eventVideos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Vidéos associées</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {eventVideos.slice(0, 2).map((video) => (
                    <div key={video.id} className="rounded-lg overflow-hidden bg-muted aspect-video">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-primary/10">
                          <Play className="size-12 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caractéristiques */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Ce qui est inclus</h3>
              <ul className="grid grid-cols-2 gap-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-primary">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
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
                  Remplissez le formulaire ci-dessous. Notre équipe vous contactera dans les plus brefs délais.
                </p>

                {/* Infos rapides */}
                <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-primary" />
                    <span>Réponse sous 24h</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="size-4 text-primary" />
                    <span>Jusqu'à 500 pers.</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-primary" />
                    <span>7j/7</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-primary" />
                    <span>Saint-Constant</span>
                  </div>
                </div>

                <EventForm selectedType={eventType} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}