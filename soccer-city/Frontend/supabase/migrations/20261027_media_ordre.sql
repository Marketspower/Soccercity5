-- 20261027_media_ordre.sql
-- Ordre d'affichage des vidéos/médias (glisser-déposer dans l'admin)
-- et vitesse des bandes défilantes. Peut être exécuté plusieurs fois.

ALTER TABLE public.media   ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Ordre initial des médias existants : du plus récent au plus ancien (comme avant)
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.media
)
UPDATE public.media m SET sort_order = o.rn
FROM ordered o
WHERE m.id = o.id
  AND NOT EXISTS (SELECT 1 FROM public.media WHERE sort_order <> 0);

CREATE INDEX IF NOT EXISTS media_sort_order_idx   ON public.media (sort_order);
CREATE INDEX IF NOT EXISTS gallery_sort_order_idx ON public.gallery (sort_order);

-- Vitesse par défaut des bandes défilantes (modifiable dans Admin → Apparence)
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    INSERT INTO public.settings (key, value)
    VALUES ('media_bands', '{"speed":"normale"}'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
