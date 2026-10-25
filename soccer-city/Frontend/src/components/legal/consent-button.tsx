"use client";
import { resetConsent } from "@/components/layout/analytics";

/** Bouton « Modifier mes préférences » (visible seulement si des outils de mesure sont configurés). */
export function ConsentButton() {
  if (!process.env.NEXT_PUBLIC_GA4_ID && !process.env.NEXT_PUBLIC_META_PIXEL_ID) return null;
  return (
    <button type="button" onClick={resetConsent} className="mt-2 rounded-md border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
      Modifier mes préférences de mesure
    </button>
  );
}
