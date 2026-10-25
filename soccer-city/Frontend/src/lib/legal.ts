// lib/legal.ts
// ─────────────────────────────────────────────────────────────────────
// Informations légales utilisées par les pages « Politique de
// confidentialité », « Conditions d'utilisation » et « Mentions légales ».
// ⚠️ À COMPLÉTER / VÉRIFIER par l'exploitant (voir les commentaires).
// ─────────────────────────────────────────────────────────────────────
import { CONTACT } from "./data";

export const LEGAL = {
  /** Nom commercial affiché */
  brand: "Soccer City",
  /** Nom légal de l'entreprise exploitante (ex. « 1234-5678 Québec inc. »).
   *  Laisser vide tant qu'il n'est pas confirmé : la page affiche alors le nom commercial. */
  legalName: "",
  /** Numéro d'entreprise du Québec (NEQ) — facultatif */
  neq: "",
  address: CONTACT.address,
  phone: CONTACT.phone,
  email: CONTACT.email,

  /** Responsable de la protection des renseignements personnels (Loi 25).
   *  Par défaut, c'est la personne ayant la plus haute autorité dans l'entreprise.
   *  Le titre et les coordonnées doivent être publiés ; le nom est facultatif. */
  privacyOfficer: {
    title: "Responsable de la protection des renseignements personnels",
    name: "",
    email: CONTACT.email,
  },

  /** Politique d'annulation / remboursement. Laisser vide tant qu'elle n'est
   *  pas définie : la page invite alors le client à nous contacter. */
  cancellationPolicy: "",

  /** District judiciaire (Saint-Jean-sur-Richelieu = district d'Iberville) */
  judicialDistrict: "Iberville",

  /** Date de dernière mise à jour affichée sur les pages */
  lastUpdated: "25 octobre 2026",
} as const;

export const legalEntity = () =>
  LEGAL.legalName
    ? `${LEGAL.legalName}${LEGAL.neq ? ` (NEQ ${LEGAL.neq})` : ""}, faisant affaire sous le nom ${LEGAL.brand}`
    : LEGAL.brand;
