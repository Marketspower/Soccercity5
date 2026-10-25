// components/layout/analytics.tsx
// Google Analytics 4 + Meta Pixel — DÉSACTIVÉS PAR DÉFAUT (Loi 25).
// Ils ne se chargent qu'après un clic sur « Accepter » dans le bandeau.
// Sans identifiants configurés (NEXT_PUBLIC_GA4_ID / NEXT_PUBLIC_META_PIXEL_ID),
// rien n'est chargé et aucun bandeau ne s'affiche.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const SAFE_ID = /^[A-Za-z0-9-]+$/;
const ga4 = GA4_ID && SAFE_ID.test(GA4_ID) ? GA4_ID : null;
const pixel = PIXEL_ID && SAFE_ID.test(PIXEL_ID) ? PIXEL_ID : null;
const KEY = "sc5-consent-mesure";

type Choice = "oui" | "non" | null;

const readChoice = (): Choice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null;
  }
};

export function Analytics() {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(readChoice());
    setReady(true);
    // Permet de rouvrir le bandeau depuis la politique de confidentialité
    const reopen = () => setChoice(null);
    window.addEventListener("sc5-consent-reset", reopen);
    return () => window.removeEventListener("sc5-consent-reset", reopen);
  }, []);

  if (!ga4 && !pixel) return null;

  const decide = (c: "oui" | "non") => {
    try { localStorage.setItem(KEY, c); } catch {}
    setChoice(c);
    if (c === "non" && readChoice() === "non") {
      // Retrait du consentement après une acceptation : on recharge pour couper les outils
      if ((window as any).gtag || (window as any).fbq) window.location.reload();
    }
  };

  return (
    <>
      {choice === "oui" && ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      )}
      {choice === "oui" && pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}

      {ready && choice === null && (
        <div
          role="dialog"
          aria-label="Consentement aux outils de mesure"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-lg border bg-card/95 p-4 shadow-2xl backdrop-blur sm:inset-x-6 sm:p-5"
        >
          <p className="text-sm">
            Nous aimerions utiliser des outils de mesure d&apos;audience et de publicité (Google, Meta) pour améliorer
            le site et nos annonces. Ils restent désactivés si vous refusez.{" "}
            <Link href="/confidentialite#temoins" className="text-primary underline">En savoir plus</Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => decide("oui")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Accepter
            </button>
            <button
              type="button"
              onClick={() => decide("non")}
              className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Refuser
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Rouvre le bandeau (lien « Gérer mes préférences »). */
export function resetConsent() {
  try { localStorage.removeItem(KEY); } catch {}
  window.dispatchEvent(new Event("sc5-consent-reset"));
}

/** Envoie un événement de conversion aux outils chargés (seulement s'ils ont été acceptés). */
export function trackConversion(name: "Purchase" | "Lead", params: { value?: number; currency?: string; id?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (name === "Purchase") {
    w.gtag?.("event", "purchase", { transaction_id: params.id, value: params.value, currency: params.currency || "CAD" });
    w.fbq?.("track", "Purchase", { value: params.value, currency: params.currency || "CAD" }, params.id ? { eventID: params.id } : undefined);
  } else {
    w.gtag?.("event", "generate_lead", {});
    w.fbq?.("track", "Lead");
  }
}
