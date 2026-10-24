"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

// Pages où le navbar et footer ne doivent pas s'afficher
const HIDE_NAV_FOOTER_PATHS = ["/admin", "/confidentialite", "/conditions"];

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldHideNavFooter = HIDE_NAV_FOOTER_PATHS.some((path) => pathname?.startsWith(path));

  // Rendu identique côté serveur et navigateur : Google voit le menu,
  // le contenu et le pied de page dès le premier chargement.
  return (
    <>
      {!shouldHideNavFooter && <Navbar />}
      <main>{children}</main>
      {!shouldHideNavFooter && <Footer />}
    </>
  );
}
