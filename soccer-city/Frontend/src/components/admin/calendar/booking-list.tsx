// components/admin/calendar/booking-list.tsx
"use client";

import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCAD } from "@/lib/utils";
import { BOOKING_TYPES } from "@/config/reservation-types";
import {
  isMultiDay,
  parseISODate,
  timeLabel,
  STATUS_LABEL,
  type CalendarBooking,
} from "@/lib/calendar-bookings";
import type { ReservationStatus } from "@/lib/types";

interface Props {
  bookings: CalendarBooking[];
  onSelect: (booking: CalendarBooking) => void;
  onSetStatus: (booking: CalendarBooking, status: ReservationStatus) => void;
}

export function BookingList({ bookings, onSelect, onSetStatus }: Props) {
  if (bookings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        Aucune réservation ne correspond aux filtres.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b bg-secondary/60 text-left">
            {["Date", "Heure", "Client", "Contact", "Type", "Montant", "Statut", "Actions"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const cfg = BOOKING_TYPES[b.type];
            return (
              <tr
                key={b.id}
                onClick={() => onSelect(b)}
                className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/40"
              >
                <td className="px-4 py-3 tabular-nums">
                  {parseISODate(b.date).toLocaleDateString("fr-CA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {isMultiDay(b) && (
                    <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Jusqu&apos;au {b.endDate}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{timeLabel(b)}</td>
                <td className="px-4 py-3 font-medium">
                  {b.client}
                  {b.company && (
                    <span className="block text-xs text-muted-foreground">{b.company}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {b.email}
                  <br />
                  {b.phone}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${cfg.color}1f`,
                      borderColor: `${cfg.color}55`,
                      color: cfg.color,
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold italic">
                  {b.total !== null
                    ? formatCAD(b.total)
                    : b.price !== null
                      ? formatCAD(b.price)
                      : "—"}
                  {(b.balanceDue ?? 0) > 0 && (
                    <span className="block text-[10px] font-bold not-italic text-amber-500">
                      Solde : {formatCAD(b.balanceDue as number)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      b.status === "confirmed"
                        ? "pitch"
                        : b.status === "pending"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {b.status !== "confirmed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Confirmer"
                        onClick={() => onSetStatus(b, "confirmed")}
                      >
                        <Check className="size-4 text-pitch" />
                      </Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Annuler"
                        onClick={() => onSetStatus(b, "cancelled")}
                      >
                        <X className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
