// config/packages.ts
// Forfaits vendus en ligne (page /forfaits).
// v1 : fichier de configuration. v2 possible : table Supabase `packages`
// pour éditer prix, horaires et groupes depuis le CMS sans redéploiement.

/** ===== Forfait anniversaire ===== */
export const ANNIVERSAIRE = {
  key: "anniversaire",
  label: "Forfait anniversaire",
  /** Sous-total avant taxes. */
  price: 400,
  /** Durée totale en heures (2 h 30). */
  durationHours: 2.5,
  /** Première et dernière heure de début proposées (fin au plus tard 23 h). */
  firstStartHour: 8,
  lastStartHour: 20.5,
  timeline: [
    { duration: "1 h 30", label: "Animation, gâteau et fête" },
    { duration: "1 h 00", label: "Match de soccer" },
  ],
} as const;

/** ===== Académie ===== */
export interface AcademyGroup {
  key: string;
  label: string;
  schedule: string;
  capacity: number;
}

export const ACADEMIE = {
  key: "academie",
  label: "Académie",
  /** Sous-total avant taxes, par session de 10 semaines. */
  price: 460,
  period: "10 semaines",
  sessionsPerWeek: 2,
  seance: [
    { duration: "10 min", label: "Échauffement" },
    { duration: "20 min", label: "Exercices techniques" },
    { duration: "30 min", label: "Match" },
  ],
  objectifs:
    "Développer la technique, le contrôle du ballon, les passes et la conduite de balle avec les deux pieds (gauche et droit), tout en travaillant le jeu collectif et la prise de décision.",
  groups: [
    {
      key: "u6-u8",
      label: "U6 – U8 (5 à 8 ans)",
      schedule: "Samedi + Dimanche · 10 h 00 – 11 h 00",
      capacity: 12,
    },
    {
      key: "u9-u12",
      label: "U9 – U12 (9 à 12 ans)",
      schedule: "Mardi + Jeudi · 18 h 00 – 19 h 00",
      capacity: 12,
    },
    {
      key: "ados",
      label: "Ados (13 à 16 ans)",
      schedule: "Mercredi + Vendredi · 19 h 00 – 20 h 00",
      capacity: 12,
    },
  ] as AcademyGroup[],
} as const;

export function academyGroup(key: string): AcademyGroup | undefined {
  return ACADEMIE.groups.find((g) => g.key === key);
}

/** ===== Événements réservables en ligne (prix À L'HEURE) ===== */
/** ⚠️ PRIX À AJUSTER par le client — valeurs de départ indicatives. */
export interface EventPackage {
  key: string;
  label: string;
  /** Sous-total avant taxes, PAR HEURE réservée (valeur de secours :
   *  le prix réel se règle dans l'admin, page Tarifs). */
  pricePerHour: number;
  tagline: string;
}

export const EVENT_PACKAGES: Record<string, EventPackage> = {
  "Tournoi":          { key: "tournoi",     label: "Tournoi",          pricePerHour: 130,  tagline: "Les deux terrains, arbitrage et tableau des scores" },
  "Entreprise":       { key: "entreprise",  label: "Entreprise",       pricePerHour: 150,  tagline: "Team building clé en main, espace café privatisé" },
  "École":            { key: "ecole",       label: "École",            pricePerHour: 90,   tagline: "Journée sportive encadrée pour vos élèves" },
  "Événement privé":  { key: "prive",       label: "Événement privé",  pricePerHour: 150,  tagline: "Le complexe rien que pour votre groupe" },
  "Compétition":      { key: "competition", label: "Compétition",      pricePerHour: 130,  tagline: "Structure officielle, classement et récompenses" },
};

export function eventPackage(type: string): EventPackage | null {
  return EVENT_PACKAGES[type] ?? null;
}
