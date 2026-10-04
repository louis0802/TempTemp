-- Autonomous merchant evidence is intentionally separate from the legacy pipeline.
CREATE TABLE app.direct_source_health (
  source_id text PRIMARY KEY,
  label text NOT NULL,
  last_attempt timestamptz,
  last_success timestamptz,
  status text NOT NULL DEFAULT 'Never checked'
);
CREATE TABLE app.direct_source_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES app.direct_source_health(source_id),
  external_key text NOT NULL,
  canonical_url text NOT NULL CHECK (canonical_url LIKE 'https://%'),
  native_id text,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  current_revision_id uuid,
  UNIQUE(source_id, external_key),
  UNIQUE(source_id, canonical_url),
  UNIQUE(id, source_id)
);
CREATE TABLE app.direct_source_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES app.direct_source_items(id),
  revision_hash text NOT NULL CHECK (revision_hash ~ '^[a-f0-9]{64}$'),
  observed_at timestamptz NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, revision_hash),
  UNIQUE(id, item_id)
);
ALTER TABLE app.direct_source_items ADD CONSTRAINT direct_current_revision
  FOREIGN KEY(current_revision_id, id) REFERENCES app.direct_source_revisions(id, item_id);
CREATE TABLE app.direct_source_artifacts (
  source_id text NOT NULL REFERENCES app.direct_source_health(source_id),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  content_type text NOT NULL CHECK (content_type IN ('text/html', 'application/pdf')),
  body bytea NOT NULL,
  byte_length integer NOT NULL CHECK (byte_length BETWEEN 0 AND 3000000),
  first_fetched_at timestamptz NOT NULL,
  PRIMARY KEY(source_id, content_hash),
  CHECK (octet_length(body) = byte_length),
  CHECK (encode(digest(body, 'sha256'), 'hex') = content_hash)
);
CREATE TABLE app.direct_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_revision_id uuid NOT NULL REFERENCES app.direct_source_revisions(id),
  candidate_key text NOT NULL,
  processor_version text NOT NULL,
  data jsonb NOT NULL,
  issues jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('needs_review', 'auto_published', 'resolved', 'excluded', 'superseded')),
  promotion_id uuid REFERENCES app.promotions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_revision_id, candidate_key, processor_version)
);
CREATE INDEX direct_candidate_review ON app.direct_candidates(id) WHERE status = 'needs_review';
CREATE TABLE app.promotion_direct_sources (
  promotion_id uuid NOT NULL REFERENCES app.promotions(id),
  source_id text NOT NULL,
  source_item_id uuid PRIMARY KEY,
  source_revision_id uuid NOT NULL,
  attached_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(source_item_id, source_id) REFERENCES app.direct_source_items(id, source_id),
  FOREIGN KEY(source_revision_id, source_item_id) REFERENCES app.direct_source_revisions(id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.direct_source_health, app.direct_source_items,
  app.direct_source_revisions, app.direct_source_artifacts, app.direct_candidates,
  app.promotion_direct_sources TO promotion_admin, promotion_ingest;
