// app/reservation/success/success-content.tsx
// Page « merci » : vérifie réellement le paiement (Stripe) et l'enregistrement
// de la réservation avant d'afficher « confirmée ». Déclenche la conversion
// GA4 / Meta Pixel une seule fois.
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trackConversion } from "@/components/layout/analytics";

type Summary = {
  what: string; date: string; startTime: string; endTime: string;
  amountPaid: number; balanceDue: number; currency: string; firstName: string;
};
type State = "loading" | "confirmed" | "processing" | "refunded" | "failed" | "unpaid" | "unknown" | "already";

export function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [state, setState] = useState<State>(params.get("deja") ? "already" : "loading");
  const [summary, setSummary] = useState<Summary | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (state === "already" || !sessionId) {
      if (!sessionId && state !== "already") setState("unknown");
      return;
    }
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/reservation-status?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (json.summary) setSummary(json.summary);
        if (["confirmed", "refunded", "failed", "unpaid"].includes(json.status)) {
          setState(json.status);
          return;
        }
        setState(json.status === "processing" ? "processing" : "unknown");
      } catch {
        setState("unknown");
      }
      // Le webhook Stripe arrive en général en quelques secondes.
      if (attempts < 10) timer = setTimeout(check, 2000);
    };
    check();
    return () => clearTimeout(timer);
  }, [sessionId, state === "already"]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state !== "confirmed" || !summary || tracked.current) return;
    tracked.current = true;
    const key = `sc5-tracked-${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    trackConversion("Purchase", { value: summary.amountPaid, currency: summary.currency, id: sessionId });
  }, [state, summary, sessionId]);

  const money = (n: number) => `${n.toFixed(2)} $`;

  const view = {
    loading: { icon: "⏳", title: "Vérification du paiement…", text: "Un instant, nous confirmons votre réservation." },
    processing: { icon: "⏳", title: "Paiement reçu — confirmation en cours", text: "Votre paiement est accepté. La confirmation arrive par courriel d'ici quelques minutes." },
    confirmed: { icon: "✅", title: "Réservation confirmée !", text: "Un courriel de confirmation vient de vous être envoyé. Vous recevrez aussi un rappel la veille." },
    refunded: { icon: "↩️", title: "Créneau indisponible — vous êtes remboursé", text: "Ce créneau a été réservé quelques secondes avant votre paiement. Le montant a été remboursé intégralement sur votre carte." },
    failed: { icon: "⚠️", title: "Paiement reçu — notre équipe vous contacte", text: "Votre paiement a été reçu mais la réservation n'a pas pu être finalisée automatiquement. Nous avons été alertés et vous contacterons très rapidement pour confirmer ou vous rembourser." },
    unpaid: { icon: "❌", title: "Paiement non finalisé", text: "Aucun montant n'a été prélevé. Vous pouvez réessayer." },
    already: { icon: "✅", title: "Déjà payé", text: "Ce paiement a déjà été reçu : votre événement est confirmé." },
    unknown: { icon: "ℹ️", title: "Merci !", text: "Si votre paiement a été accepté, vous recevrez une confirmation par courriel. Sinon, contactez-nous." },
  }[state];

  return (
    <div className="flex min-h-screen items-center justify-center p-6 pt-28 text-center">
      <div className="max-w-md">
        <div className="mb-4 text-5xl">{view.icon}</div>
        <h1 className="text-2xl font-bold">
          {state === "confirmed" && summary?.firstName ? `Merci ${summary.firstName} ! ` : ""}
          {view.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{view.text}</p>

        {summary && (state === "confirmed" || state === "processing") && (
          <div className="mt-6 rounded-lg border bg-card p-5 text-left text-sm">
            <p><b>{summary.what}</b></p>
            {summary.date && <p className="mt-1">Date : {summary.date}</p>}
            {summary.startTime && <p>Heure : {summary.startTime} – {summary.endTime}</p>}
            <p className="mt-2">Payé : <b>{money(summary.amountPaid)}</b></p>
            {summary.balanceDue > 0 && (
              <p className="text-amber-500">Solde à régler sur place : {money(summary.balanceDue)}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <Link href="/" className="text-primary hover:underline">← Accueil</Link>
          {(state === "refunded" || state === "unpaid") && (
            <Link href="/reservation" className="text-primary hover:underline">Choisir un autre créneau</Link>
          )}
        </div>
      </div>
    </div>
  );
}
