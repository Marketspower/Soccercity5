// app/reservation/cancel/page.tsx
export default function ReservationCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <div className="mb-4 text-5xl">❌</div>
        <h1 className="text-2xl font-bold">Paiement annulé</h1>
        <p className="mt-2 text-muted-foreground">
          Votre réservation n'a pas été confirmée. Aucun montant n'a été prélevé.
        </p>
        <a href="/reservation" className="mt-6 inline-block text-primary hover:underline">
          ← Réessayer
        </a>
      </div>
    </div>
  );
}