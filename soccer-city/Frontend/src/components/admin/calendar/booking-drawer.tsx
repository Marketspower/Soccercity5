// components/admin/calendar/booking-drawer.tsx
"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCAD } from "@/lib/utils";
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

export function BookingDrawer({ booking, onClose, onSetStatus, onMarkBalancePaid }: Props) {
  const [collecting, setCollecting] = useState(false);
  const [method, setMethod] = useState<"terminal" | "cash" | "virement">("terminal");
  const [reference, setReference] = useState("");

  // Réinitialise le mini-formulaire quand on change de réservation
  useEffect(() => {
    setCollecting(false);
    setMethod("terminal");
    setReference("");
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
          {booking.price !== null && booking.total !== null ? (
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

          {/* ===== Paiement : totalité ou acompte + solde ===== */}
          {booking.paymentOption && (
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
