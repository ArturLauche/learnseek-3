-- Full-text search vector for published learning items.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(learning_objective, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS content_items_search_idx ON content_items USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS content_items_title_trgm ON content_items USING GIN (title gin_trgm_ops);
