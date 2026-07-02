"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#terrains", label: "Terrains" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#galerie", label: "Galerie" },
  { href: "/evenements", label: "Événements" },
  { href: "/#contact", label: "Contact" },
];

/**
 * Barre de navigation fixe.
 * Transparente sur le hero → verre dépoli dès le premier scroll.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ferme le menu mobile à chaque navigation
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled ? "glass shadow-card" : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between md:h-20">
        {/* Logo — jamais dénaturé : image officielle, léger zoom au survol */}
        <Link href="/" aria-label="Soccer City — accueil" className="group flex items-center gap-2">
          {/* Deux déclinaisons officielles : version blanche (dark) / version encre (light) */}
          <Image
            src="/brand/logo.png"
            alt="Soccer City"
            width={168}
            height={50}
            priority
            className="hidden h-8 w-auto transition-transform duration-300 group-hover:scale-[1.04] dark:block md:h-10"
          />
          <Image
            src="/brand/logo-light.png"
            alt="Soccer City"
            width={168}
            height={50}
            priority
            className="h-8 w-auto transition-transform duration-300 group-hover:scale-[1.04] dark:hidden md:h-10"
          />
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link" data-active={pathname === l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="brand" size="sm" className="hidden sm:inline-flex">
            <Link href="/reservation">
              <CalendarCheck /> Réserver
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Menu mobile plein écran */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass overflow-hidden border-t lg:hidden"
            aria-label="Navigation mobile"
          >
            <div className="container flex flex-col gap-1 py-4">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    href={l.href}
                    className="block rounded-md px-3 py-3 font-display text-lg font-bold uppercase italic tracking-wide hover:bg-accent hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <Button asChild variant="brand" size="lg" className="mt-2">
                <Link href="/reservation">
                  <CalendarCheck /> Réserver un terrain
                </Link>
              </Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
