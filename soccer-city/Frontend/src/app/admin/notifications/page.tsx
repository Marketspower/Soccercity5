// app/admin/notifications/page.tsx
"use client";

import { useState } from "react";
import { Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import type { AppNotification } from "@/lib/types";

const AUDIENCES = { 
  all: "Tout le monde", 
  clients: "Clients", 
  admins: "Équipe" 
} as const;

type AudienceType = keyof typeof AUDIENCES;

export default function AdminNotifications() {
  const { notifications, sendNotification } = useAppStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AudienceType>("all");

  const send = () => {
    if (!title.trim() || !body.trim()) return;
    
    // Créer l'objet avec toutes les propriétés requises
    const notificationData = {
      title: title.trim(),
      body: body.trim(),
      audience: audience,
      sentById: null as string | null
    };
    
    sendNotification(notificationData);
    setTitle(""); 
    setBody("");
  };

  return (
    <div className="grid gap-8 p-6 xl:grid-cols-2">
      <section className="h-fit rounded-lg border bg-card p-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Prévenez vos clients : promotion, fermeture exceptionnelle, nouveau créneau.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="n-title">Titre</Label>
            <Input 
              id="n-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Soirée -20 % ce vendredi" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="n-body">Message</Label>
            <Textarea 
              id="n-body" 
              value={body} 
              onChange={(e) => setBody(e.target.value)} 
              placeholder="Tous les créneaux après 20 h sont à -20 %…" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="n-aud">Destinataires</Label>
            <Select 
              id="n-aud" 
              value={audience} 
              onChange={(e) => setAudience(e.target.value as AudienceType)}
            >
              {Object.entries(AUDIENCES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <Button 
            variant="brand" 
            className="w-full" 
            onClick={send} 
            disabled={!title.trim() || !body.trim()}
          >
            <Send className="mr-2 size-4" /> Envoyer la notification
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Historique</h2>
        {notifications.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Aucune notification envoyée.
          </p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2 font-semibold">
                    <Bell className="size-4 text-primary" /> {n.title}
                  </p>
                  <Badge variant="secondary">
                    {AUDIENCES[n.audience as AudienceType] || n.audience}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(n.sentAt).toLocaleString("fr-CA")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
