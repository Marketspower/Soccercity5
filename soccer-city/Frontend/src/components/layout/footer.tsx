"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

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
    { href: "/conditions", label: "Conditions d'utilisation" },
    { href: "/admin", label: "Administration" },
  ]},
];

const SOCIALS = [
  { href: "https://www.instagram.com/soccercity5.montreal", label: "Instagram", Icon: Instagram },
  { href: "https://m.facebook.com/story.php?story_fbid=pfbid0Yq9K5wDTjBqGkmGituKdxyRpzqHQqRSLLBeCoeZRsgb5oCE4eQ1ftqzQgY9PokQJl&id=61592598695737", label: "Facebook", Icon: Facebook },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Marque */}
          <div className="space-y-6">
            <Image
              src="/logo.png"
              alt="Soccer City"
              width={180}
              height={54}
              className="h-12 w-auto"
            />
            <p className="max-w-sm text-sm leading-relaxed text-white/60">
              Le complexe où le jeu s&apos;accélère. Terrains premium, réservation instantanée,
              ouvert 7 jours sur 7 de 8 h à 23 h.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-10 items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          {NAV.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="mb-4 font-semibold text-white">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col items-center justify-between gap-3 text-xs text-white/30 sm:flex-row">
          <p>© {new Date().getFullYear()} Soccer City. Tous droits réservés.</p>
          <p>2450 boulevard des Sports, Saint-Constant, QC J5A 2G7</p>
        </div>
      </div>
    </footer>
  );
}
