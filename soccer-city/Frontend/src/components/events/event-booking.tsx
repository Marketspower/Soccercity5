// components/events/event-booking.tsx
// Réservation d'un événement payée EN LIGNE (prix fixe par jour) :
//   1. le client choisit UNE date ou PLUSIEURS jours (même calendrier
//      multi-sélection que la location de terrain) + la plage horaire
//   2. coordonnées + récapitulatif taxé + totalité/acompte
//   3. paiement Stripe → le webhook crée une réservation par jour
//      (terrain non assigné : l'événement privatise le complexe)
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  format, isBefore, startOfToday, getDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchBookedSpans, type BookedSpan } from "@/lib/api";
import { generateTimeOptions, timeToMinutes } from "@/lib/time-utils";
import {
  computeTaxes, computeDeposit, loadTaxSettings, loadPaymentSettings,
  DEFAULT_TAX_SETTINGS, DEFAULT_PAYMENT_SETTINGS,
  type TaxSettings, type PaymentSettings,
} from "@/lib/taxes";
import { PaymentOptions } from "@/components/booking/payment-options";
import type { EventType, PaymentOption } from "@/lib/types";
import type { EventPackage } from "@/config/packages";

const OPENING = "08:00";
const CLOSING = "23:00";
const STEP_MINUTES = 30;
const MAX_DATES = 30;

const hm = (t: string) => t.slice(0, 5);

function spanOnDay(span: BookedSpan, day: string): { start: number; end: number } | null {
  if (day < span.date || day > span.endDate) return null;
  const start = day === span.date ? timeToMinutes(hm(span.startTime)) : 0;
  const end = day === span.endDate ? timeToMinutes(hm(span.endTime)) : 24 * 60;
  return { start, end };
}

