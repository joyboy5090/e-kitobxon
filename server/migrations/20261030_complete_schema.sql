-- Kitobxon — Xavfsiz qayta ishga tushuvchi migratsiya (Mavjud bazalar uchun)

-- 1. Foydalanuvchilar jadvaliga yangi ustunlar
ALTER TABLE kitobxon_users ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE kitobxon_users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 2. Foreign Key bog'lanishlarini xavfsiz qo'shish (agar avval mavjud bo'lmasa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_book_state_book'
  ) THEN
    ALTER TABLE user_book_state
      ADD CONSTRAINT fk_user_book_state_book
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_book_reviews_book'
  ) THEN
    ALTER TABLE book_reviews
      ADD CONSTRAINT fk_book_reviews_book
      FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Reklama bannerlari
CREATE TABLE IF NOT EXISTS ad_banners (
  id uuid PRIMARY KEY,
  title varchar(200) NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL,
  placement varchar(50) NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  views_count integer NOT NULL DEFAULT 0,
  clicks_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Sayt sozlamalari
CREATE TABLE IF NOT EXISTS site_settings (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Blog va maqolalar
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY,
  slug varchar(220) UNIQUE NOT NULL,
  title varchar(300) NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  cover_image text DEFAULT '',
  category varchar(100) NOT NULL DEFAULT 'Adabiyot',
  author_name varchar(150) NOT NULL DEFAULT 'Kitobxon tahririyati',
  reading_time integer NOT NULL DEFAULT 4,
  views_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, created_at DESC);

-- 5. Sessiyalarni tezkor qidirish va tozalash indeksi
CREATE INDEX IF NOT EXISTS kitobxon_sessions_user_id_idx ON kitobxon_sessions ((sess->>'userId'));
