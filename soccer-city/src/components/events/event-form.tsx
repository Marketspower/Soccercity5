"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPrivateEvent } from "@/lib/api";
import type { EventType } from "@/lib/types";

const EVENT_TYPES: EventType[] = ["Anniversaire", "Tournoi", "Entreprise", "École", "Événement privé", "Compétition"];

/* Validation stricte du brief : tous les champs requis sauf Entreprise */
const schema = z.object({
  lastName: z.string().min(2, "Le nom est requis"),
  firstName: z.string().min(2, "Le prénom est requis"),
  company: z.string().optional(),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  email: z.string().email("Adresse courriel invalide"),
  date: z.string().min(1, "La date est requise"),
  guests: z.coerce.number().min(1, "Minimum 1 personne").max(500, "Maximum 500 personnes"),
  type: z.enum(EVENT_TYPES as [EventType, ...EventType[]], { errorMap: () => ({ message: "Choisissez un type d'événement" }) }),
  message: z.string().min(10, "Décrivez votre événement (10 caractères min.)"),
});
type FormValues = z.infer<typeof schema>;

export function EventForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    await createPrivateEvent(data);
    setSent(true);
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border bg-card p-10 text-center glow-ring"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-pitch/15 text-pitch"
        >
          <Check className="size-10" strokeWidth={3} />
        </motion.span>
        <h2 className="display text-3xl">Demande envoyée</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Notre équipe événements vous rappelle sous 24 h ouvrables avec une proposition sur mesure.
        </p>
      </motion.div>
    );
  }

  const err = (k: keyof FormValues) => errors[k] && <p className="text-xs text-destructive">{errors[k]?.message as string}</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="glass rounded-lg p-7 md:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="e-lastname">Nom</Label>
          <Input id="e-lastname" placeholder="Tremblay" autoComplete="family-name" {...register("lastName")} aria-invalid={!!errors.lastName} />
          {err("lastName")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-firstname">Prénom</Label>
          <Input id="e-firstname" placeholder="Alex" autoComplete="given-name" {...register("firstName")} aria-invalid={!!errors.firstName} />
          {err("firstName")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-company">Entreprise <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
          <Input id="e-company" placeholder="Nom de votre organisation" autoComplete="organization" {...register("company")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-phone">Téléphone</Label>
          <Input id="e-phone" type="tel" placeholder="(450) 555-0192" autoComplete="tel" {...register("phone")} aria-invalid={!!errors.phone} />
          {err("phone")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-email">Courriel</Label>
          <Input id="e-email" type="email" placeholder="alex@exemple.ca" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
          {err("email")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-date">Date souhaitée</Label>
          <Input id="e-date" type="date" min={new Date().toISOString().split("T")[0]} {...register("date")} aria-invalid={!!errors.date} />
          {err("date")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-guests">Nombre de personnes</Label>
          <Input id="e-guests" type="number" min={1} max={500} placeholder="30" {...register("guests")} aria-invalid={!!errors.guests} />
          {err("guests")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-type">Type d&apos;événement</Label>
          <Select id="e-type" defaultValue="" {...register("type")} aria-invalid={!!errors.type}>
            <option value="" disabled>Choisir…</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          {err("type")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-message">Votre projet</Label>
          <Textarea id="e-message" placeholder="Décrivez votre événement : ambiance souhaitée, horaire, besoins particuliers…" {...register("message")} aria-invalid={!!errors.message} />
          {err("message")}
        </div>
      </div>

      <Button type="submit" variant="brand" size="lg" className="mt-7 w-full" disabled={isSubmitting}>
        <Send /> {isSubmitting ? "Envoi en cours…" : "Envoyer la demande"}
      </Button>
    </form>
  );
}
