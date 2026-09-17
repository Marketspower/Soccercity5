// config/reservation-types.ts
// Mapping type de réservation → couleur / icône (cahier des charges §4.1.2)
// v1 : fichier de configuration. v2 possible : table Supabase `reservation_types`
// pour rendre le mapping éditable depuis le CMS sans redéploiement.

import type { EventType } from "@/lib/types";

/** "Terrain" = réservation de terrain classique ; les autres = événements privés. */
export type BookingTypeKey = "Terrain" | EventType;

export interface BookingTypeConfig {
  label: string;
  /** Couleur hexadécimale — appliquée en style inline (jamais en classe Tailwind dynamique, sinon purge). */
  color: string;
  /** Icône : repère supplémentaire pour l'accessibilité (daltonisme). */
  icon: string;
}

export const BOOKING_TYPES: Record<BookingTypeKey, BookingTypeConfig> = {
  "Terrain":          { label: "Terrain",          color: "#3b82f6", icon: "🏟️" },
  "Anniversaire":     { label: "Anniversaire",     color: "#22c55e", icon: "🎂" },
  "Tournoi":          { label: "Tournoi",          color: "#f97316", icon: "🏆" },
  "Événement privé":  { label: "Événement privé",  color: "#a855f7", icon: "🎉" },
  "École":            { label: "École",            color: "#06b6d4", icon: "🎓" },
  "Entreprise":       { label: "Entreprise",       color: "#6366f1", icon: "💼" },
  "Compétition":      { label: "Compétition",      color: "#ef4444", icon: "🥇" },
};

export const BOOKING_TYPE_KEYS = Object.keys(BOOKING_TYPES) as BookingTypeKey[];

/** Fond translucide dérivé de la couleur du type (hex + alpha). */
export function typeBg(key: BookingTypeKey, alpha: "14" | "29" | "3d" = "29"): string {
  return `${BOOKING_TYPES[key].color}${alpha}`;
}