export function EventBooking({
  eventType,
  pkg,
}: {
  eventType: EventType;
  pkg: EventPackage;
}) {
  const [step, setStep] = useState<0 | 1>(0);
  const [month, setMonth] = useState(() => new Date());
  const [dates, setDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookedSpans, setBookedSpans] = useState<BookedSpan[]>([]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", guests: "" });
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [paySettings, setPaySettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [payOption, setPayOption] = useState<PaymentOption>("full");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTaxSettings().then(setTaxSettings).catch(() => {});
    loadPaymentSettings().then(setPaySettings).catch(() => {});
  }, []);

  const sorted = useMemo(() => [...dates].sort(), [dates]);

  useEffect(() => {
    if (sorted.length === 0) return;
    fetchBookedSpans(sorted[0], sorted[sorted.length - 1]).then(setBookedSpans);
  }, [sorted.join(",")]);

  const timeOptions = useMemo(() => generateTimeOptions(OPENING, CLOSING, STEP_MINUTES), []);
  const endOptions = useMemo(
    () => (startTime ? timeOptions.filter((t) => timeToMinutes(t) > timeToMinutes(startTime)) : timeOptions),
    [timeOptions, startTime]
  );

  const toggleDate = (iso: string) => {
    const has = dates.includes(iso);
    if (!has && dates.length >= MAX_DATES) return;
    setDates(has ? dates.filter((d) => d !== iso) : [...dates, iso].sort());
  };

  // Un événement privatise le complexe : conflit si N'IMPORTE QUELLE
  // réservation chevauche la plage horaire sur un des jours choisis.
  const conflictDates = useMemo(() => {
    if (!startTime || !endTime) return [];
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    return sorted.filter((d) =>
      bookedSpans.some((span) => {
        const part = spanOnDay(span, d);
        return part !== null && s < part.end && e > part.start;
      })
    );
  }, [sorted, bookedSpans, startTime, endTime]);

  const subtotal = Math.round(pkg.pricePerDay * sorted.length * 100) / 100;
  const taxes = computeTaxes(subtotal, taxSettings);
  const ready =
    sorted.length > 0 && !!startTime && !!endTime && conflictDates.length === 0;

  const pay = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Veuillez remplir votre nom, courriel et téléphone.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "evenement",
          eventType,
          dates: sorted,
          startTime,
          endTime,
          guests: form.guests ? Number(form.guests) : undefined,
          userName: form.name,
          userEmail: form.email,
          userPhone: form.phone,
          paymentOption: payOption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  /* ===== Étape 1 : dates + horaire ===== */
  if (step === 0) {
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7;
    const today = startOfToday();

    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-primary/10 px-4 py-2.5 text-sm">
          <b className="text-primary">{pkg.pricePerDay} $ / jour</b>
          <span className="text-muted-foreground"> (avant taxes) — {pkg.tagline}</span>
        </p>

        {/* Calendrier : une date OU plusieurs jours */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setMonth((m) => subMonths(m, 1))}
              className="rounded-full border p-2 hover:bg-secondary" aria-label="Mois précédent">
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-semibold capitalize">{format(month, "MMMM yyyy", { locale: fr })}</p>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded-full border p-2 hover:bg-secondary" aria-label="Mois suivant">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const disabled = isBefore(day, today);
              const selected = dates.includes(iso);
              const conflict = conflictDates.includes(iso);
              return (
                <button key={iso} type="button" disabled={disabled} onClick={() => toggleDate(iso)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md text-sm transition-colors",
                    disabled && "cursor-not-allowed text-muted-foreground/30",
                    !disabled && !selected && "hover:bg-primary/20",
                    selected && !conflict && "bg-primary font-bold text-white",
                    selected && conflict && "bg-destructive font-bold text-white"
                  )}>
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cliquez un jour pour une journée unique, ou plusieurs jours (même sur
            plusieurs mois) pour un événement multi-dates.
          </p>
        </div>

        {sorted.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sorted.map((d) => (
              <span key={d}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                  conflictDates.includes(d)
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary/10"
                )}>
                {format(new Date(`${d}T00:00:00`), "EEE d MMM", { locale: fr })}
                <button type="button" onClick={() => toggleDate(d)} aria-label={`Retirer ${d}`}
                  className="hover:opacity-70"><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Plage horaire (identique chaque jour) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
              Heure de début
            </label>
            <select value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }}
              className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary">
              <option value="">-- Choisir --</option>
              {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
              Heure de fin
            </label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!startTime}
              className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary disabled:opacity-40">
              <option value="">-- Choisir --</option>
              {endOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {conflictDates.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            ⚠️ Les dates en rouge chevauchent des réservations existantes sur cet
            horaire.{" "}
            <button type="button" className="font-semibold underline"
              onClick={() => setDates(dates.filter((d) => !conflictDates.includes(d)))}>
              Retirer ces dates
            </button>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="rounded-md border bg-card p-4 text-sm">
            <p>
              <b>{sorted.length} jour{sorted.length > 1 ? "s" : ""}</b> × {pkg.pricePerDay} $
              {startTime && endTime ? ` · ${startTime} – ${endTime} chaque jour` : ""}
            </p>
            <p className="mt-1 font-bold text-primary">
              Sous-total : {subtotal.toFixed(2)} $ <span className="font-normal text-muted-foreground">(+ taxes à l'étape suivante)</span>
            </p>
          </div>
        )}

        <Button variant="brand" className="w-full" disabled={!ready} onClick={() => setStep(1)}>
          Continuer
        </Button>
      </div>
    );
  }

  /* ===== Étape 2 : coordonnées + paiement ===== */
  return (
    <div className="space-y-4">
      <button onClick={() => setStep(0)} className="text-sm text-primary hover:underline">
        ← Modifier les dates
      </button>

      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-semibold">
          {eventType} · {sorted.length} jour{sorted.length > 1 ? "s" : ""} · {startTime} – {endTime}
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span className="tabular-nums">{taxes.subtotal.toFixed(2)} $</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">TPS ({taxSettings.gstRate} %)</span><span className="tabular-nums">{taxes.gst.toFixed(2)} $</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">TVQ ({taxSettings.qstRate} %)</span><span className="tabular-nums">{taxes.qst.toFixed(2)} $</span></div>
          <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span className="tabular-nums">{taxes.total.toFixed(2)} $ CAD</span></div>
        </div>
      </div>

      <div className="space-y-3">
        <Input placeholder="Nom complet" value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input type="email" placeholder="Courriel" value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Input type="tel" placeholder="Téléphone" value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        <Input type="number" min={1} max={500} placeholder="Nombre d'invités (optionnel)" value={form.guests}
          onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))} />
      </div>

      <PaymentOptions taxes={taxes} settings={paySettings} value={payOption} onChange={setPayOption} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button variant="brand" className="w-full" size="lg" disabled={loading} onClick={pay}>
        {loading
          ? "Redirection vers le paiement…"
          : payOption === "deposit" && taxes.subtotal >= paySettings.depositMinSubtotal
            ? `Payer l'acompte de ${computeDeposit(taxes.total, paySettings).deposit.toFixed(2)} $`
            : `Payer ${taxes.total.toFixed(2)} $`}
      </Button>
    </div>
  );
}
