// app/reservation/cancel/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Paiement non finalisé",
  robots: { index: false, follow: false },
};

export default function ReservationCancelPage({
  searchParams,
}: {
  searchParams: { raison?: string };
}) {
  // Message court venant de nos propres routes (affiché comme texte, jamais comme HTML)
  const raison = typeof searchParams?.raison === "string" ? searchParams.raison.slice(0, 200) : "";
  return (
    <div className="flex min-h-screen items-center justify-center p-6 pt-28 text-center">
      <div className="max-w-md">
        <div className="mb-4 text-5xl">❌</div>
        <h1 className="text-2xl font-bold">Paiement non finalisé</h1>
        <p className="mt-2 text-muted-foreground">
          {raison || "Votre réservation n'a pas été confirmée. Aucun montant n'a été prélevé."}
        </p>
        <Link href="/reservation" className="mt-6 inline-block text-primary hover:underline">
          ← Réessayer
        </Link>
      </div>
    </div>
  );
}
