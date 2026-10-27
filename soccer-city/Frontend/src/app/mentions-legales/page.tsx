import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL, legalEntity } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
};

export default function MentionsLegales() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Mentions légales"
      sections={[
        {
          id: "editeur",
          title: "Éditeur du site",
          body: (
            <p>
              {legalEntity()}
              <br />{LEGAL.address}
              <br />Téléphone : {LEGAL.phone} · Courriel :{" "}
              <a href={`mailto:${LEGAL.email}`} className="text-primary hover:underline">{LEGAL.email}</a>
            </p>
          ),
        },
        {
          id: "hebergement",
          title: "Hébergement",
          body: (
            <p>
              Site hébergé par Vercel Inc. (vercel.com). Base de données et fichiers hébergés par Supabase
              (supabase.com). Paiements traités par Stripe (stripe.com).
            </p>
          ),
        },
        {
          id: "propriete",
          title: "Propriété intellectuelle",
          body: (
            <p>
              L&apos;ensemble des contenus du site (logo, textes, photos, vidéos, structure) appartient à {LEGAL.brand}{" "}
              ou à ses partenaires et ne peut être reproduit sans autorisation écrite.
            </p>
          ),
        },
        {
          id: "liens",
          title: "Documents associés",
          body: (
            <p>
              <Link href="/conditions" className="text-primary hover:underline">Conditions d&apos;utilisation</Link>
              {" · "}
              <Link href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>
            </p>
          ),
        },
      ]}
    />
  );
}
