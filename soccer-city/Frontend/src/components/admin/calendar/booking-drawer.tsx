// components/admin/calendar/booking-drawer.tsx
"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCAD } from "@/lib/utils";
import { loadTaxSettings, DEFAULT_TAX_SETTINGS, type TaxSettings } from "@/lib/taxes";
import { BOOKING_TYPES } from "@/config/reservation-types";
import {
  parseISODate,
  timeLabel,
  STATUS_LABEL,
  type CalendarBooking,
} from "@/lib/calendar-bookings";
import type { ReservationStatus } from "@/lib/types";

interface Props {
  booking: CalendarBooking | null;
  onClose: () => void;
  onSetStatus: (booking: CalendarBooking, status: ReservationStatus) => void;
  /** Encaisse le solde (acompte) — réservations uniquement. */
  onMarkBalancePaid?: (
    booking: CalendarBooking,
    info: { method: "terminal" | "cash" | "virement"; reference?: string }
  ) => void;
  /** Enregistre le montant + un paiement à l'accueil sur une réservation
   *  ajoutée par l'admin qui n'a pas encore de prix. */
  onRecordPayment?: (
    booking: CalendarBooking,
    payment: {
      subtotal: number;
      gst: number;
      qst: number;
      total: number;
      received: number;
      method: "terminal" | "cash" | "virement";
      reference?: string;
    }
  ) => void;
}

