"use client";

import { useMemo, useState } from "react";
import { Check, FileSpreadsheet, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { exportCSV, exportPDF } from "@/components/admin/export";
import { useAppStore } from "@/lib/store";
import { formatCAD, slotLabel } from "@/lib/utils";
import type { ReservationStatus } from "@/lib/types";

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

/** Gestion des réservations : filtres, décisions, exports. */
export default function AdminReservations() {
  const { reservations, fields, setReservationStatus } = useAppStore();
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");

  const rows = useMemo(
    () => reservations.filter((r) => filter === "all" || r.status === filter),
    [reservations, filter]
  );

  const fieldName = (id: string) => fields.find((f) => f.id === id)?.name ?? id;

  const exportRows = rows.map((r) => [
    r.date, slotLabel(r.hour), fieldName(r.fieldId), r.userName, r.userEmail, r.userPhone,
    formatCAD(r.price), STATUS_LABEL[r.status],
  ]);
  const HEADERS = ["Date", "Créneau", "Terrain", "Client", "Courriel", "Téléphone", "Montant", "Statut"];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">Réservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} réservation(s) affichée(s).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-40" aria-label="Filtrer par statut">
            <option value="all">Tous les statuts</option>
            <option value="confirmed">Confirmées</option>
            <option value="pending">En attente</option>
            <option value="cancelled">Annulées</option>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportCSV("reservations-soccer-city", HEADERS, exportRows)}>
            <FileSpreadsheet /> Excel (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF("Réservations", HEADERS, exportRows)}>
            <FileText /> PDF
          </Button>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune réservation ne correspond à ce filtre. Les réservations faites sur le site apparaissent ici en temps réel.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/60 text-left">
                {["Date", "Créneau", "Terrain", "Client", "Contact", "Montant", "Statut", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-display text-xs font-bold uppercase italic tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b transition-colors last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3 tabular-nums">{r.date}</td>
                  <td className="px-4 py-3 tabular-nums">{slotLabel(r.hour)}</td>
                  <td className="px-4 py-3 font-medium">{fieldName(r.fieldId)}</td>
                  <td className="px-4 py-3">{r.userName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.userEmail}<br />{r.userPhone}</td>
                  <td className="px-4 py-3 font-display font-bold italic">{formatCAD(r.price)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "confirmed" ? "pitch" : r.status === "pending" ? "warning" : "destructive"}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.status !== "confirmed" && (
                        <Button variant="ghost" size="icon" aria-label="Accepter la réservation" onClick={() => setReservationStatus(r.id, "confirmed")}>
                          <Check className="size-4 text-pitch" />
                        </Button>
                      )}
                      {r.status !== "cancelled" && (
                        <Button variant="ghost" size="icon" aria-label="Refuser la réservation" onClick={() => setReservationStatus(r.id, "cancelled")}>
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
