-- Hero videos: admin-managed "NEW ARRIVALS" card in the homepage hero.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.hero_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url varchar(500) NOT NULL,
  thumbnail_url varchar(500) NOT NULL DEFAULT '',
  label varchar(80) NOT NULL DEFAULT 'NEW ARRIVALS',
  title varchar(160) NOT NULL,
  subtitle varchar(300) NOT NULL DEFAULT '',
  bottom_text varchar(120) NOT NULL DEFAULT '',
  duration_label varchar(20) NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hero_videos_order_idx ON public.hero_videos (display_order);
