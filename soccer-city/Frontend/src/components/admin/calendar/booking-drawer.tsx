// components/admin/calendar/booking-drawer.tsx
"use client";

import { useEffect } from "react";
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
}

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

export function BookingDrawer({ booking, onClose, onSetStatus }: Props) {
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
          {booking.price !== null && <Row label="Montant">{formatCAD(booking.price)}</Row>}
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
