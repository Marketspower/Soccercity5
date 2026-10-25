// lib/field-url.ts
// Identifiant lisible d'un terrain dans l'adresse :
// /reservation?terrain=grand-terrain (au lieu d'un code illisible).
import type { Field } from "./types";

export const normalizeKey = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Slug du terrain, sinon son nom, sinon son id. */
export const fieldUrlKey = (f: Pick<Field, "id" | "slug" | "name">) =>
  (f.slug && normalizeKey(f.slug)) || normalizeKey(f.name || "") || f.id;
