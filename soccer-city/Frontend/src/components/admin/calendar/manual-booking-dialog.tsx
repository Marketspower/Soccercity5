// components/admin/calendar/manual-booking-dialog.tsx
// Création d'une réservation par l'admin, façon Google Agenda :
// double-clic sur un jour du calendrier → cette fenêtre s'ouvre avec la date
// pré-sélectionnée. L'admin saisit le client (prénom, nom, téléphone), le type
// d'événement et le créneau horaire, peut ajouter d'autres dates (dates au
// choix, non consécutives), puis confirme : une réservation par date est
// enregistrée dans Supabase (status confirmé) et le créneau devient
// indisponible côté site public.
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import {
  loadTaxSettings,
  DEFAULT_TAX_SETTINGS,
  type TaxSettings,
} from "@/lib/taxes";
import { BOOKING_TYPES, BOOKING_TYPE_KEYS } from "@/config/reservation-types";
import { generateTimeOptions, timeToMinutes, rangesOverlap } from "@/lib/time-utils";
import { parseISODate, toISODate, bookingDays, type CalendarBooking } from "@/lib/calendar-bookings";

const OPENING = "08:00";
const CLOSING = "23:00";
const STEP_MINUTES = 30;
const MAX_DATES = 60; // plafond de sécurité (récurrence comprise)

/** Fréquences de récurrence (génération entre une date de début et de fin). */
const RECUR_OPTIONS = [
  { value: "none", label: "Ne se répète pas" },
  { value: "daily", label: "Tous les jours" },
  { value: "weekly", label: "Toutes les semaines (même jour)" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Tous les mois (même jour du mois)" },
] as const;
type RecurFreq = (typeof RECUR_OPTIONS)[number]["value"];

/** Dates générées par la récurrence, bornées [start, end], plafonnées. */
function generateRecurrence(freq: RecurFreq, startIso: string, endIso: string): string[] {
  if (freq === "none" || !startIso || !endIso || endIso < startIso) return [];
  const out: string[] = [];
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const cursor = new Date(start);
  const dayOfMonth = start.getDate();
  while (cursor.getTime() <= end.getTime() && out.length < MAX_DATES) {
    out.push(toISODate(cursor));
    if (freq === "daily") cursor.setDate(cursor.getDate() + 1);
    else if (freq === "weekly") cursor.setDate(cursor.getDate() + 7);
    else if (freq === "biweekly") cursor.setDate(cursor.getDate() + 14);
    else {
      // monthly : même jour du mois ; saute les mois qui ne l'ont pas (ex. 31)
      let next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, dayOfMonth);
      while (next.getDate() !== dayOfMonth && next.getTime() <= end.getTime()) {
        next = new Date(next.getFullYear(), next.getMonth() + 1, dayOfMonth);
      }
      cursor.setTime(next.getTime());
    }
  }
  return out;
}

interface Props {
  open: boolean;
  /** Date (YYYY-MM-DD) du jour double-cliqué — pré-sélectionnée. */
  initialDate: string | null;
  /** Heure de début pré-remplie (double-clic dans la vue semaine). */
  initialTime?: string | null;
  /** Réservations existantes (pour avertir d'un chevauchement). */
  bookings: CalendarBooking[];
  onClose: () => void;
}

