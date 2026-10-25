// components/booking/terms-consent.tsx
// Case à cocher obligatoire avant tout paiement (Loi 25 : consentement
// distinct, après avoir pu lire les documents).
"use client";

export function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border bg-card/60 p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
        required
      />
      <span className="text-muted-foreground">
        J&apos;ai lu et j&apos;accepte les{" "}
        <a href="/conditions" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
          conditions d&apos;utilisation
        </a>{" "}
        et la{" "}
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
          politique de confidentialité
        </a>
        .
      </span>
    </label>
  );
}
