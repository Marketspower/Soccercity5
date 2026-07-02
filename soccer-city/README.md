# ⚡ Soccer City — Site premium de réservation

Site web complet pour le centre de location de terrains **Soccer City** :
vitrine immersive, réservation en ligne en moins de 60 secondes,
gestion d'événements privés et tableau de bord d'administration.

Identité dérivée du logo officiel : **bleu électrique `#0357F3`**, noir profond,
typographie italique « vitesse » (Saira + Archivo), lignes de vitesse comme motif système.

---

## 🚀 Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

> **Node 18.17+ requis.** Le premier `npm install` télécharge les polices Google
> (Saira, Archivo) au moment du build via `next/font`.

## 🗺️ Pages

| Route | Description |
|---|---|
| `/` | Accueil : hero animé, terrains, tarifs, services, galerie, avis, FAQ, contact |
| `/reservation` | Réservation en 4 étapes : Terrain → Date → Créneau → Confirmation |
| `/evenements` | Demande d'événement privé (anniversaire, tournoi, entreprise…) |
| `/admin` | Tableau de bord : statistiques, blocage de créneaux |
| `/admin/terrains` | CRUD des terrains (ajout, édition, activation, suppression) |
| `/admin/reservations` | Liste, accepter/refuser, export **Excel (CSV)** et **PDF** |
| `/admin/evenements` | Demandes d'événements : accepter / refuser, export |
| `/admin/tarifs` | Mise à jour des prix horaires |
| `/admin/utilisateurs` | Annuaire clients (dérivé des réservations) |
| `/admin/notifications` | Envoi + historique de notifications |
| `/mentions-legales`, `/confidentialite` | Pages légales |

## 🧪 Mode démo (par défaut)

Le site fonctionne **sans backend** : les réservations, événements, terrains et
blocages sont conservés dans le navigateur (Zustand + `localStorage`), avec une
occupation simulée réaliste des créneaux (déterministe, ≈ 35 %).

- Réservez un créneau côté client → il apparaît instantanément dans `/admin/reservations`
  et devient gris dans la grille de réservation.
- L'admin est **libre d'accès** en démo. À protéger avant mise en production (voir ci-dessous).

## 🗄️ Passage en production avec Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) et exécuter
   **`supabase/schema.sql`** dans l'éditeur SQL (10 tables + relations + RLS).
2. Copier `.env.example` → `.env.local` et renseigner l'URL + les clés.
3. Remplacer le corps des fonctions de **`src/lib/api.ts`**
   (`fetchSlots`, `createReservation`, `createPrivateEvent`) par les requêtes
   Supabase équivalentes — les composants n'ont pas besoin d'être modifiés
   (ils consomment TanStack Query).
4. Protéger `/admin` : activer Supabase Auth, puis ajouter un `middleware.ts`
   qui vérifie le rôle `admin` (la fonction SQL `is_admin()` est déjà fournie).

## 🖼️ Remplacer les visuels de démonstration

Les images des terrains (`public/fields/*.svg`) et de la galerie
(`public/gallery/*.svg`) sont des **visuels générés aux couleurs de la marque**,
prévus pour être remplacés par de vraies photos :

- même nom de fichier en `.jpg`/`.webp`, ou
- mettre à jour les chemins dans `src/lib/data.ts` et `src/components/home/gallery.tsx`.

**Vidéo du hero (optionnelle)** : déposer un fichier `public/hero.mp4`
(drone du complexe, match de nuit…) — il sera lu automatiquement en fond du hero.

## 🎨 Design system

- Tokens dans `tailwind.config.ts` + variables CSS dans `src/app/globals.css`
- **Dark mode par défaut** (fidèle au logo), light mode via la bascule de la barre de navigation
- Signature visuelle : eyebrow « lignes de vitesse », coupes `slash-cut`,
  glow bleu, boutons italiques uppercase
- Animations : Framer Motion (reveals au scroll, compteurs, transitions d'étapes),
  respect de `prefers-reduced-motion`

## 📦 Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS ·
Framer Motion · Radix UI (shadcn) · Lucide · React Hook Form + Zod ·
TanStack Query · date-fns · Zustand · Supabase (schéma fourni)

---

© Soccer City. Code livré prêt à personnaliser.
