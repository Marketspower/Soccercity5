"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { CalendarCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#terrains", label: "Terrains" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#galerie", label: "Galerie" },
  { href: "/evenements", label: "Événements" },
  { href: "/#contact", label: "Contact" },
];

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

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="Soccer City"
            width={160}
            height={48}
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="brand" size="sm" className="hidden sm:inline-flex">
            <Link href="/reservation">
              <CalendarCheck className="size-4" /> Réserver
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-white/10">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="py-3 text-white/80 hover:text-white transition-colors text-lg font-medium"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="py-3 text-white/50 hover:text-white/80 transition-colors text-lg font-medium"
              onClick={() => setOpen(false)}
            >
              Administration
            </Link>
            <Button asChild variant="brand" className="mt-2 w-full">
              <Link href="/reservation" onClick={() => setOpen(false)}>
                <CalendarCheck className="size-4" /> Réserver un terrain
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}