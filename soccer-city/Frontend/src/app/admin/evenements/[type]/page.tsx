// app/admin/evenements/[type]/page.tsx
// Photos et vidéos affichées sur la page publique d'un type d'événement.
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminGallery } from "@/components/admin/AdminGallery";
import { AdminMedia } from "@/components/admin/AdminMedia";
import { MEDIA_EVENT_TYPES, type MediaEventType } from "@/lib/types";

export default function AdminEventTypeMediaPage() {
  const params = useParams();
  const decodedType = decodeURIComponent(String(params?.type ?? "")) as MediaEventType;
  const valid = MEDIA_EVENT_TYPES.includes(decodedType);
  const publicHref =
    decodedType === "Anniversaire"
      ? "/forfaits/anniversaire"
      : decodedType === "Académie"
      ? "/forfaits/academie"
      : `/evenements/${encodeURIComponent(decodedType)}`;

  return (
    <div className="space-y-10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/evenements"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour aux demandes d&apos;événement
        </Link>
        {valid && (
          <Link href={publicHref} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Voir la page publique <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      {!valid ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Type d&apos;événement inconnu.
        </p>
      ) : (
        <>
          <AdminGallery fixedEventType={decodedType} />
          <AdminMedia fixedEventType={decodedType} />
        </>
      )}
    </div>
  );
}
