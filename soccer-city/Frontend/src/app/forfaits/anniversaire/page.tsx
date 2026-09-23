// app/forfaits/anniversaire/page.tsx
// Réservation du forfait anniversaire : calendrier → heure de début libre
// (le bloc complet de 2 h 30 est vérifié contre les réservations existantes)
// → coordonnées → paiement (totalité ou acompte).
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchBookedSpans, type BookedSpan } from "@/lib/api";
import {
  computeTaxes,
  computeDeposit,
  loadTaxSettings,
  loadPaymentSettings,
  DEFAULT_TAX_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  type TaxSettings,
  type PaymentSettings,
} from "@/lib/taxes";
import { ANNIVERSAIRE } from "@/config/packages";
import { PaymentOptions } from "@/components/booking/payment-options";
import type { PaymentOption } from "@/lib/types";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hourToTime = (h: number) => `${pad(Math.floor(h))}:${h % 1 ? "30" : "00"}`;
const hourLabel = (h: number) => `${pad(Math.floor(h))} h ${h % 1 ? "30" : "00"}`;
const timeToHour = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
};
const fmt = (n: number) => `${n.toFixed(2)} $`;

export default function AnniversairePage() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [day, setDay] = useState<string | null>(null);
  const [spans, setSpans] = useState<BookedSpan[]>([]);
  const [loadingSpans, setLoadingSpans] = useState(false);
  const [start, setStart] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", guests: "" });
  const [payOption, setPayOption] = useState<PaymentOption>("full");
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [paySettings, setPaySettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTaxSettings().then(setTaxSettings).catch(() => {});
    loadPaymentSettings().then(setPaySettings).catch(() => {});
  }, []);

  // Créneaux occupés du jour choisi (réservations + blocages admin)
  useEffect(() => {
    if (!day) return;
    setLoadingSpans(true);
    setStart(null);
    fetchBookedSpans(day, day)
      .then((all) =>
        setSpans(all.filter((s) => s.date <= day && s.endDate >= day))
      )
      .catch(() => setSpans([]))
      .finally(() => setLoadingSpans(false));
  }, [day]);

  const cells = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const startDate = new Date(y, m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [month]);

  const todayIso = toIso(now);
  const dur = ANNIVERSAIRE.durationHours;

  const freeStart = (h: number) => {
    const s = h;
    const e = h + dur;
    return !spans.some((sp) => {
      // Sur un même jour : chevauchement d'heures classique
      const a = sp.date < (day as string) ? 0 : timeToHour(sp.startTime);
      const b = sp.endDate > (day as string) ? 24 : timeToHour(sp.endTime);
      return s < b && e > a;
    });
  };

  const startHours = useMemo(() => {
    const list: number[] = [];
    for (let h = ANNIVERSAIRE.firstStartHour; h <= ANNIVERSAIRE.lastStartHour; h += 0.5) {
      list.push(h);
    }
    return list;
  }, []);

  const taxes = computeTaxes(ANNIVERSAIRE.price, taxSettings);
  const { deposit } = computeDeposit(taxes.total, paySettings);

  const handlePay = async () => {
    if (!day || start === null) return;
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
          kind: "anniversaire",
          date: day,
          startTime: hourToTime(start),
          endTime: hourToTime(start + dur),
          guests: form.guests ? Number(form.guests) : null,
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

  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container relative mx-auto max-w-2xl">
        <Link href="/forfaits" className="text-sm font-semibold text-primary hover:underline">
          ← Retour aux forfaits
        </Link>
        <h1 className="display mt-3 text-3xl sm:text-4xl">
          🎉 Forfait <span className="text-primary">anniversaire</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ANNIVERSAIRE.price} $ + taxes · 2 h 30 : 1 h 30 d&apos;animation, gâteau
          et fête, puis 1 h de match de soccer.
        </p>

        {/* ===== Étape 1 : le jour ===== */}
        <h2 className="mt-8 mb-3 text-lg font-bold">1. Choisissez votre jour</h2>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="rounded-lg border px-3 py-1.5 text-sm hover:border-primary"
          >
            ◀
          </button>
          <p className="font-bold capitalize">
            {month.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="rounded-lg border px-3 py-1.5 text-sm hover:border-primary"
          >
            ▶
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card/60">
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const dIso = toIso(d);
              const out = d.getMonth() !== month.getMonth();
              const past = dIso < todayIso;
              const sel = dIso === day;
              return (
                <button
                  key={dIso}
                  type="button"
                  disabled={out || past}
                  onClick={() => setDay(dIso)}
                  className={[
                    "aspect-[1.3] border-b border-r border-white/5 text-sm font-semibold transition-colors",
                    out || past ? "text-muted-foreground/25" : "hover:bg-primary/15",
                    sel ? "bg-primary text-primary-foreground hover:bg-primary" : "",
                    dIso === todayIso && !sel ? "text-primary" : "",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Étape 2 : l'heure de début ===== */}
        {day && (
          <>
            <h2 className="mt-8 mb-2 text-lg font-bold">
              2. Choisissez votre heure de début
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Le bloc complet de 2 h 30 est réservé à partir de l&apos;heure
              choisie. Les heures barrées chevauchent une réservation existante.
            </p>
            {loadingSpans ? (
              <p className="text-sm text-muted-foreground">Vérification des disponibilités…</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {startHours.map((h) => {
                  const free = freeStart(h);
                  const sel = start === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={!free}
                      onClick={() => setStart(h)}
                      className={[
                        "rounded-lg border py-2.5 text-sm font-bold transition-colors",
                        free
                          ? "hover:border-primary hover:text-primary"
                          : "cursor-not-allowed opacity-25 line-through",
                        sel ? "border-primary bg-primary text-primary-foreground hover:text-primary-foreground" : "",
                      ].join(" ")}
                    >
                      {hourLabel(h)}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== Étape 3 : coordonnées + paiement ===== */}
        {day && start !== null && (
          <>
            <h2 className="mt-8 mb-3 text-lg font-bold">3. Coordonnées et paiement</h2>
            <div className="mb-4 rounded-xl border bg-card/60 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Date</span>
                <span>
                  {new Date(day + "T12:00").toLocaleDateString("fr-CA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Horaire</span>
                <span>
                  {hourLabel(start)} → {hourLabel(start + dur)} (2 h 30)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Déroulement</span>
                <span className="text-right">
                  Fête {hourLabel(start)}–{hourLabel(start + 1.5)}, match{" "}
                  {hourLabel(start + 1.5)}–{hourLabel(start + dur)}
                </span>
              </div>
              <div className="mt-2 border-t pt-2">
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{fmt(taxes.subtotal)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">TPS ({taxSettings.gstRate} %)</span>
                  <span>{fmt(taxes.gst)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">TVQ ({taxSettings.qstRate} %)</span>
                  <span>{fmt(taxes.qst)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-bold">
                  <span>Total</span>
                  <span>{fmt(taxes.total)} CAD</span>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              <input
                type="text"
                placeholder="Nom complet"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
              <input
                type="email"
                placeholder="Courriel"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
              <input
                type="number"
                min={1}
                placeholder="Nombre d'invités (optionnel)"
                value={form.guests}
                onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
            </div>

            <PaymentOptions
              taxes={taxes}
              settings={paySettings}
              value={payOption}
              onChange={setPayOption}
            />

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              className="mt-5 w-full rounded-md bg-primary py-3.5 font-display font-extrabold uppercase italic tracking-wider text-primary-foreground transition-opacity hover:bg-primary-bright disabled:opacity-60"
            >
              {loading
                ? "Redirection vers le paiement…"
                : payOption === "deposit"
                  ? `Payer l'acompte de ${fmt(deposit)}`
                  : `Payer ${fmt(taxes.total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
