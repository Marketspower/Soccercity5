"use client";

import { useMemo, useState } from "react";
import { Check, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { exportCSV } from "@/components/admin/export";
import { useAppStore } from "@/lib/store";
import type { EventStatus } from "@/lib/types";

const STATUS_LABEL: Record<EventStatus, string> = { new: "Nouvelle", accepted: "Acceptée", declined: "Refusée" };

/** Demandes d'événements privés : décision et suivi. */
export default function AdminEvents() {
  const { events, setEventStatus } = useAppStore();
  const [filter, setFilter] = useState<"all" | EventStatus>("all");

  const rows = useMemo(() => events.filter((e) => filter === "all" || e.status === filter), [events, filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">Événements privés</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} demande(s) affichée(s).</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-40" aria-label="Filtrer par statut">
            <option value="all">Toutes</option>
            <option value="new">Nouvelles</option>
            <option value="accepted">Acceptées</option>
            <option value="declined">Refusées</option>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                "evenements-soccer-city",
                ["Date", "Type", "Contact", "Entreprise", "Courriel", "Téléphone", "Personnes", "Statut", "Message"],
                rows.map((e) => [e.date, e.type, `${e.firstName} ${e.lastName}`, e.company ?? "", e.email, e.phone, e.guests, STATUS_LABEL[e.status], e.message])
              )
            }
          >
            <FileSpreadsheet /> Exporter
          </Button>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune demande pour l&apos;instant. Les demandes envoyées depuis la page Événements arrivent ici.
        </p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map((e) => (
            <li key={e.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">{e.type} · {e.guests} pers.</p>
                  <p className="text-sm text-muted-foreground">
                    {e.firstName} {e.lastName}{e.company ? ` — ${e.company}` : ""} · {e.date}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.email} · {e.phone}</p>
                </div>
                <Badge variant={e.status === "accepted" ? "pitch" : e.status === "new" ? "warning" : "destructive"}>
                  {STATUS_LABEL[e.status]}
                </Badge>
              </div>
              <p className="mt-3 rounded-md bg-secondary/60 p-3 text-sm leading-relaxed">{e.message}</p>
              {e.status === "new" && (
                <div className="mt-4 flex gap-2">
                  <Button variant="pitch" size="sm" className="flex-1" onClick={() => setEventStatus(e.id, "accepted")}>
                    <Check /> Accepter
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEventStatus(e.id, "declined")}>
                    <X /> Refuser
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
