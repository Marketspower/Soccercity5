import type { Field, PricingPlan, Review } from "./types";

export const FIELDS: Field[] = [
  {
    id: "f1",
    name: "Terrain Alpha",
    slug: "alpha",
    image: "/fields/field-1.svg",
    dimensions: "40 × 20 m",
    turf: "Gazon synthétique 5G",
    lighting: true,
    lockerRooms: 2,
    parking: true,
    players: "5 vs 5",
    pricePerHour: 90,
    indoor: true,
    active: true,
  },
  {
    id: "f2",
    name: "Terrain Vitesse",
    slug: "vitesse",
    image: "/fields/field-2.svg",
    dimensions: "42 × 22 m",
    turf: "Gazon synthétique hybride",
    lighting: true,
    lockerRooms: 2,
    parking: true,
    players: "5 vs 5",
    pricePerHour: 95,
    indoor: true,
    active: true,
  },
  {
    id: "f3",
    name: "Terrain Élite",
    slug: "elite",
    image: "/fields/field-3.svg",
    dimensions: "60 × 40 m",
    turf: "Gazon synthétique 5G",
    lighting: true,
    lockerRooms: 4,
    parking: true,
    players: "7 vs 7",
    pricePerHour: 140,
    indoor: false,
    active: true,
  },
  {
    id: "f4",
    name: "Grand Stade",
    slug: "grand-stade",
    image: "/fields/field-4.svg",
    dimensions: "100 × 64 m",
    turf: "Gazon naturel",
    lighting: true,
    lockerRooms: 6,
    parking: true,
    players: "11 vs 11",
    pricePerHour: 240,
    indoor: false,
    active: true,
  },
];

export const PRICING: PricingPlan[] = [
  {
    id: "p1",
    name: "À l'heure",
    price: 90,
    unit: "/ heure",
    features: ["Bloc d'1 heure garanti", "Vestiaires + douches inclus", "Éclairage LED compris", "Annulation gratuite 24 h avant"],
    highlighted: false,
  },
  {
    id: "p2",
    name: "Journée",
    price: 650,
    unit: "/ jour",
    features: ["Terrain privatisé 8 h – 23 h", "Coordinateur sur place", "Sonorisation incluse", "10 ballons de match fournis"],
    highlighted: true,
  },
  {
    id: "p3",
    name: "Tournoi",
    price: 1200,
    unit: "/ événement",
    features: ["2 terrains + zone d'accueil", "Arbitres officiels", "Tableau des scores sur écran géant", "Podium et remise des trophées"],
    highlighted: false,
  },
  {
    id: "p4",
    name: "Entreprise",
    price: 1800,
    unit: "/ événement",
    features: ["Complexe entier privatisé", "Traiteur & cafétéria dédiée", "Animation team-building", "Captation vidéo du match"],
    highlighted: false,
  },
];

export const REVIEWS: Review[] = [
  { id: "r1", author: "Karim B.", role: "Capitaine — Ligue du jeudi", rating: 5, avatar: "KB", text: "Le gazon 5G est incroyable, les vestiaires impeccables." },
  { id: "r2", author: "Marie-Ève T.", role: "RH — Événement d'entreprise", rating: 5, avatar: "MT", text: "Tournoi corporatif de 60 personnes organisé de A à Z." },
  { id: "r3", author: "Yassine E.", role: "Joueur régulier", rating: 5, avatar: "YE", text: "Éclairage digne d'un stade pro. Jouer à 22 h ici, c'est une autre expérience." },
  { id: "r4", author: "Sophie L.", role: "Maman organisatrice", rating: 4, avatar: "SL", text: "Anniversaire de mon fils avec 20 enfants : encadrement parfait." },
  { id: "r5", author: "David R.", role: "Entraîneur U15", rating: 5, avatar: "DR", text: "Nous louons le Grand Stade chaque semaine. Surface constante." },
];

export const FAQ = [
  { q: "Comment réserver un terrain ?", a: "Choisissez votre terrain, une date, puis un créneau vert d'une heure. Confirmez vos coordonnées : la réservation est instantanée." },
  { q: "Puis-je annuler ou déplacer ma réservation ?", a: "Oui, gratuitement jusqu'à 24 h avant le créneau, directement depuis le lien de votre courriel de confirmation." },
  { q: "Les crampons sont-ils autorisés ?", a: "Sur nos gazons synthétiques, seuls les crampons moulés (FG/TF) sont autorisés." },
  { q: "Que comprend la location ?", a: "Chaque bloc d'une heure inclut le terrain, l'éclairage, l'accès aux vestiaires et douches, ainsi que le stationnement." },
  { q: "Organisez-vous des événements privés ?", a: "Oui : anniversaires, tournois, événements d'entreprise, sorties scolaires. Remplissez le formulaire dédié." },
  { q: "Le complexe est-il ouvert l'hiver ?", a: "Nos terrains intérieurs Alpha et Vitesse sont chauffés et ouverts à l'année, de 8 h à 23 h, 7 jours sur 7." },
];

export const STATS = [
  { value: 4, suffix: "", label: "Terrains premium" },
  { value: 12500, suffix: "+", label: "Matchs joués" },
  { value: 98, suffix: "%", label: "Clients satisfaits" },
  { value: 8, suffix: "", label: "Années d'expérience" },
];

export const CONTACT = {
  phone: "+1 (450) 555-0192",
  whatsapp: "+1 (450) 555-0192",
  email: "info@soccercity.ca",
  address: "2450 boulevard des Sports, Saint-Constant, QC J5A 2G7",
  hours: "Tous les jours · 8 h – 23 h",
  mapsQuery: "Saint-Constant,QC",
};