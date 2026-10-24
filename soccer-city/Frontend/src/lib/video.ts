// lib/video.ts
// Reconnaît les liens YouTube / Vimeo pour les intégrer avec un vrai lecteur.
// Avantage : les vidéos hébergées sur YouTube/Vimeo ne consomment pas le
// stockage Supabase (1 Go sur le plan gratuit) et se chargent plus vite.

export type VideoSource =
  | { kind: "youtube"; id: string; embedUrl: string; thumbnail: string }
  | { kind: "vimeo"; id: string; embedUrl: string; thumbnail: null }
  | { kind: "file"; url: string };

export function parseVideoUrl(raw: string): VideoSource | null {
  const url = (raw || "").trim();
  if (!url) return null;

  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    const id = yt[1];
    return {
      kind: "youtube",
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (vm) {
    return { kind: "vimeo", id: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}`, thumbnail: null };
  }

  if (/^https:\/\//.test(url)) return { kind: "file", url };
  return null;
}

/** Vrai si l'URL est un lien YouTube ou Vimeo valide. */
export const isEmbeddableVideo = (url: string) => {
  const v = parseVideoUrl(url);
  return !!v && v.kind !== "file";
};
