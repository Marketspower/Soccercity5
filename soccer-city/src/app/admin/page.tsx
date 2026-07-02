"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, LandPlot, PartyPopper, Lock, Trash2 } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { HOURS, slotLabel, formatCAD } from "@/lib/utils";

/** Vue d'ensemble : chiffres clés + gestion rapide des disponibilités. */
export default function AdminDashboard() {
  const { fields, reservations, events, blocked, blockSlot, unblockSlot } = useAppStore();

  const stats = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === "confirmed");
    return {
      revenue: confirmed.reduce((sum, r) => sum + r.price, 0),
      reservations: confirmed.length,
      pendingEvents: events.filter((e) => e.status === "new").length,
      activeFields: fields.filter((f) => f.active).length,
    };
  }, [fields, reservations, events]);

  /* ── Formulaire de blocage de créneau ── */
  const [bField, setBField] = useState(fields[0]?.id ?? "");
  const [bDate, setBDate] = useState(new Date().toISOString().split("T")[0]);
  const [bHour, setBHour] = useState(HOURS[0]);
  const [bReason, setBReason] = useState("Entretien");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="display text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d&apos;ensemble de l&apos;activité du complexe.</p>
      </header>

      {/* ── Statistiques ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Statistiques">
        <StatCard label="Revenus confirmés" value={stats.revenue} suffix=" $" Icon={CircleDollarSign} accent />
        <StatCard label="Réservations" value={stats.reservations} Icon={CalendarDays} />
        <StatCard label="Demandes d'événement" value={stats.pendingEvents} Icon={PartyPopper} />
        <StatCard label="Terrains actifs" value={stats.activeFields} Icon={LandPlot} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* ── Bloquer un créneau ── */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-1 font-display text-lg font-bold">Bloquer un créneau</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Entretien, ligue privée, météo : le créneau devient indisponible à la réservation.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bk-field">Terrain</Label>
              <Select id="bk-field" value={bField} onChange={(e) => setBField(e.target.value)}>
                {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-date">Date</Label>
              <Input id="bk-date" type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-hour">Créneau</Label>
              <Select id="bk-hour" value={bHour} onChange={(e) => setBHour(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{slotLabel(h)}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-reason">Motif</Label>
              <Input id="bk-reason" value={bReason} onChange={(e) => setBReason(e.target.value)} placeholder="Entretien" />
            </div>
          </div>
          <Button variant="brand" className="mt-5 w-full" onClick={() => bField && blockSlot(bField, bDate, bHour, bReason || "Bloqué")}>
            <Lock /> Bloquer ce créneau
          </Button>

          {/* Liste des blocages actifs */}
          {blocked.length > 0 && (
            <ul className="mt-6 space-y-2">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-2 text-sm">
                  <span>
                    <strong>{fields.find((f) => f.id === b.fieldId)?.name ?? b.fieldId}</strong>
                    {" · "}{b.date} · {slotLabel(b.hour)}
                    <span className="ml-2 text-muted-foreground">({b.reason})</span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label="Débloquer ce créneau" onClick={() => unblockSlot(b.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Activité récente ── */}
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-5 font-display text-lg font-bold">Dernières réservations</h2>
          {reservations.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucune réservation pour l&apos;instant. Elles apparaîtront ici dès la première confirmation en ligne.
            </p>
          ) : (
            <ul className="space-y-3">
              {reservations.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {fields.find((f) => f.id === r.fieldId)?.name} · {r.date} · {slotLabel(r.hour)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-sm font-bold italic">{formatCAD(r.price)}</span>
                    <Badge variant={r.status === "confirmed" ? "pitch" : r.status === "pending" ? "warning" : "destructive"}>
                      {r.status === "confirmed" ? "Confirmée" : r.status === "pending" ? "En attente" : "Annulée"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
