// components/booking/booking-flow.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startOfToday } from "date-fns";
import { useAppStore } from "@/lib/store";
import { toISODate } from "@/lib/utils";
import type { Field } from "@/lib/types";
import { fieldUrlKey, normalizeKey } from "@/lib/field-url";
import { DatePicker } from "./date-picker";
import { TimeRangePicker, type TimeRangeValue } from "./time-range-picker";
import { MultiDayPicker, type MultiDayValue } from "./multi-day-picker";
import { MultiDatePicker, type MultiDatesValue } from "./multi-date-picker";
import { computeDurationHours, formatDuration, computeSpanHours, formatSpanDuration } from "@/lib/time-utils";
import {
  computeTaxes,
  computeDeposit,
  loadTaxSettings,
  loadPaymentSettings,
  DEFAULT_TAX_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  type TaxSettings,
  type PaymentSettings,
} from "@/lib/taxes";
import { PaymentOptions } from "@/components/booking/payment-options";
import type { PaymentOption } from "@/lib/types";

type Mode = "single" | "multi" | "dates";

/** Valeurs acceptées dans l'adresse : ?mode=jour | continu | dates */
const MODE_FROM_URL: Record<string, Mode> = {
  single: "single", jour: "single", journee: "single",
  multi: "multi", continu: "multi", periode: "multi",
  dates: "dates", choix: "dates",
};
const MODE_TO_URL: Record<Mode, string> = { single: "jour", multi: "continu", dates: "dates" };

const normalize = normalizeKey;

/**
 * Parcours de réservation.
 * L'adresse pilote l'étape : /reservation → choix du terrain ;
 * /reservation?terrain=grand-terrain → directement date et horaire de ce terrain.
 * Options : &mode=jour|continu|dates, &vue=dispo (défile jusqu'au calendrier).
 */
