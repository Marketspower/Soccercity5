"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfToday } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, MapPin, PartyPopper, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "./date-picker";
import { SlotGrid } from "./slot-grid";
import { useAppStore } from "@/lib/store";
import { createReservation } from "@/lib/api";
import { cn, formatCAD, formatDateLong, slotLabel, toISODate } from "@/lib/utils";

/* ── Étapes du parcours (< 60 secondes) ── */
const STEPS = ["Terrain", "Date", "Créneau", "Confirmation"] as const;

const schema = z.object({
  userName: z.string().min(2, "Votre nom est requis"),
  userEmail: z.string().email("Adresse courriel invalide"),
  userPhone: z.string().min(10, "Numéro de téléphone invalide"),
});
type FormValues = z.infer<typeof schema>;

export function BookingFlow() {
  const params = useSearchParams();
  const fields = useAppStore((s) => s.fields).filter((f) => f.active);

  // Pré-sélection du terrain via ?terrain=f1 (depuis les cartes de l'accueil)
  const preselected = params.get("terrain");
  const [fieldId, setFieldId] = useState<string | null>(
    preselected && fields.some((f) => f.id === preselected) ? preselected : null
  );
  const [step, setStep] = useState(fieldId ? 1 : 0);
  const [date, setDate] = useState<Date>(startOfToday());
  const [hour, setHour] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const field = useMemo(() => fields.find((f) => f.id === fieldId) ?? null, [fields, fieldId]);

  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      // Invalide le cache des créneaux : le créneau réservé passe en gris partout
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      setConfirmed(true);
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!field || hour === null) return;
    mutation.mutate({
      fieldId: field.id,
      date: toISODate(date),
      hour,
      price: field.pricePerHour,
      ...data,
    });
  };

  const goTo = (i: number) => {
    // Navigation arrière uniquement vers des étapes déjà validées
    if (i < step) setStep(i);
  };

  /* ── Écran de succès ── */
  if (confirmed && field && hour !== null) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-lg rounded-lg border bg-card p-10 text-center shadow-glow-sm glow-ring"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
          className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-pitch/15 text-pitch"
        >
          <Check className="size-10" strokeWidth={3} />
        </motion.span>
        <h2 className="display text-3xl">Réservation confirmée</h2>
        <p className="mt-3 text-muted-foreground">
          <strong className="text-foreground">{field.name}</strong> · {formatDateLong(date)}
          <br />
          {slotLabel(hour)} · {formatCAD(field.pricePerHour)}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Un courriel de confirmation vous a été envoyé. Présentez-vous à l&apos;accueil 10 minutes avant votre créneau.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="brand"><Link href="/"><MapPin /> Retour à l&apos;accueil</Link></Button>
          <Button variant="outline" onClick={() => { setConfirmed(false); setHour(null); setStep(2); }}>
            <CalendarCheck /> Réserver un autre créneau
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* ── Stepper ── */}
      <ol className="mb-10 flex items-center gap-2" aria-label="Progression de la réservation">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(i)}
                disabled={i > step}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border font-display text-sm font-bold italic transition-all",
                  done && "border-pitch bg-pitch text-white cursor-pointer",
                  current && "border-primary bg-primary text-white shadow-glow-sm animate-pulse-glow",
                  !done && !current && "border-border text-muted-foreground"
                )}
                aria-current={current ? "step" : undefined}
                aria-label={`Étape ${i + 1} : ${label}`}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </button>
              <span className={cn("hidden text-xs font-semibold uppercase tracking-wider sm:block", current ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-pitch" : "bg-border")} />}
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {/* ── Étape 1 : Terrain ── */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }} transition={{ duration: 0.35 }}>
            <h2 className="display mb-6 text-2xl sm:text-3xl">Choisissez votre terrain</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFieldId(f.id); setHour(null); setStep(1); }}
                  className={cn(
                    "group overflow-hidden rounded-lg border bg-card text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm",
                    fieldId === f.id && "border-primary shadow-glow-sm"
                  )}
                >
                  <div className="relative aspect-[16/8] overflow-hidden">
                    <Image src={f.image} alt={f.name} fill sizes="(max-width:640px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <Badge className="absolute left-3 top-3">{f.players}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-display text-lg font-bold">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.dimensions} · {f.turf}</p>
                    </div>
                    <p className="font-display text-lg font-extrabold italic text-primary">{formatCAD(f.pricePerHour)}<span className="text-xs not-italic text-muted-foreground">/h</span></p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Étape 2 : Date ── */}
        {step === 1 && field && (
          <motion.div key="s1" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }} transition={{ duration: 0.35 }}>
            <h2 className="display mb-1 text-2xl sm:text-3xl">Choisissez une date</h2>
            <p className="mb-6 text-sm text-muted-foreground">{field.name} · {formatCAD(field.pricePerHour)} / heure</p>
            <DatePicker value={date} onChange={(d) => { setDate(d); setHour(null); }} />
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft /> Terrain</Button>
              <Button variant="brand" onClick={() => setStep(2)}>Voir les créneaux <ArrowRight /></Button>
            </div>
          </motion.div>
        )}

        {/* ── Étape 3 : Créneau ── */}
        {step === 2 && field && (
          <motion.div key="s2" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }} transition={{ duration: 0.35 }}>
            <h2 className="display mb-1 text-2xl sm:text-3xl">Choisissez votre créneau</h2>
            <p className="mb-6 text-sm text-muted-foreground">{field.name} · {formatDateLong(date)}</p>

            {/* Changement de date rapide sans quitter l'étape */}
            <div className="mb-6"><DatePicker value={date} onChange={(d) => { setDate(d); setHour(null); }} /></div>

            <SlotGrid fieldId={field.id} date={date} selected={hour} onSelect={setHour} />

            <div className="mt-8 flex items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft /> Date</Button>
              {/* Le bouton Réserver ne s'active qu'après sélection d'un créneau libre */}
              <Button variant="brand" size="lg" disabled={hour === null} onClick={() => setStep(3)} className={hour !== null ? "animate-pulse-glow" : ""}>
                <Zap /> Réserver {hour !== null && `· ${slotLabel(hour)}`}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Étape 4 : Confirmation ── */}
        {step === 3 && field && hour !== null && (
          <motion.div key="s3" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }} transition={{ duration: 0.35 }} className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            {/* Récapitulatif */}
            <div className="h-fit rounded-lg border bg-card p-6 glow-ring">
              <p className="speed-eyebrow mb-4">Récapitulatif</p>
              <div className="relative mb-4 aspect-[16/8] overflow-hidden rounded-md">
                <Image src={field.image} alt={field.name} fill sizes="400px" className="object-cover" />
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Terrain</dt><dd className="font-semibold">{field.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd className="font-semibold">{formatDateLong(date)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Créneau</dt><dd className="font-semibold tabular-nums">{slotLabel(hour)}</dd></div>
                <div className="flex justify-between border-t pt-3"><dt className="text-muted-foreground">Total</dt><dd className="font-display text-2xl font-extrabold italic text-primary">{formatCAD(field.pricePerHour)}</dd></div>
              </dl>
            </div>

            {/* Coordonnées */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <h2 className="display text-2xl">Vos coordonnées</h2>
              <div className="space-y-2">
                <Label htmlFor="b-name">Nom complet</Label>
                <Input id="b-name" placeholder="Alex Tremblay" autoComplete="name" {...register("userName")} aria-invalid={!!errors.userName} />
                {errors.userName && <p className="text-xs text-destructive">{errors.userName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-email">Courriel</Label>
                <Input id="b-email" type="email" placeholder="alex@exemple.ca" autoComplete="email" {...register("userEmail")} aria-invalid={!!errors.userEmail} />
                {errors.userEmail && <p className="text-xs text-destructive">{errors.userEmail.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-phone">Téléphone</Label>
                <Input id="b-phone" type="tel" placeholder="(450) 555-0192" autoComplete="tel" {...register("userPhone")} aria-invalid={!!errors.userPhone} />
                {errors.userPhone && <p className="text-xs text-destructive">{errors.userPhone.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}><ArrowLeft /> Créneau</Button>
                <Button type="submit" variant="brand" size="lg" disabled={mutation.isPending}>
                  <PartyPopper /> {mutation.isPending ? "Confirmation…" : "Confirmer la réservation"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Paiement sur place. Annulation gratuite jusqu&apos;à 24 h avant le créneau.</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
