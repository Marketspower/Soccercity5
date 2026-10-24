// app/reservation/success/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessContent } from "./success-content";

export const metadata: Metadata = {
  title: "Merci pour votre réservation",
  robots: { index: false, follow: false },
};

export default function ReservationSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SuccessContent />
    </Suspense>
  );
}
