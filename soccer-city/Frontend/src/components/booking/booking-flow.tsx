// components/booking/booking-flow.tsx
"use client";
import { useState } from "react";
import { startOfToday } from "date-fns";
import { useAppStore } from "@/lib/store";
import { toISODate } from "@/lib/utils";
import type { Field } from "@/lib/types";
import { DatePicker } from "./date-picker";
import { TimeRangePicker, type TimeRangeValue } from "./time-range-picker";
import { MultiDayPicker, type MultiDayValue } from "./multi-day-picker";
import { computeDurationHours, formatDuration, computeSpanHours, formatSpanDuration } from "@/lib/time-utils";

type Mode = "single" | "multi";

export function BookingFlow() {
  const { fields } = useAppStore();
  const [step, setStep] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("single");

  // Mode 1 jour
  const [date, setDate] = useState<Date>(startOfToday());
  const [range, setRange] = useState<TimeRangeValue>({ startTime: null, endTime: null });

  // Mode plusieurs jours
  const [multiDay, setMultiDay] = useState<MultiDayValue>({
    startDate: null, startTime: null, endDate: null, endTime: null,
  });

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedField = fields.find((f: Field) => f.id === selectedFieldId);

  const isReady =
    mode === "single"
      ? !!range.startTime && !!range.endTime
      : !!multiDay.startDate && !!multiDay.startTime && !!multiDay.endDate && !!multiDay.endTime;

  const price = (() => {
    if (!selectedField) return 0;
    if (mode === "single" && range.startTime && range.endTime) {
      return Math.round(computeDurationHours(range.startTime, range.endTime) * selectedField.pricePerHour * 100) / 100;
    }
    if (mode === "multi" && multiDay.startDate && multiDay.startTime && multiDay.endDate && multiDay.endTime) {
      const hours = computeSpanHours(multiDay.startDate, multiDay.startTime, multiDay.endDate, multiDay.endTime);
      return hours > 0 ? Math.round(hours * selectedField.pricePerHour * 100) / 100 : 0;
    }
    return 0;
  })();

  const handlePay = async () => {
    if (!selectedField || !isReady || price <= 0) return;
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload =
        mode === "single"
          ? {
              fieldId: selectedField.id,
              fieldName: selectedField.name,
              date: toISODate(date),
              startTime: range.startTime,
              endTime: range.endTime,
              price,
              userName: form.name,
              userEmail: form.email,
              userPhone: form.phone,
            }
          : {
              fieldId: selectedField.id,
              fieldName: selectedField.name,
              date: multiDay.startDate,
              startTime: multiDay.startTime,
              endDate: multiDay.endDate,
              endTime: multiDay.endTime,
              price,
              userName: form.name,
              userEmail: form.email,
              userPhone: form.phone,
            };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  // Étape 0 : choix du terrain
  if (step === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Choisissez votre terrain</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.filter((f: Field) => f.active).map((f: Field) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedFieldId(f.id);
                setRange({ startTime: null, endTime: null });
                setMultiDay({ startDate: null, startTime: null, endDate: null, endTime: null });
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

  // Étape 1 : choix de la date/horaire (1 jour ou plusieurs jours)
  if (step === 1 && selectedField) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setStep(0)} className="mb-4 text-sm text-primary hover:underline">
          ← Changer de terrain
        </button>
        <h2 className="text-2xl font-bold mb-2">{selectedField.name}</h2>

        {/* Bascule 1 jour / plusieurs jours */}
        <div className="mb-6 inline-flex rounded-md border p-1">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "single" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
          >
            Une journée
          </button>
          <button
            type="button"
            onClick={() => setMode("multi")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "multi" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
          >
            Plusieurs jours (location continue)
          </button>
        </div>

        {mode === "single" ? (
          <>
            <p className="text-muted-foreground mb-6">Choisissez une date et un horaire</p>
            <DatePicker
              value={date}
              onChange={(d) => {
                setDate(d);
                setRange({ startTime: null, endTime: null });
              }}
            />
            <div className="mt-6">
              <TimeRangePicker
                date={date}
                pricePerHour={selectedField.pricePerHour}
                value={range}
                onChange={setRange}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              Le terrain vous sera réservé exclusivement, en continu, du début à la fin de la période.
            </p>
            <MultiDayPicker
              pricePerHour={selectedField.pricePerHour}
              value={multiDay}
              onChange={setMultiDay}
            />
          </>
        )}

        <button
          type="button"
          disabled={!isReady || price <= 0}
          onClick={() => setStep(2)}
          className="mt-8 w-full rounded-md bg-primary py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    );
  }

  // Étape 2 : coordonnées et paiement
  if (step === 2 && selectedField && isReady) {
    const summary =
      mode === "single"
        ? `${selectedField.name} · ${toISODate(date)} · ${range.startTime} - ${range.endTime} (${formatDuration(range.startTime!, range.endTime!)})`
        : `${selectedField.name} · du ${multiDay.startDate} ${multiDay.startTime} au ${multiDay.endDate} ${multiDay.endTime} (${formatSpanDuration(
            computeSpanHours(multiDay.startDate!, multiDay.startTime!, multiDay.endDate!, multiDay.endTime!)
          )})`;

    return (
      <div className="mx-auto max-w-md">
        <button onClick={() => setStep(1)} className="mb-4 text-sm text-primary hover:underline">
          ← Changer l'horaire
        </button>
        <h2 className="text-2xl font-bold mb-2">Vos coordonnées</h2>
        <p className="text-muted-foreground mb-6">
          {summary} · {price.toFixed(2)} $
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nom complet"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-md border bg-card px-4 py-2 outline-none focus:border-primary"
          />
          <input
            type="email"
            placeholder="Courriel"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-md border bg-card px-4 py-2 outline-none focus:border-primary"
          />
          <input
            type="tel"
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-md border bg-card px-4 py-2 outline-none focus:border-primary"
          />
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-primary py-3 font-bold text-white transition-opacity disabled:opacity-60"
        >
          {loading ? "Redirection vers le paiement…" : `Payer ${price.toFixed(2)} $`}
        </button>
      </div>
    );
  }

  return null;
}