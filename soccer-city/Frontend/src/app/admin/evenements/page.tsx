"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Image as ImageIcon, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { loadEventPrices, type EventPrices } from "@/lib/event-prices";
import { MEDIA_EVENT_TYPES, type EventStatus, type PrivateEvent } from "@/lib/types";

const STATUS_LABEL: Record<EventStatus, string> = {
  new: "Nouvelle",
  accepted: "Acceptée — paiement en attente",
  declined: "Refusée",
  expired: "Expirée",
  paid: "Payée ✅",
};

const STATUS_VARIANT: Record<EventStatus, "pitch" | "warning" | "destructive" | "default"> = {
  new: "warning",
  accepted: "default",
  declined: "destructive",
  expired: "destructive",
  paid: "pitch",
};

export default function AdminEvents() {
  const { events, respondToEvent } = useAppStore();
  const [filter, setFilter] = useState<"all" | EventStatus>("all");
  const [prices, setPrices] = useState<EventPrices>({});

  useEffect(() => {
    loadEventPrices().then(setPrices).catch(() => {});
  }, []);

  const rows = useMemo(
    () => events.filter((e) => filter === "all" || e.status === filter),
    [events, filter]
  );

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Demandes d&apos;événement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} demande(s) affichée(s). Accepter envoie au client un courriel et un SMS
            avec un lien de paiement ; la date est bloquée dès le paiement.
          </p>
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-56"
        >
          <option value="all">Toutes</option>
          <option value="new">Nouvelles</option>
          <option value="accepted">Acceptées (non payées)</option>
          <option value="paid">Payées</option>
          <option value="declined">Refusées</option>
          <option value="expired">Expirées</option>
        </Select>
      </header>

      <section className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Photos et vidéos par type d&apos;événement</p>
        <div className="flex flex-wrap gap-2">
          {MEDIA_EVENT_TYPES.map((t) => (
            <Link
              key={t}
              href={`/admin/evenements/${encodeURIComponent(t)}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
            >
              <ImageIcon className="size-3.5" /> {t}
            </Link>
          ))}
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucune demande pour l&apos;instant.
        </p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              defaultPrice={prices[e.type] ?? 0}
              onRespond={respondToEvent}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({
  event: e,
  defaultPrice,
  onRespond,
}: {
  event: PrivateEvent;
  defaultPrice: number;
  onRespond: ReturnType<typeof useAppStore.getState>["respondToEvent"];
}) {
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [price, setPrice] = useState<string>("");
  const [startTime, setStartTime] = useState(e.startTime || "");
  const [endTime, setEndTime] = useState(e.endTime || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!price) setPrice(String(e.quotedPrice ?? defaultPrice ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPrice, e.quotedPrice]);

  const run = async (fn: () => Promise<{ payUrl?: string; emailSent?: boolean }>, okText: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      const r = await fn();
      if (r.payUrl) setPayUrl(r.payUrl);
      setFeedback({
        ok: true,
        text: r.emailSent === false
          ? `${okText} ⚠️ Le courriel n'a pas pu partir (vérifiez Resend) : copiez le lien ci-dessous et envoyez-le au client.`
          : okText,
      });
      setMode("idle");
    } catch (err: any) {
      setFeedback({ ok: false, text: err.message || "Erreur" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold">
            {e.type} · {e.guests} pers. · {e.date}
          </p>
          <p className="text-sm text-muted-foreground">
            {e.firstName} {e.lastName}
            {e.company ? ` — ${e.company}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {e.email} · {e.phone}
          </p>
          {(e.status === "accepted" || e.status === "paid") && e.quotedPrice != null && (
            <p className="mt-1 text-xs">
              Proposition : {Number(e.quotedPrice).toFixed(2)} $ avant taxes · {e.startTime} – {e.endTime}
            </p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[e.status] ?? "default"}>{STATUS_LABEL[e.status] ?? e.status}</Badge>
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary/60 p-3 text-sm leading-relaxed">
        {e.message}
      </p>

      {mode === "accept" && (
        <div className="mt-4 space-y-3 rounded-md border p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Prix avant taxes ($)</Label>
              <Input type="number" min={1} step="0.01" value={price} onChange={(ev) => setPrice(ev.target.value)} />
            </div>
            <div>
              <Label>Début</Label>
              <Input type="time" step={900} value={startTime} onChange={(ev) => setStartTime(ev.target.value)} />
            </div>
            <div>
              <Label>Fin</Label>
              <Input type="time" step={900} value={endTime} onChange={(ev) => setEndTime(ev.target.value)} />
            </div>
          </div>
          <div>
            <Label>Message au client (facultatif)</Label>
            <Textarea value={message} onChange={(ev) => setMessage(ev.target.value)} placeholder="Ex. : arbitre inclus, traiteur à confirmer…" />
          </div>
          <div className="flex gap-2">
            <Button
              variant="pitch"
              size="sm"
              disabled={busy || !price || !startTime || !endTime}
              onClick={() =>
                run(
                  () => onRespond(e.id, { action: "accept", price: Number(price), startTime, endTime, message }),
                  "Demande acceptée : le client a reçu le lien de paiement."
                )
              }
            >
              <Send /> {busy ? "Envoi…" : "Accepter et envoyer le lien"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode("idle")} disabled={busy}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {mode === "decline" && (
        <div className="mt-4 space-y-3 rounded-md border p-4">
          <Label>Raison (facultatif, envoyée au client)</Label>
          <Textarea value={message} onChange={(ev) => setMessage(ev.target.value)} placeholder="Ex. : complexe déjà réservé ce jour-là." />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => run(() => onRespond(e.id, { action: "decline", reason: message }), "Demande refusée : le client a été prévenu.")}
            >
              <X /> {busy ? "Envoi…" : "Confirmer le refus"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode("idle")} disabled={busy}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {mode === "idle" && (e.status === "new" || e.status === "accepted") && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="pitch" size="sm" className="flex-1" onClick={() => setMode("accept")}>
            <Check /> {e.status === "accepted" ? "Modifier la proposition" : "Accepter"}
          </Button>
          {e.status === "accepted" && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => run(() => onRespond(e.id, { action: "resend" }), "Lien de paiement renvoyé.")}
            >
              <Send /> Renvoyer le lien
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setMode("decline")}>
            <X /> Refuser
          </Button>
        </div>
      )}

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.ok ? "text-green-500" : "text-destructive"}`}>{feedback.text}</p>
      )}
      {payUrl && (
        <div className="mt-2 flex items-center gap-2">
          <Input readOnly value={payUrl} className="text-xs" />
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(payUrl)}>
            <Copy />
          </Button>
        </div>
      )}
    </li>
  );
}
