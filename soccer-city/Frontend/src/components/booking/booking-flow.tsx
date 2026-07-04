"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

export function BookingFlow() {
  const { fields } = useAppStore();
  const [step, setStep] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  if (step === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Choisissez votre terrain</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.filter(f => f.active).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedField(f.id);
                setStep(1);
              }}
              className="group overflow-hidden rounded-lg border bg-card text-left transition-all hover:shadow-glow-sm"
            >
              <div className="p-4">
                <p className="font-bold text-lg">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.dimensions} · {f.players}</p>
                <p className="mt-2 text-primary font-bold">
                  {f.pricePerHour} $<span className="text-xs text-muted-foreground">/h</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-8">
      <p className="text-muted-foreground">Système de réservation en cours de construction</p>
      <button 
        onClick={() => setStep(0)} 
        className="mt-4 text-primary hover:underline"
      >
        ← Retourner aux terrains
      </button>
    </div>
  );
}