"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Facebook, Instagram, Youtube, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTACT } from "@/lib/data";

const NAV = [
  { title: "Explorer", links: [
    { href: "/#terrains", label: "Nos terrains" },
    { href: "/#tarifs", label: "Tarifs" },
    { href: "/#galerie", label: "Galerie" },
    { href: "/#services", label: "Services" },
  ]},
  { title: "Réserver", links: [
    { href: "/reservation", label: "Réserver un terrain" },
    { href: "/evenements", label: "Organiser un événement" },
    { href: "/#faq", label: "FAQ" },
    { href: "/#contact", label: "Nous joindre" },
  ]},
  { title: "Légal", links: [
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/confidentialite", label: "Politique de confidentialité" },
    { href: "/admin", label: "Espace administration" },
  ]},
];

const SOCIALS = [
  { href: "https://instagram.com", label: "Instagram", Icon: Instagram },
  { href: "https://facebook.com", label: "Facebook", Icon: Facebook },
  { href: "https://youtube.com", label: "YouTube", Icon: Youtube },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="relative mt-24 overflow-hidden border-t bg-secondary/40">
      {/* Halo de marque en fond */}
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-40" aria-hidden />

      <div className="container relative grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* Marque + newsletter */}
        <div className="space-y-6">
          <Image src="/brand/logo.png" alt="Soccer City" width={200} height={60} className="hidden h-10 w-auto dark:block" />
          <Image src="/brand/logo-light.png" alt="Soccer City" width={200} height={60} className="h-10 w-auto dark:hidden" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Le complexe où le jeu s&apos;accélère. Terrains premium, réservation instantanée,
            ouvert 7 jours sur 7 de 8 h à 23 h.
          </p>

          {/* Newsletter */}
          <div>
            <p className="mb-2 font-display text-sm font-bold uppercase italic tracking-wider">Infolettre</p>
            {subscribed ? (
              <p className="flex items-center gap-2 text-sm text-pitch"><Check className="size-4" /> Inscription confirmée. À bientôt sur le terrain.</p>
            ) : (
              <div className="flex max-w-sm gap-2">
                <Input
                  type="email"
                  placeholder="votre@courriel.ca"
                  aria-label="Adresse courriel pour l'infolettre"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="brand"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label="S'inscrire à l'infolettre"
                  onClick={() => email.includes("@") && setSubscribed(true)}
                >
                  <ArrowRight />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {SOCIALS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="glass flex size-10 items-center justify-center rounded-md text-muted-foreground transition-all hover:-translate-y-1 hover:text-primary hover:shadow-glow-sm"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Colonnes de navigation */}
        {NAV.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="mb-4 font-display text-sm font-bold uppercase italic tracking-wider text-primary">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="relative border-t">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Soccer City. Tous droits réservés.</p>
          <p>{CONTACT.address}</p>
        </div>
      </div>
    </footer>
  );
}