export function BookingFlow() {
  const { fields, isInitialized } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const terrainParam = searchParams.get("terrain");
  const modeParam = searchParams.get("mode");
  const vueParam = searchParams.get("vue");

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>(() => MODE_FROM_URL[normalize(modeParam || "")] ?? "single");

  // Terrain désigné par l'adresse (id, slug ou nom), parmi les terrains actifs
  const urlField = useMemo(() => {
    if (!terrainParam) return null;
    const key = normalize(terrainParam);
    return (
      fields.find(
        (f: Field) =>
          f.active !== false &&
          (f.id === terrainParam || fieldUrlKey(f) === key || normalize(f.name || "") === key)
      ) ?? null
    );
  }, [fields, terrainParam]);
  const selectedFieldId = urlField?.id ?? null;
  const fieldsReady = isInitialized || fields.length > 0;
  const invalidTerrain = !!terrainParam && fieldsReady && !urlField;

  const goToField = (f: Field) => {
    const qs = new URLSearchParams({ terrain: fieldUrlKey(f) });
    if (mode !== "single") qs.set("mode", MODE_TO_URL[mode]);
    router.push(`${pathname}?${qs.toString()}`, { scroll: false });
  };
  const goToPicker = () => router.push(pathname, { scroll: false });

  // Mode 1 jour
  const [date, setDate] = useState<Date>(startOfToday());
  const [range, setRange] = useState<TimeRangeValue>({ startTime: null, endTime: null });

  // Mode plusieurs jours
  const [multiDay, setMultiDay] = useState<MultiDayValue>({
    startDate: null, startTime: null, endDate: null, endTime: null,
  });

  // Mode dates au choix (jours non consécutifs, même horaire chaque jour)
  const [multiDates, setMultiDates] = useState<MultiDatesValue>({
    dates: [], startTime: null, endTime: null,
  });
  // Dates en conflit remontées par le calendrier multi-dates
  const [dateConflicts, setDateConflicts] = useState(0);

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [paySettings, setPaySettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [payOption, setPayOption] = useState<PaymentOption>("full");

  // Taux de taxes et réglages d'acompte configurés dans l'admin
  useEffect(() => {
    loadTaxSettings().then(setTaxSettings).catch(() => {});
    loadPaymentSettings().then(setPaySettings).catch(() => {});
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedField = fields.find((f: Field) => f.id === selectedFieldId);

  // L'adresse décide de l'étape (le bouton Retour du navigateur fonctionne) ;
  // changer de terrain remet les choix de date/heure à zéro.
  const lastFieldId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedFieldId !== lastFieldId.current) {
      lastFieldId.current = selectedFieldId;
      setRange({ startTime: null, endTime: null });
      setMultiDay({ startDate: null, startTime: null, endDate: null, endTime: null });
      setMultiDates({ dates: [], startTime: null, endTime: null });
      setError("");
    }
    setStep(selectedFieldId ? (s) => (s === 0 ? 1 : s) : 0);
  }, [selectedFieldId]);

  // Mode demandé dans l'adresse (ex. publicité « tous vos vendredis » → ?mode=dates)
  useEffect(() => {
    const m = MODE_FROM_URL[normalize(modeParam || "")];
    if (m) setMode(m);
  }, [modeParam]);

  // Garde le mode dans l'adresse : lien partageable tel quel
  const changeMode = (m: Mode) => {
    setMode(m);
    if (!selectedField) return;
    const qs = new URLSearchParams(searchParams.toString());
    if (m === "single") qs.delete("mode");
    else qs.set("mode", MODE_TO_URL[m]);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };

  // « Disponibilités » : défile jusqu'au calendrier
  useEffect(() => {
    if (step !== 1 || vueParam !== "dispo") return;
    const t = setTimeout(() => {
      document.getElementById("calendrier")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [step, vueParam]);

  const isReady =
    mode === "single"
      ? !!range.startTime && !!range.endTime
      : mode === "multi"
        ? !!multiDay.startDate && !!multiDay.startTime && !!multiDay.endDate && !!multiDay.endTime
        : multiDates.dates.length > 0 && !!multiDates.startTime && !!multiDates.endTime &&
          dateConflicts === 0;

  const price = (() => {
    if (!selectedField) return 0;
    if (mode === "single" && range.startTime && range.endTime) {
      return Math.round(computeDurationHours(range.startTime, range.endTime) * selectedField.pricePerHour * 100) / 100;
    }
    if (mode === "multi" && multiDay.startDate && multiDay.startTime && multiDay.endDate && multiDay.endTime) {
      const hours = computeSpanHours(multiDay.startDate, multiDay.startTime, multiDay.endDate, multiDay.endTime);
      return hours > 0 ? Math.round(hours * selectedField.pricePerHour * 100) / 100 : 0;
    }
    if (mode === "dates" && multiDates.dates.length > 0 && multiDates.startTime && multiDates.endTime) {
      const hoursPerDay = computeDurationHours(multiDates.startTime, multiDates.endTime);
      return hoursPerDay > 0
        ? Math.round(hoursPerDay * selectedField.pricePerHour * multiDates.dates.length * 100) / 100
        : 0;
    }
    return 0;
  })();

  // Détail des taxes : sous-total (HT) + TPS + TVQ = total payé
  const taxes = computeTaxes(price, taxSettings);

  const handlePay = async () => {
    if (!selectedField || !isReady || price <= 0) return;
    if (mode === "dates" && dateConflicts > 0) {
      setError("Une des dates choisies vient d'être réservée. Retirez-la avant de payer.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload =
        mode === "dates"
          ? {
              kind: "terrain-dates",
              fieldId: selectedField.id,
              fieldName: selectedField.name,
              dates: multiDates.dates,
              startTime: multiDates.startTime,
              endTime: multiDates.endTime,
              price,
              userName: form.name,
              userEmail: form.email,
              userPhone: form.phone,
              paymentOption: payOption,
            }
          : mode === "single"
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
              paymentOption: payOption,
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
              paymentOption: payOption,
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

  // Lien vers un terrain précis, terrains pas encore chargés : on patiente
  if (terrainParam && !fieldsReady) {
    return <div className="mx-auto h-96 max-w-4xl animate-pulse rounded-lg bg-card" aria-busy="true" />;
  }

  // Étape 0 : choix du terrain
  if (step === 0 || !selectedField) {
    return (
      <div className="max-w-4xl mx-auto">
        {invalidTerrain && (
          <p className="mb-4 rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
            Ce terrain n&apos;est plus disponible. Choisissez-en un autre ci-dessous.
          </p>
        )}
        <h2 className="text-2xl font-bold mb-6">Choisissez votre terrain</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.filter((f: Field) => f.active).map((f: Field) => (
            <button
              key={f.id}
              type="button"
              onClick={() => goToField(f)}
              className="group overflow-hidden rounded-lg border bg-card text-left transition-all hover:shadow-glow-sm"
            >
              <div className="p-4">
                <p className="font-bold text-lg">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.players} · {f.turf}</p>
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
        <button onClick={goToPicker} className="mb-4 text-sm text-primary hover:underline">
          ← Changer de terrain
        </button>
        <h2 id="calendrier" className="scroll-mt-28 text-2xl font-bold md:scroll-mt-32">{selectedField.name}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {selectedField.players} · {selectedField.turf} ·{" "}
          <span className="font-bold text-primary">{selectedField.pricePerHour} $/h</span>
        </p>

        {/* Bascule 1 jour / plusieurs jours */}
        <div className="mb-6 inline-flex rounded-md border p-1">
          <button
            type="button"
            onClick={() => changeMode("single")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "single" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
          >
            Une journée
          </button>
          <button
            type="button"
            onClick={() => changeMode("multi")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "multi" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
          >
            Plusieurs jours (location continue)
          </button>
          <button
            type="button"
            onClick={() => changeMode("dates")}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "dates" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
          >
            Dates au choix
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
                fieldId={selectedField.id}
                pricePerHour={selectedField.pricePerHour}
                value={range}
                onChange={setRange}
              />
            </div>
          </>
        ) : mode === "multi" ? (
          <>
            <p className="text-muted-foreground mb-6">
              Le terrain vous sera réservé exclusivement, en continu, du début à la fin de la période.
            </p>
            <MultiDayPicker
              fieldId={selectedField.id}
              pricePerHour={selectedField.pricePerHour}
              value={multiDay}
              onChange={setMultiDay}
            />
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              Sélectionnez librement vos jours — dans le mois ou sur plusieurs mois —
              avec le même horaire chaque jour (ex. tous les vendredis de 18 h à 20 h).
            </p>
            <MultiDatePicker
              fieldId={selectedField.id}
              pricePerHour={selectedField.pricePerHour}
              value={multiDates}
              onChange={setMultiDates}
              onConflictsChange={setDateConflicts}
            />
          </>
        )}

        <button
          type="button"
          disabled={!isReady || price <= 0}
          onClick={() => setStep(2)}
          className="mt-8 w-full rounded-md bg-primary py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mode === "dates" && dateConflicts > 0
            ? "⚠️ Retirez les dates en conflit pour continuer"
            : "Continuer"}
        </button>
      </div>
    );
  }

  // Étape 2 : coordonnées et paiement
  if (step === 2 && selectedField && isReady) {
    const summary =
      mode === "single"
        ? `${selectedField.name} · ${toISODate(date)} · ${range.startTime} - ${range.endTime} (${formatDuration(range.startTime!, range.endTime!)})`
        : mode === "multi"
        ? `${selectedField.name} · du ${multiDay.startDate} ${multiDay.startTime} au ${multiDay.endDate} ${multiDay.endTime} (${formatSpanDuration(
            computeSpanHours(multiDay.startDate!, multiDay.startTime!, multiDay.endDate!, multiDay.endTime!)
          )})`
        : `${selectedField.name} · ${multiDates.dates.length} dates · ${multiDates.startTime} - ${multiDates.endTime} chaque jour`;

    return (
      <div className="mx-auto max-w-md">
        <button onClick={() => setStep(1)} className="mb-4 text-sm text-primary hover:underline">
          ← Changer l'horaire
        </button>
        <h2 className="text-2xl font-bold mb-2">Vos coordonnées</h2>
        <p className="text-muted-foreground mb-6">{summary}</p>

        {/* ===== Récapitulatif avec taxes ===== */}
        <div className="mb-6 rounded-lg border bg-card p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="tabular-nums">{taxes.subtotal.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">TPS ({taxSettings.gstRate} %)</span>
            <span className="tabular-nums">{taxes.gst.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">TVQ ({taxSettings.qstRate} %)</span>
            <span className="tabular-nums">{taxes.qst.toFixed(2)} $</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 font-bold">
            <span>Total</span>
            <span className="tabular-nums">{taxes.total.toFixed(2)} $ CAD</span>
          </div>
          {(taxSettings.gstNumber || taxSettings.qstNumber) && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {taxSettings.gstNumber && <>N° TPS : {taxSettings.gstNumber}</>}
              {taxSettings.gstNumber && taxSettings.qstNumber && " · "}
              {taxSettings.qstNumber && <>N° TVQ : {taxSettings.qstNumber}</>}
            </p>
          )}
        </div>

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

        {/* ===== Totalité ou acompte (65 % dès 200 $ de réservation) ===== */}
        <div className="mt-5">
          <PaymentOptions
            taxes={taxes}
            settings={paySettings}
            value={payOption}
            onChange={setPayOption}
          />
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-primary py-3 font-bold text-white transition-opacity disabled:opacity-60"
        >
          {loading
            ? "Redirection vers le paiement…"
            : payOption === "deposit" && taxes.subtotal >= paySettings.depositMinSubtotal
              ? `Payer l'acompte de ${computeDeposit(taxes.total, paySettings).deposit.toFixed(2)} $`
              : `Payer ${taxes.total.toFixed(2)} $`}
        </button>
      </div>
    );
  }

  return null;
}