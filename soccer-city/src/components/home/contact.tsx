"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Mail, MapPin, MessageCircle, Phone, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/motion/reveal";
import { CONTACT } from "@/lib/data";

/* Validation Zod du formulaire de contact */
const schema = z.object({
  name: z.string().min(2, "Votre nom est requis"),
  email: z.string().email("Adresse courriel invalide"),
  message: z.string().min(10, "Dites-nous en un peu plus (10 caractères min.)"),
});
type FormValues = z.infer<typeof schema>;

const INFOS = [
  { Icon: Phone, label: "Téléphone", value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/[^+\d]/g, "")}` },
  { Icon: MessageCircle, label: "WhatsApp", value: "Écrivez-nous", href: `https://wa.me/${CONTACT.whatsapp.replace(/[^\d]/g, "")}` },
  { Icon: Mail, label: "Courriel", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  { Icon: MapPin, label: "Adresse", value: CONTACT.address, href: `https://maps.google.com/?q=${encodeURIComponent(CONTACT.address)}` },
  { Icon: Clock, label: "Horaires", value: CONTACT.hours },
];

export function Contact() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (_data: FormValues) => {
    // ➜ Brancher ici l'envoi réel (route API / Supabase / Resend)
    await new Promise((r) => setTimeout(r, 700));
    setSent(true);
  };

  return (
    <section id="contact" className="container py-24 md:py-32">
      <Reveal className="mb-14 max-w-2xl">
        <p className="speed-eyebrow mb-4">Contact</p>
        <h2 className="display text-4xl sm:text-5xl">Parlons de votre <span className="text-primary">prochain match</span></h2>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coordonnées + carte */}
        <Reveal className="space-y-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {INFOS.map(({ Icon, label, value, href }) => {
              const content = (
                <div className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-glow-sm">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-medium">{value}</p>
                  </div>
                </div>
              );
              return (
                <li key={label} className={label === "Adresse" ? "sm:col-span-2" : ""}>
                  {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{content}</a> : content}
                </li>
              );
            })}
          </ul>

          {/* Carte Google Maps (iframe embed, sans clé API) */}
          <div className="overflow-hidden rounded-lg border shadow-card">
            <iframe
              title="Soccer City sur Google Maps"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(CONTACT.mapsQuery)}&z=13&output=embed`}
              className="h-64 w-full grayscale-[40%] transition-all duration-500 hover:grayscale-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Reveal>

        {/* Formulaire */}
        <Reveal delay={0.15}>
          <div className="glass rounded-lg p-7 md:p-8">
            {sent ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-pitch/15 text-pitch">
                  <Check className="size-8" />
                </span>
                <h3 className="display text-2xl">Message envoyé</h3>
                <p className="mt-2 text-sm text-muted-foreground">Notre équipe vous répond sous 24 h ouvrables.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="c-name">Nom complet</Label>
                  <Input id="c-name" placeholder="Alex Tremblay" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Courriel</Label>
                  <Input id="c-email" type="email" placeholder="alex@exemple.ca" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-message">Message</Label>
                  <Textarea id="c-message" placeholder="Bonjour, j'aimerais…" {...register("message")} aria-invalid={!!errors.message} />
                  {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                </div>
                <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isSubmitting}>
                  <Send /> {isSubmitting ? "Envoi en cours…" : "Envoyer le message"}
                </Button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
