// lib/time-utils.ts

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Génère une liste d'heures entre `start` et `end` par pas de `stepMinutes`. */
export function generateTimeOptions(start: string, end: string, stepMinutes: number): string[] {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const options: string[] = [];
  for (let m = startMin; m <= endMin; m += stepMinutes) {
    options.push(minutesToTime(m));
  }
  return options;
}

/** Vrai si les intervalles [startA, endA) et [startB, endB) se chevauchent (même jour). */
export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function formatDuration(startTime: string, endTime: string): string {
  const minutes = timeToMinutes(endTime) - timeToMinutes(startTime);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

export function computeDurationHours(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
}

// ============================================
// ✅ Nouveau : plages continues sur plusieurs jours
// ============================================

/** Combine une date ISO ("yyyy-MM-dd") et une heure ("HH:mm") en objet Date. */
export function combineDateTime(dateISO: string, time: string): Date {
  return new Date(`${dateISO}T${time}:00`);
}

/** Durée totale en heures entre deux instants (peut dépasser 24h). */
export function computeSpanHours(
  startDateISO: string,
  startTime: string,
  endDateISO: string,
  endTime: string
): number {
  const start = combineDateTime(startDateISO, startTime);
  const end = combineDateTime(endDateISO, endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/** Formate une durée en heures (ex: 51.5) en texte lisible ("2 j 3 h 30"). */
export function formatSpanDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const remainingMinutes = totalMinutes % (60 * 24);
  const h = Math.floor(remainingMinutes / 60);
  const m = remainingMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} j`);
  if (h > 0) parts.push(`${h} h`);
  if (m > 0) parts.push(`${m}`);
  return parts.join(" ") || "0 h";
}

/** Vrai si deux plages continues (potentiellement multi-jours) se chevauchent. */
export function spansOverlap(
  startA: string, startTimeA: string, endA: string, endTimeA: string,
  startB: string, startTimeB: string, endB: string, endTimeB: string
): boolean {
  const aStart = combineDateTime(startA, startTimeA).getTime();
  const aEnd = combineDateTime(endA, endTimeA).getTime();
  const bStart = combineDateTime(startB, startTimeB).getTime();
  const bEnd = combineDateTime(endB, endTimeB).getTime();
  return aStart < bEnd && aEnd > bStart;
}