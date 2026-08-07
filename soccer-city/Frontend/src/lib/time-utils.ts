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

/** Vrai si les intervalles [startA, endA) et [startB, endB) se chevauchent. */
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