"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

// Pages où le navbar et footer ne doivent pas s'afficher
const HIDE_NAV_FOOTER_PATHS = ['/admin', '/confidentialite', '/conditions'];

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculer si on doit cacher le navbar/footer
  const shouldHideNavFooter = HIDE_NAV_FOOTER_PATHS.some(path => pathname?.startsWith(path));

  // Afficher le contenu sans navbar/footer pendant l'hydratation
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <>
      {!shouldHideNavFooter && <Navbar />}
      <main>{children}</main>
      {!shouldHideNavFooter && <Footer />}
    </>
  );
}