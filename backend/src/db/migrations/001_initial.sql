CREATE TABLE IF NOT EXISTS projects (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  tag VARCHAR(120) NOT NULL,
  category VARCHAR(30) NOT NULL,
  category_label_tr VARCHAR(60) NOT NULL,
  category_label_en VARCHAR(60) NOT NULL,
  description_tr VARCHAR(600) NOT NULL,
  description_en VARCHAR(600) NOT NULL,
  image_url VARCHAR(400) NOT NULL,
  image_alt VARCHAR(200) NOT NULL,
  link VARCHAR(400),
  layout VARCHAR(10) NOT NULL DEFAULT 'wide',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ,
  CONSTRAINT projects_category_check CHECK (category IN ('web', 'branding', 'social')),
  CONSTRAINT projects_layout_check CHECK (layout IN ('wide', 'tall'))
);

CREATE INDEX IF NOT EXISTS projects_category_idx ON projects (category);
CREATE INDEX IF NOT EXISTS projects_display_order_idx ON projects (display_order);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_tr VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  preview_image_url VARCHAR(400),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS services_display_order_idx ON services (display_order);

CREATE TABLE IF NOT EXISTS contact_requests (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL,
  company VARCHAR(80),
  service VARCHAR(30) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
