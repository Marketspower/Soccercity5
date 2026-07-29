// app/admin/evenements/[type]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminEventDetailPage() {
  const params = useParams();
  const type = params?.type as string;
  const decodedType = decodeURIComponent(type);

  return (
    <div className="container py-8">
      <Link href="/admin/evenements" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="size-4" />
        Retour aux événements
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white">Administration - Événement</h1>
        <p className="text-muted-foreground mt-2">Type: <span className="text-white font-semibold">{decodedType}</span></p>
        
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-500">📝 Page d'administration en construction</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cette page permettra de gérer les détails de l'événement.
          </p>
        </div>

        <div className="mt-6 flex gap-4">
          <Button variant="brand">Modifier</Button>
          <Button variant="destructive">Supprimer</Button>
        </div>
      </div>
    </div>
  );
}