const BALANCE_METHODS = [
  { value: "terminal", label: "💳 Terminal (carte)" },
  { value: "cash", label: "💵 Comptant" },
  { value: "virement", label: "🏦 Virement" },
] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-white/10 pb-2.5 text-sm">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function BookingDrawer({ booking, onClose, onSetStatus, onMarkBalancePaid, onRecordPayment }: Props) {
  const [collecting, setCollecting] = useState(false);
  const [method, setMethod] = useState<"terminal" | "cash" | "virement">("terminal");
  const [reference, setReference] = useState("");
  // Encaissement d'un paiement (réservation accueil sans montant)
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [paying, setPaying] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [ttc, setTtc] = useState(true);
  const [receivedStr, setReceivedStr] = useState("");
  const [payMethod, setPayMethod] = useState<"terminal" | "cash" | "virement">("cash");
  const [payReference, setPayReference] = useState("");

  useEffect(() => {
    loadTaxSettings().then(setTaxSettings).catch(() => {});
  }, []);

  // Réinitialise les mini-formulaires quand on change de réservation
  useEffect(() => {
    setCollecting(false);
    setMethod("terminal");
    setReference("");
    setPaying(false);
    setAmountStr("");
    setTtc(true);
    setReceivedStr("");
    setPayMethod("cash");
    setPayReference("");
  }, [booking?.id]);

  useEffect(() => {
    if (!booking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [booking, onClose]);

  if (!booking) return null;

  const cfg = BOOKING_TYPES[booking.type];

  // ===== Calculs pour l'encaissement accueil (réservation sans montant) =====
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const amount = Number(amountStr.replace(",", "."));
  const rate = (taxSettings.gstRate + taxSettings.qstRate) / 100;
  const breakdown =
    Number.isFinite(amount) && amount > 0
      ? (() => {
          const subtotalRaw = ttc ? amount / (1 + rate) : amount;
          const gst = r2((subtotalRaw * taxSettings.gstRate) / 100);
          const qst = r2((subtotalRaw * taxSettings.qstRate) / 100);
          const total = ttc ? r2(amount) : r2(subtotalRaw + gst + qst);
          return { subtotal: r2(total - gst - qst), gst, qst, total };
        })()
      : null;
  const received = breakdown
    ? receivedStr.trim() === ""
      ? breakdown.total
      : r2(Number(receivedStr.replace(",", ".")))
    : 0;
  const receivedValid =
    !!breakdown && Number.isFinite(received) && received >= 0 && received <= breakdown.total;
  const needsPricing =
    booking.source === "reservation" &&
    booking.addedByAdmin &&
    (booking.total ?? 0) === 0 &&
    booking.status !== "cancelled";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-2xl"
        role="dialog"
        aria-label="Détail de la réservation"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-bold">Détail de la réservation</h2>
          <Button variant="ghost" size="icon" onClick={onClose} title="Fermer (Échap)">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5">
          <Row label="Client">
            <span className="font-semibold">{booking.client}</span>
            {booking.company && (
              <span className="block text-xs text-muted-foreground">{booking.company}</span>
            )}
          </Row>
          <Row label="Type">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `${cfg.color}1f`,
                borderColor: `${cfg.color}55`,
                color: cfg.color,
              }}
            >
              {cfg.icon} {cfg.label}
            </span>
            {booking.addedByAdmin && (
              <span className="mt-1 block text-[11px] font-semibold text-amber-400">
                🖊️ Ajoutée à l&apos;accueil (sans paiement en ligne)
              </span>
            )}
          </Row>
          <Row label="Date">
            {parseISODate(booking.date).toLocaleDateString("fr-CA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {booking.endDate && (
              <span className="block text-xs text-muted-foreground">
                jusqu&apos;au{" "}
                {parseISODate(booking.endDate).toLocaleDateString("fr-CA", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            )}
          </Row>
          <Row label="Heure">{timeLabel(booking)}</Row>
          <Row label="Statut">
            <Badge
              variant={
                booking.status === "confirmed"
                  ? "pitch"
                  : booking.status === "pending"
                    ? "warning"
                    : "destructive"
              }
            >
              {STATUS_LABEL[booking.status]}
            </Badge>
          </Row>
          <Row label="Téléphone">
            <a href={`tel:${booking.phone}`} className="text-primary hover:underline">
              {booking.phone}
            </a>
          </Row>
          <Row label="Courriel">
            <a href={`mailto:${booking.email}`} className="text-primary hover:underline">
              {booking.email}
            </a>
          </Row>
          {needsPricing ? null : booking.price !== null && booking.total !== null ? (
            <>
              <Row label="Sous-total">{formatCAD(booking.price)}</Row>
              {booking.taxGst !== null && <Row label="TPS">{formatCAD(booking.taxGst)}</Row>}
              {booking.taxQst !== null && <Row label="TVQ">{formatCAD(booking.taxQst)}</Row>}
              <Row label="Total">
                <span className="font-bold">{formatCAD(booking.total)}</span>
              </Row>
            </>
          ) : (
            booking.price !== null && <Row label="Montant">{formatCAD(booking.price)}</Row>
          )}

          {/* ===== Encaisser un paiement (réservation accueil sans montant) ===== */}
          {needsPricing && onRecordPayment && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3.5 text-sm">
              <p className="font-bold text-primary">💰 Aucun montant enregistré</p>
              {paying ? (
                <div className="mt-3 space-y-2.5 rounded-md border border-white/10 bg-background/60 p-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="Prix convenu ($)"
                      className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <select
                      value={ttc ? "ttc" : "ht"}
                      onChange={(e) => setTtc(e.target.value === "ttc")}
                      className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="ttc">taxes incluses</option>
                      <option value="ht">avant taxes</option>
                    </select>
                  </div>
                  {breakdown && (
                    <p className="text-[11px] text-muted-foreground">
                      Sous-total {breakdown.subtotal.toFixed(2)} $ · TPS {breakdown.gst.toFixed(2)} $ ·
                      TVQ {breakdown.qst.toFixed(2)} $ · <b>Total {breakdown.total.toFixed(2)} $</b>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      inputMode="decimal"
                      value={receivedStr}
                      onChange={(e) => setReceivedStr(e.target.value)}
                      placeholder={breakdown ? `Reçu : ${breakdown.total.toFixed(2)}` : "Reçu maintenant ($)"}
                      className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                      className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {BALANCE_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="N° de reçu / référence (optionnel)"
                    className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  {breakdown && receivedValid && received < breakdown.total && (
                    <p className="text-[11px] font-semibold text-amber-400">
                      🟠 Solde à percevoir : {(breakdown.total - received).toFixed(2)} $
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!breakdown || !receivedValid}
                      onClick={() =>
                        breakdown &&
                        onRecordPayment(booking, {
                          ...breakdown,
                          received,
                          method: payMethod,
                          reference: payReference.trim() || undefined,
                        })
                      }
                    >
                      <Check className="mr-1.5 size-4" /> Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => setPaying(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-2 w-full" variant="outline" onClick={() => setPaying(true)}>
                  💰 Encaisser un paiement
                </Button>
              )}
            </div>
          )}

          {/* ===== Paiement : totalité ou acompte + solde ===== */}
          {booking.paymentOption && !needsPricing && (
            (booking.balanceDue ?? 0) > 0 ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm">
                <p className="font-bold text-amber-500">
                  🟠 Acompte payé : {formatCAD(booking.amountPaid ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Solde à percevoir <b>avant l&apos;accès au terrain</b> :
                </p>
                <p className="font-display text-xl font-black italic">
                  {formatCAD(booking.balanceDue as number)}
                </p>
                {booking.source === "reservation" && onMarkBalancePaid && (
                  collecting ? (
                    <div className="mt-3 space-y-2.5 rounded-md border border-white/10 bg-background/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Encaisser le solde
                      </p>
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as typeof method)}
                        className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        {BALANCE_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="N° du reçu du terminal (recommandé)"
                        className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => onMarkBalancePaid(booking, { method, reference: reference.trim() || undefined })}
                        >
                          <Check className="mr-1.5 size-4" />
                          Confirmer {formatCAD(booking.balanceDue as number)}
                        </Button>
                        <Button variant="outline" onClick={() => setCollecting(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="mt-2 w-full"
                      variant="outline"
                      onClick={() => setCollecting(true)}
                    >
                      <Check className="mr-1.5 size-4 text-pitch" /> Encaisser le solde
                    </Button>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-pitch/40 bg-pitch/10 p-3 text-sm">
                <p className="font-bold text-pitch">✅ Payé en totalité — accès direct au terrain</p>
                {booking.balancePaidAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Solde finalisé le{" "}
                    {new Date(booking.balancePaidAt).toLocaleDateString("fr-CA", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                    {booking.balanceMethod === "terminal" && " · 💳 Terminal"}
                    {booking.balanceMethod === "cash" && " · 💵 Comptant"}
                    {booking.balanceMethod === "virement" && " · 🏦 Virement"}
                    {booking.balanceReference && ` · reçu ${booking.balanceReference}`}
                  </p>
                )}
              </div>
            )
          )}
          {booking.guests !== null && <Row label="Invités">{booking.guests} personne(s)</Row>}
          {booking.message && (
            <div className="rounded-lg border border-dashed bg-card/60 p-3 text-sm text-muted-foreground">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider">Message</p>
              {booking.message}
            </div>
          )}
        </div>

        <footer className="flex gap-2.5 border-t px-5 py-4">
          <Button
            className="flex-1"
            variant="outline"
            disabled={booking.status === "confirmed"}
            onClick={() => onSetStatus(booking, "confirmed")}
          >
            <Check className="mr-1.5 size-4 text-pitch" /> Confirmer
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            disabled={booking.status === "cancelled"}
            onClick={() => onSetStatus(booking, "cancelled")}
          >
            <X className="mr-1.5 size-4 text-destructive" /> Annuler
          </Button>
        </footer>
      </aside>
    </>
  );
}
