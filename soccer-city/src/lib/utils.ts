import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Heures d'ouverture : 08:00 → 23:00, blocs stricts d'une heure. */
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 23;
export const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

export const slotLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;

export const formatDateLong = (date: Date) =>
  format(date, "EEEE d MMMM yyyy", { locale: fr });

export const formatDateShort = (date: Date) => format(date, "d MMM", { locale: fr });

export const toISODate = (date: Date) => format(date, "yyyy-MM-dd");

export const formatCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

/** Générateur pseudo-aléatoire déterministe (seed = string) — utilisé pour
 *  simuler des réservations existantes stables entre les rendus. */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
