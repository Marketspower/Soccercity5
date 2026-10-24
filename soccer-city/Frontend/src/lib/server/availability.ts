// lib/server/availability.ts
// Détection des conflits côté serveur, partagée par toutes les routes.
// Tient compte : des réservations sur plusieurs jours, du terrain
// (field_id NULL = complexe privatisé → bloque tout) et des blocages admin.
import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export interface Span {
  /** Date de début YYYY-MM-DD */
  date: string;
  /** Heure de début HH:MM */
  startTime: string;
  /** Date de fin YYYY-MM-DD (= date pour une seule journée) */
  endDate: string;
  /** Heure de fin HH:MM */
  endTime: string;
}

const shiftDate = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const toTs = (d: string, t: string) => new Date(`${d}T${String(t).slice(0, 5)}:00Z`).getTime();

function overlaps(a: Span, b: Span): boolean {
  return toTs(a.date, a.startTime) < toTs(b.endDate, b.endTime) &&
         toTs(a.endDate, a.endTime) > toTs(b.date, b.startTime);
}

/**
 * Renvoie la liste des dates (date de début de chaque plage demandée)
 * qui entrent en conflit.
 * @param fieldId  terrain demandé, ou null si le complexe entier est privatisé
 */
export async function findConflicts(spans: Span[], fieldId: string | null): Promise<string[]> {
  if (spans.length === 0) return [];
  const supabaseAdmin = getSupabaseAdmin();
  const minDate = spans.reduce((m, s) => (s.date < m ? s.date : m), spans[0].date);
  const maxDate = spans.reduce((m, s) => (s.endDate > m ? s.endDate : m), spans[0].endDate);

  let resQuery = supabaseAdmin
    .from("reservations")
    .select("field_id, date, end_date, start_time, end_time")
    .neq("status", "cancelled")
    .lte("date", maxDate)
    .gte("end_date", minDate);
  if (fieldId) resQuery = resQuery.or(`field_id.eq.${fieldId},field_id.is.null`);

  const [{ data: resRows, error: resErr }, { data: blockRows, error: blockErr }] = await Promise.all([
    resQuery,
    // Borne basse : un blocage dure au plus ~2 mois → pas besoin de tout l'historique
    // (et on évite la limite de 1000 lignes de Supabase).
    supabaseAdmin.from("availability").select("*").lte("date", maxDate).gte("date", shiftDate(minDate, -62)),
  ]);
  if (resErr) throw resErr;
  if (blockErr) throw blockErr;

  const existing: Span[] = [
    ...(resRows || []).map((r: any) => ({
      date: r.date, endDate: r.end_date || r.date,
      startTime: String(r.start_time), endTime: String(r.end_time),
    })),
    ...(blockRows || [])
      .filter((b: any) => b.blocked !== false)
      .filter((b: any) => !fieldId || !b.field_id || b.field_id === fieldId)
      .map((b: any) => ({
        date: b.date, endDate: b.end_date || b.date,
        startTime: String(b.start_time), endTime: String(b.end_time),
      })),
  ].filter((s) => s.endDate >= minDate);

  const conflicts = new Set<string>();
  for (const wanted of spans) {
    if (existing.some((e) => overlaps(wanted, e))) conflicts.add(wanted.date);
  }
  return Array.from(conflicts).sort();
}
