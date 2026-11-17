-- Kitobxon — Ma'lumotlar bazasi to'liq tuzilishi (Schema)

CREATE TABLE IF NOT EXISTS kitobxon_users (
  id uuid PRIMARY KEY,
  username varchar(24) NOT NULL,
  email varchar(320) NOT NULL,
  password_hash text NOT NULL,
  gender varchar(20) NOT NULL DEFAULT 'undisclosed'
    CHECK (gender IN ('female', 'male', 'undisclosed')),
  role varchar(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin')),
  is_blocked boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kitobxon_users_username_lower_unique
  ON kitobxon_users (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS kitobxon_users_email_lower_unique
  ON kitobxon_users (lower(email));

CREATE TABLE IF NOT EXISTS kitobxon_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT kitobxon_sessions_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS kitobxon_sessions_expire_idx ON kitobxon_sessions (expire);
CREATE INDEX IF NOT EXISTS kitobxon_sessions_user_id_idx ON kitobxon_sessions ((sess->>'userId'));

CREATE TABLE IF NOT EXISTS library_books (
  id varchar(100) PRIMARY KEY,
  title varchar(200) NOT NULL,
  author varchar(200) NOT NULL,
  published_year smallint NOT NULL CHECK (published_year BETWEEN 1000 AND 2200),
  genre varchar(100) NOT NULL,
  description varchar(3000) NOT NULL DEFAULT '',
  language varchar(60) NOT NULL DEFAULT 'O‘zbekcha',
  page_count integer NOT NULL CHECK (page_count > 0),
  storage_key text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES kitobxon_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_books_created_at_idx ON library_books (created_at DESC);

CREATE TABLE IF NOT EXISTS user_book_state (
  user_id uuid NOT NULL REFERENCES kitobxon_users(id) ON DELETE CASCADE,
  book_id varchar(100) NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  favorite boolean NOT NULL DEFAULT false,
  in_reading_list boolean NOT NULL DEFAULT false,
  reading_status varchar(20) NOT NULL DEFAULT 'not_started'
    CHECK (reading_status IN ('not_started', 'reading', 'completed')),
  current_chapter integer NOT NULL DEFAULT 0 CHECK (current_chapter >= 0),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  bookmarked_chapter integer CHECK (bookmarked_chapter >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS book_reviews (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES kitobxon_users(id) ON DELETE CASCADE,
  book_id varchar(100) NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS book_reviews_book_created_idx
  ON book_reviews (book_id, created_at DESC);

CREATE TABLE IF NOT EXISTS book_pages (
  book_id varchar(100) NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0),
  content_text text NOT NULL,
  PRIMARY KEY (book_id, page_number)
);

CREATE TABLE IF NOT EXISTS book_reading_events (
  user_id uuid NOT NULL REFERENCES kitobxon_users(id) ON DELETE CASCADE,
  book_id varchar(100) NOT NULL,
  genre varchar(100) NOT NULL,
  page_number integer NOT NULL CHECK (page_number > 0),
  read_on date NOT NULL DEFAULT CURRENT_DATE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id, page_number, read_on)
);

CREATE INDEX IF NOT EXISTS book_reading_events_monthly_idx
  ON book_reading_events (read_on, book_id);

-- Admin faoliyat jurnali
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id serial PRIMARY KEY,
  admin_id uuid NOT NULL,
  admin_username varchar(24) NOT NULL,
  action varchar(60) NOT NULL,
  target_type varchar(30) NOT NULL,
  target_id varchar(100) NOT NULL,
  details varchar(500) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Qo'llab-quvvatlash: foydalanuvchi murojaat (shikoyat/taklif)lari
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES kitobxon_users(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('complaint', 'suggestion')),
  subject varchar(200) NOT NULL,
  message varchar(3000) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, created_at DESC);

-- Qo'llab-quvvatlash: admin javoblari
CREATE TABLE IF NOT EXISTS support_replies (
  id uuid PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES kitobxon_users(id),
  message varchar(3000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_replies_ticket_idx ON support_replies (ticket_id, created_at);

-- Ko'p beriladigan savollar (FAQ)
CREATE TABLE IF NOT EXISTS faq_items (
  id serial PRIMARY KEY,
  question varchar(500) NOT NULL,
  answer varchar(3000) NOT NULL,
  category varchar(100) NOT NULL DEFAULT 'Umumiy',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reklama va homiylik bannerlari
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

-- Sayt sozlamalari (AdSense va boshqalar)
CREATE TABLE IF NOT EXISTS site_settings (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Adabiy blog va maqolalar
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
