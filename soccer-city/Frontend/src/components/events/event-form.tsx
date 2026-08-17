"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateCalendar } from "@/components/ui/date-calendar";
import { createPrivateEvent } from "@/lib/api";
import type { EventType } from "@/lib/types";

const EVENT_TYPES: EventType[] = [
  "Anniversaire",
  "Tournoi",
  "Entreprise",
  "École",
  "Événement privé",
  "Compétition",
];

const schema = z.object({
  lastName: z.string().min(2, "Le nom est requis"),
  firstName: z.string().min(2, "Le prénom est requis"),
  company: z.string().optional(),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  email: z.string().email("Adresse courriel invalide"),
  date: z.string().min(1, "La date est requise"),
  guests: z.coerce
    .number()
    .min(1, "Minimum 1 personne")
    .max(500, "Maximum 500 personnes"),
  type: z.enum(EVENT_TYPES as [EventType, ...EventType[]]),
  message: z.string().min(10, "Décrivez votre événement (10 caractères min.)"),
});

type FormValues = z.infer<typeof schema>;

type EventFormProps = {
  selectedType?: EventType;
};

export function EventForm({ selectedType }: EventFormProps) {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: selectedType,
      date: "",
    },
  });
  useEffect(() => {
    if (selectedType) {
      setValue("type", selectedType, {
        shouldValidate: true,
      });
    }
  }, [selectedType, setValue]);

  const onSubmit = async (data: FormValues) => {
    await createPrivateEvent(data);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <span className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-pitch/15 text-pitch">
          <Check className="size-10" strokeWidth={3} />
        </span>
        <h2 className="display text-3xl">Demande envoyée</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Notre équipe vous rappelle sous 24 h.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="glass rounded-lg p-7 md:p-9"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="e-lastname">Nom</Label>
          <Input
            id="e-lastname"
            placeholder="Tremblay"
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-firstname">Prénom</Label>
          <Input
            id="e-firstname"
            placeholder="Alex"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-company">
            Entreprise{" "}
            <span className="font-normal text-muted-foreground">
              (facultatif)
            </span>
          </Label>
          <Input
            id="e-company"
            placeholder="Nom de votre organisation"
            {...register("company")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-phone">Téléphone</Label>
          <Input
            id="e-phone"
            type="tel"
            placeholder="(450) 555-0192"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-email">Courriel</Label>
          <Input
            id="e-email"
            type="email"
            placeholder="alex@exemple.ca"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-date">Date souhaitée</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DateCalendar
                value={field.value}
                onChange={field.onChange}
                error={!!errors.date}
              />
            )}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-guests">Nombre de personnes</Label>
          <Input
            id="e-guests"
            type="number"
            min={1}
            max={500}
            placeholder="30"
            {...register("guests")}
          />
          {errors.guests && (
            <p className="text-xs text-destructive">{errors.guests.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-type">Type d&apos;événement</Label>
          <Select id="e-type" defaultValue="" {...register("type")}>
            <option value="" disabled>
              Choisir…
            </option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-message">Votre projet</Label>
          <Textarea
            id="e-message"
            placeholder="Décrivez votre événement…"
            {...register("message")}
          />
          {errors.message && (
            <p className="text-xs text-destructive">{errors.message.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="mt-7 w-full"
        disabled={isSubmitting}
      >
        <Send /> {isSubmitting ? "Envoi en cours…" : "Envoyer la demande"}
      </Button>
    </form>
  );
}