// app/reservation/success/page.tsx
export default function ReservationSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="text-2xl font-bold">Réservation confirmée !</h1>
        <p className="mt-2 text-muted-foreground">
          Un courriel de confirmation vous sera envoyé sous peu.
        </p>
        <a href="/" className="mt-6 inline-block text-primary hover:underline">
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  );
}