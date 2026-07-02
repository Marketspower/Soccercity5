import type { Metadata } from "next";
import { CONTACT } from "@/lib/data";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Confidentialite() {
  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <p className="speed-eyebrow mb-4">Vos données</p>
      <h1 className="display mb-10 text-4xl">Politique de confidentialité</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground">
        <section>
          <h2>Données collectées</h2>
          <p>Lors d&apos;une réservation ou d&apos;une demande d&apos;événement, nous collectons uniquement les informations nécessaires : nom, prénom, courriel, numéro de téléphone, et le détail de votre demande.</p>
        </section>
        <section>
          <h2>Finalités</h2>
          <p>Ces données servent exclusivement à gérer votre réservation, vous contacter au sujet de votre événement et, avec votre consentement, vous envoyer notre infolettre. Elles ne sont jamais vendues à des tiers.</p>
        </section>
        <section>
          <h2>Conservation et sécurité</h2>
          <p>Vos données sont conservées de façon sécurisée le temps nécessaire à la gestion de la relation commerciale, conformément à la Loi 25 (Québec) et aux lois canadiennes applicables.</p>
        </section>
        <section>
          <h2>Vos droits</h2>
          <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données à tout moment en écrivant à {CONTACT.email}.</p>
        </section>
        <section>
          <h2>Témoins (cookies)</h2>
          <p>Le site utilise uniquement des témoins techniques indispensables à son fonctionnement (préférence de thème, panier de réservation). Aucun traceur publicitaire n&apos;est déposé.</p>
        </section>
      </div>
    </div>
  );
}
