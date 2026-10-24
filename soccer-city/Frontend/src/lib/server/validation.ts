// lib/server/validation.ts
// Validation côté serveur des données envoyées par le navigateur.
import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export const TIMEZONE = "America/Toronto"; // même fuseau que Montréal

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
export const isTime = (v: unknown): v is string => typeof v === "string" && TIME_RE.test(v);
export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 200 && EMAIL_RE.test(v);

export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Téléphone nord-américain (10 ou 11 chiffres) ou international (+…). */
export function isPhone(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 30) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Texte court nettoyé (espaces, longueur max). */
export function cleanText(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

/** Date du jour à Montréal (YYYY-MM-DD). */
export function todayMontreal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** Heure actuelle à Montréal (HH:MM). */
export function nowTimeMontreal(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date());
}

/** Ajoute n jours à une date ISO (sans souci de fuseau). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates ISO (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000
  );
}

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Heures d'ouverture (table settings : open_hour / close_hour), défaut 8 h – 23 h. */
export async function loadOpeningHours(): Promise<{ open: number; close: number }> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("settings")
      .select("key, value")
      .in("key", ["open_hour", "close_hour"]);
    const map = new Map((data || []).map((r: any) => [r.key, Number(r.value)]));
    const open = map.get("open_hour");
    const close = map.get("close_hour");
    return {
      open: Number.isFinite(open) && open! >= 0 && open! < 24 ? open! : 8,
      close: Number.isFinite(close) && close! > 0 && close! <= 24 ? close! : 23,
    };
  } catch {
    return { open: 8, close: 23 };
  }
}

/**
 * Vérifie une plage horaire d'une journée : format, ouverture, et pas
 * dans le passé si la date est aujourd'hui. Renvoie un message d'erreur ou null.
 */
export function checkDaySlot(
  date: string,
  startTime: string,
  endTime: string,
  hours: { open: number; close: number },
  maxDaysAhead = 365
): string | null {
  if (!isDate(date)) return "Date invalide.";
  if (!isTime(startTime) || !isTime(endTime)) return "Heure invalide.";
  const today = todayMontreal();
  if (date < today) return `La date ${date} est déjà passée.`;
  if (date > addDays(today, maxDaysAhead)) {
    return maxDaysAhead >= 365
      ? `Réservation possible jusqu'à ${Math.round(maxDaysAhead / 30)} mois à l'avance.`
      : "Date trop éloignée.";
  }
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  if (e <= s) return "L'heure de fin doit être après l'heure de début.";
  if (s < hours.open * 60 || e > hours.close * 60) {
    return `Le complexe est ouvert de ${hours.open} h à ${hours.close} h.`;
  }
  if (date === today && s <= toMinutes(nowTimeMontreal())) {
    return "Cette heure est déjà passée aujourd'hui.";
  }
  return null;
}
