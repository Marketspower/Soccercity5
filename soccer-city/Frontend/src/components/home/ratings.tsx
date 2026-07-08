"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Ratings() {
  const { ratings, addRating, loadRatings } = useAppStore();
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRatings();
  }, []);

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    
    setIsSubmitting(true);
    try {
      await addRating(selectedRating, comment);
      setSelectedRating(0);
      setComment("");
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0;

  return (
    <section className="container py-16">
      <h2 className="text-3xl font-bold text-center mb-8">
        Évaluation des <span className="text-primary">clients</span>
      </h2>

      <div className="max-w-2xl mx-auto">
        {/* Note moyenne */}
        <div className="text-center mb-8">
          <div className="text-5xl font-bold text-primary">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`size-6 ${star <= Math.round(averageRating) ? 'fill-primary text-primary' : 'text-gray-600'}`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {ratings.length} avis
          </p>
        </div>

        {/* Formulaire d'évaluation */}
        <div className="border rounded-lg p-6">
          <p className="font-semibold mb-4">Votre avis</p>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star)}
                className="p-2 hover:scale-110 transition-transform"
              >
                <Star
                  className={`size-8 ${star <= selectedRating ? 'fill-primary text-primary' : 'text-gray-600'}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Votre commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mb-4"
          />
          <Button
            onClick={handleSubmit}
            disabled={selectedRating === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer mon avis'}
          </Button>
        </div>

        {/* Liste des avis */}
        <div className="mt-8 space-y-4">
          {ratings.slice(0, 5).map((rating) => (
            <div key={rating.id} className="border-b pb-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4 ${star <= rating.rating ? 'fill-primary text-primary' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              {rating.comment && (
                <p className="text-sm text-muted-foreground mt-1">{rating.comment}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(rating.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}