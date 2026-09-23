// components/booking/payment-options.tsx
// Choix du mode de paiement : totalité ou acompte (65 % configurable).
// L'acompte est verrouillé sous le sous-total minimum configuré
// (deposit_min_subtotal — ex. 200 $ : une location d'1 h reste en totalité).
"use client";

import {
  computeDeposit,
  depositEligible,
  type PaymentSettings,
  type TaxBreakdown,
} from "@/lib/taxes";
import type { PaymentOption } from "@/lib/types";

interface Props {
  taxes: TaxBreakdown;
  settings: PaymentSettings;
  value: PaymentOption;
  onChange: (option: PaymentOption) => void;
}

const fmt = (n: number) => `${n.toFixed(2)} $`;

export function PaymentOptions({ taxes, settings, value, onChange }: Props) {
  const eligible = depositEligible(taxes.subtotal, settings);
  const { deposit, balance } = computeDeposit(taxes.total, settings);

  const card = (selected: boolean, disabled: boolean) =>
    [
      "w-full rounded-xl border-2 p-4 text-left transition-colors",
      selected ? "border-primary bg-primary/10" : "border-border bg-card/60",
      disabled
        ? "cursor-not-allowed opacity-45"
        : "cursor-pointer hover:border-primary/60",
    ].join(" ");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        className={card(value === "full", false)}
        onClick={() => onChange("full")}
      >
        <p className="text-sm font-bold">Payer la totalité</p>
        <p className="font-display text-2xl font-black italic">{fmt(taxes.total)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tout est réglé, rien à payer sur place.
        </p>
        <span className="mt-2 inline-block rounded-full bg-pitch/15 px-2.5 py-0.5 text-[11px] font-bold text-pitch">
          ✓ Accès direct au terrain le jour J
        </span>
      </button>

      <button
        type="button"
        disabled={!eligible}
        className={card(value === "deposit", !eligible)}
        onClick={() => eligible && onChange("deposit")}
        title={
          eligible
            ? undefined
            : `Option offerte à partir de ${settings.depositMinSubtotal} $ de réservation (avant taxes)`
        }
      >
        <p className="text-sm font-bold">Réserver avec {settings.depositPercent} %</p>
        <p className="font-display text-2xl font-black italic">{fmt(deposit)}</p>
        {eligible ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Solde de <b>{fmt(balance)}</b> à régler le jour de l&apos;événement,{" "}
              <b>avant l&apos;accès au terrain</b> (en ligne ou à l&apos;accueil).
            </p>
            <span className="mt-2 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-500">
              ⚠ Solde dû avant l&apos;accès
            </span>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Option offerte à partir de <b>{settings.depositMinSubtotal} $</b> de
              réservation — réservez 2 h et plus pour en profiter.
            </p>
            <span className="mt-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              🔒 Non disponible pour ce montant
            </span>
          </>
        )}
      </button>
    </div>
  );
}
