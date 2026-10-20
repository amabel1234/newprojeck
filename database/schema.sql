CREATE TABLE IF NOT EXISTS nixx_products (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  category text NOT NULL CHECK (
    category IN (
      'get-key',
      'vip-key',
      'license',
      'roblox-map-template',
      'ready-map',
      'ready-system',
      'script'
    )
  ),
  price text NOT NULL CHECK (char_length(price) BETWEEN 1 AND 60),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 1000),
  image_url text,
  order_url text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'),
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nixx_products_public_order_idx
  ON nixx_products (active, featured DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS nixx_products_category_idx
  ON nixx_products (category, active);