export function ManualBookingDialog({ open, initialDate, initialTime, bookings, onClose }: Props) {
  const { addManualReservations, fields } = useAppStore();
  /** Terrain concerné ; vide = tout le complexe (privatisation). */
  const [fieldId, setFieldId] = useState<string>("");

  const [dates, setDates] = useState<string[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<string>("Terrain");
  const [notes, setNotes] = useState("");
  const [force, setForce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Récurrence : fréquence + période (date de début / date de fin)
  const [recurFreq, setRecurFreq] = useState<RecurFreq>("none");
  const [recurStart, setRecurStart] = useState("");
  const [recurEnd, setRecurEnd] = useState("");
  // Montant et encaissement à l'accueil
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [amountStr, setAmountStr] = useState("");
  const [amountIncludesTax, setAmountIncludesTax] = useState(true);
  /** Montant reçu maintenant — vide = la totalité ; 0 = rien (tout en solde). */
  const [receivedStr, setReceivedStr] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "terminal" | "virement">("cash");
  const [payReference, setPayReference] = useState("");

  useEffect(() => {
    loadTaxSettings().then(setTaxSettings).catch(() => {});
  }, []);

  // À l'ouverture : repartir de zéro avec la date double-cliquée.
  useEffect(() => {
    if (!open) return;
    setDates(initialDate ? [initialDate] : []);
    setMonth(initialDate ? parseISODate(initialDate) : new Date());
    setStartTime(initialTime ?? "");
    setEndTime("");
    setRecurFreq("none");
    setRecurStart(initialDate ?? "");
    setRecurEnd("");
    setAmountStr("");
    setAmountIncludesTax(true);
    setReceivedStr("");
    setPayMethod("cash");
    setPayReference("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setType("Terrain");
    setNotes("");
    setForce(false);
    setFieldId("");
    setError("");
  }, [open, initialDate, initialTime]);

  // Récurrence active → la liste des dates est générée depuis la période
  useEffect(() => {
    if (!open || recurFreq === "none") return;
    setDates(generateRecurrence(recurFreq, recurStart, recurEnd));
  }, [open, recurFreq, recurStart, recurEnd]);

  const timeOptions = useMemo(() => generateTimeOptions(OPENING, CLOSING, STEP_MINUTES), []);
  const endOptions = useMemo(
    () => (startTime ? timeOptions.filter((t) => timeToMinutes(t) > timeToMinutes(startTime)) : timeOptions),
    [timeOptions, startTime]
  );

  const sorted = useMemo(() => [...dates].sort(), [dates]);

  // Dates choisies qui chevauchent une réservation déjà au calendrier
  // (même logique d'avertissement que Google Agenda : on prévient, et
  // l'admin peut forcer en connaissance de cause).
  const conflictDates = useMemo(() => {
    if (!startTime || !endTime) return [] as string[];
    return sorted.filter((d) =>
      bookings.some((b) => {
        if (b.status === "cancelled") return false;
        if (!bookingDays(b).includes(d)) return false;
        if (!b.startTime || !b.endTime) return true; // journée complète
        return rangesOverlap(startTime, endTime, b.startTime.slice(0, 5), b.endTime.slice(0, 5));
      })
    );
  }, [sorted, bookings, startTime, endTime]);

  const toggleDate = (iso: string) => {
    setDates((prev) => {
      if (prev.includes(iso)) return prev.filter((d) => d !== iso);
      if (prev.length >= MAX_DATES) return prev;
      return [...prev, iso];
    });
  };

  // Détail des taxes à partir du montant saisi (TTC ou avant taxes)
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const amount = Number(amountStr.replace(",", "."));
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const breakdown = useMemo(() => {
    if (!hasAmount) return null;
    const rate = (taxSettings.gstRate + taxSettings.qstRate) / 100;
    const subtotal = amountIncludesTax ? r2(amount / (1 + rate)) : r2(amount);
    const gst = r2(subtotal * (taxSettings.gstRate / 100));
    const qst = r2(subtotal * (taxSettings.qstRate / 100));
    // En TTC, le total est EXACTEMENT le montant saisi (le sous-total absorbe l'arrondi)
    const total = amountIncludesTax ? r2(amount) : r2(subtotal + gst + qst);
    return { subtotal: amountIncludesTax ? r2(total - gst - qst) : subtotal, gst, qst, total };
  }, [hasAmount, amount, amountIncludesTax, taxSettings]);

  // Montant reçu maintenant : vide = totalité ; doit être entre 0 et le total
  const received = breakdown
    ? receivedStr.trim() === ""
      ? breakdown.total
      : r2(Number(receivedStr.replace(",", ".")))
    : 0;
  const receivedValid =
    !breakdown || (Number.isFinite(received) && received >= 0 && received <= breakdown.total);
  const remaining = breakdown ? r2(breakdown.total - received) : 0;

  const ready =
    sorted.length > 0 &&
    !!startTime &&
    !!endTime &&
    firstName.trim().length > 0 &&
    phone.trim().length > 0 &&
    receivedValid &&
    (conflictDates.length === 0 || force);

  const handleConfirm = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      await addManualReservations({
        dates: sorted,
        startTime,
        endTime,
        firstName,
        lastName,
        phone,
        email,
        type,
        notes,
        fieldId: fieldId || null,
        force,
        payment: breakdown
          ? {
              ...breakdown,
              received,
              method: payMethod,
              reference: payReference.trim() || undefined,
            }
          : null,
      });
      onClose();
    } catch (err: any) {
      setError(
        err?.code === "23P01"
          ? "Ce créneau est déjà occupé sur ce terrain (ou le complexe est privatisé). Choisissez un autre terrain/horaire, ou cochez « forcer »."
          : err?.message || "Impossible d'enregistrer la réservation."
      );
      setSaving(false);
    }
  };

  // ----- mini-calendrier multi-sélection -----
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayIso = toISODate(new Date());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ Nouvelle réservation (accueil)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ===== Dates (multi-sélection) ===== */}
          <div className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonth(new Date(year, m - 1, 1))}
                className="rounded-full border p-1.5 hover:bg-secondary"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-semibold capitalize">
                {month.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => setMonth(new Date(year, m + 1, 1))}
                className="rounded-full border p-1.5 hover:bg-secondary"
                aria-label="Mois suivant"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
              {["L", "M", "M", "J", "V", "S", "D"].map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const iso = toISODate(new Date(year, m, i + 1));
                const past = iso < todayIso;
                const selected = dates.includes(iso);
                const conflict = conflictDates.includes(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={past}
                    onClick={() => toggleDate(iso)}
                    className={[
                      "flex h-8 items-center justify-center rounded-md text-xs transition-colors",
                      past ? "cursor-not-allowed text-muted-foreground/30" : "hover:bg-primary/20",
                      selected && !conflict ? "bg-primary font-bold text-white" : "",
                      selected && conflict ? "bg-destructive font-bold text-white" : "",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cliquez pour ajouter/retirer des jours — la réservation peut couvrir
              plusieurs dates non consécutives, même sur plusieurs mois.
            </p>
            {sorted.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sorted.map((d) => (
                  <span
                    key={d}
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                      conflictDates.includes(d)
                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                        : "border-primary/40 bg-primary/10",
                    ].join(" ")}
                  >
                    {parseISODate(d).toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" })}
                    <button type="button" onClick={() => toggleDate(d)} aria-label={`Retirer ${d}`}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ===== Récurrence ===== */}
          <div className="rounded-lg border bg-card p-3">
            <Label className="mb-2 block">🔁 Récurrence</Label>
            <Select value={recurFreq} onChange={(e) => setRecurFreq(e.target.value as RecurFreq)}>
              {RECUR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            {recurFreq !== "none" && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date de début *</Label>
                    <Input
                      type="date"
                      value={recurStart}
                      onChange={(e) => setRecurStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date de fin *</Label>
                    <Input
                      type="date"
                      value={recurEnd}
                      min={recurStart || undefined}
                      onChange={(e) => setRecurEnd(e.target.value)}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {sorted.length > 0
                    ? `${sorted.length} date(s) générée(s) — retirez-en au besoin dans la liste ci-dessus (max ${MAX_DATES}).`
                    : "Choisissez la période : les dates seront générées automatiquement."}
                </p>
              </>
            )}
          </div>

          {/* ===== Créneau horaire ===== */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Heure de début *</Label>
              <Select value={startTime} onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}>
                <option value="">-- Choisir --</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Heure de fin *</Label>
              <Select value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime}>
                <option value="">-- Choisir --</option>
                {endOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* ===== Client ===== */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
            </div>
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="514 555-0123" />
            </div>
            <div className="space-y-1.5">
              <Label>Courriel (optionnel)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@exemple.com" />
            </div>
          </div>

          {/* ===== Terrain ===== */}
          <div className="space-y-1.5">
            <Label>Terrain *</Label>
            <Select value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
              <option value="">Tout le complexe (privatisation)</option>
              {fields.filter((f) => f.active !== false).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              « Tout le complexe » bloque les deux terrains sur cet horaire.
            </p>
          </div>

          {/* ===== Type d'événement ===== */}
          <div className="space-y-1.5">
            <Label>Type d&apos;événement *</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {BOOKING_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {BOOKING_TYPES[k].icon} {BOOKING_TYPES[k].label}
                </option>
              ))}
            </Select>
          </div>

          {/* ===== Note interne ===== */}
          <div className="space-y-1.5">
            <Label>Note interne (optionnelle)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. : payé comptant à l'accueil, contact du coach…"
            />
          </div>

          {/* ===== Montant et paiement à l'accueil ===== */}
          <div className="rounded-lg border bg-card p-3">
            <Label className="mb-2 block">💰 Montant et paiement (optionnel)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix convenu ($)</Label>
                <Input
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Ex. : 250"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ce montant…</Label>
                <Select
                  value={amountIncludesTax ? "ttc" : "ht"}
                  onChange={(e) => setAmountIncludesTax(e.target.value === "ttc")}
                >
                  <option value="ttc">inclut les taxes (TTC)</option>
                  <option value="ht">est avant taxes (+ TPS/TVQ)</option>
                </Select>
              </div>
            </div>

            {breakdown && (
              <>
                <div className="mt-3 rounded-md border border-white/10 bg-background/60 p-3 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{breakdown.subtotal.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">TPS ({taxSettings.gstRate} %)</span>
                    <span>{breakdown.gst.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">TVQ ({taxSettings.qstRate} %)</span>
                    <span>{breakdown.qst.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                    <span>Total</span>
                    <span>{breakdown.total.toFixed(2)} $</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Reçu maintenant ($)</Label>
                    <Input
                      inputMode="decimal"
                      value={receivedStr}
                      onChange={(e) => setReceivedStr(e.target.value)}
                      placeholder={`${breakdown.total.toFixed(2)} (totalité)`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Méthode</Label>
                    <Select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                    >
                      <option value="cash">💵 Comptant</option>
                      <option value="terminal">💳 Terminal (carte)</option>
                      <option value="virement">🏦 Virement</option>
                    </Select>
                  </div>
                </div>
                {received > 0 && (
                  <Input
                    className="mt-2"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="N° de reçu / référence (optionnel)"
                  />
                )}
                {!receivedValid ? (
                  <p className="mt-2 text-xs text-destructive">
                    Le montant reçu doit être entre 0 et {breakdown.total.toFixed(2)} $.
                  </p>
                ) : remaining > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-amber-400">
                    🟠 Solde à percevoir : {remaining.toFixed(2)} $ — suivi dans la fiche et en
                    Comptabilité, encaissable plus tard.
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-pitch">
                    ✅ Payé en totalité ({payMethod === "cash" ? "comptant" : payMethod === "terminal" ? "terminal" : "virement"}).
                  </p>
                )}
              </>
            )}
            {!breakdown && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Laissez vide pour une réservation sans montant (interne, maintenance…).
              </p>
            )}
          </div>

          {/* ===== Avertissement de conflit ===== */}
          {conflictDates.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              ⚠️ {conflictDates.length} date(s) chevauche(nt) une réservation déjà au
              calendrier sur cet horaire. Retirez-les, changez l&apos;horaire… ou forcez :
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                />
                Je confirme vouloir réserver quand même (double occupation assumée)
              </label>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="brand" className="w-full" onClick={handleConfirm} disabled={!ready || saving}>
            {saving
              ? "Enregistrement…"
              : sorted.length > 1
                ? `Confirmer et bloquer ${sorted.length} dates`
                : "Confirmer et bloquer la date"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Une fois confirmé, ce créneau n&apos;est plus réservable sur le site public.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
