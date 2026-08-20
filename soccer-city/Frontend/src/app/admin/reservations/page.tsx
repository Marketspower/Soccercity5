// app/admin/reservations/page.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, FileSpreadsheet, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";
import type { Reservation, ReservationStatus } from "@/lib/types";

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

// ✅ Réservation multi-jours si endDate est renseigné et différent de date
function isMultiDay(r: Reservation) {
  return !!r.endDate && r.endDate !== r.date;
}

function formatDateCell(r: Reservation) {
  if (isMultiDay(r)) {
    return `${r.date} → ${r.endDate}`;
  }
  return r.date;
}

function formatSlotCell(r: Reservation) {
  if (isMultiDay(r)) {
    return `${r.startTime} → ${r.endTime}`;
  }
  return `${r.startTime} - ${r.endTime}`;
}

export default function AdminReservations() {
  const { reservations, setReservationStatus } = useAppStore();
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");

  const rows = useMemo(
    () => reservations.filter((r) => filter === "all" || r.status === filter),
    [reservations, filter]
  );

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Réservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} réservation(s) affichée(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as typeof filter)} 
            className="w-40"
          >
            <option value="all">Tous les statuts</option>
            <option value="confirmed">Confirmées</option>
            <option value="pending">En attente</option>
            <option value="cancelled">Annulées</option>
          </Select>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune réservation.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/60 text-left">
                {["Date", "Créneau", "Client", "Contact", "Montant", "Statut", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3 tabular-nums">
                    {formatDateCell(r)}
                    {isMultiDay(r) && (
                      <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        Plusieurs jours
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatSlotCell(r)}</td>
                  <td className="px-4 py-3 font-medium">{r.userName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.userEmail}<br />{r.userPhone}
                  </td>
                  <td className="px-4 py-3 font-bold italic">{formatCAD(r.price)}</td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant={
                        r.status === "confirmed" ? "pitch" : 
                        r.status === "pending" ? "warning" : 
                        "destructive"
                      }
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.status !== "confirmed" && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setReservationStatus(r.id, "confirmed")}
                        >
                          <Check className="size-4 text-pitch" />
                        </Button>
                      )}
                      {r.status !== "cancelled" && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setReservationStatus(r.id, "cancelled")}
                        >
                          <X className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}