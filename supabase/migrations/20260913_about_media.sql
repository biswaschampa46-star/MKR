-- About page media: admin-managed picture/video in the /about story section.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.about_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url varchar(500) NOT NULL,
  kind varchar(10) NOT NULL DEFAULT 'image',
  alt varchar(200) NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
