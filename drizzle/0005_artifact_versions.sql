CREATE TABLE IF NOT EXISTS artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES generated_artifacts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  original_code text,
  compiled_hash text,
  compiled_object_key text,
  prompt_redacted text,
  model_id text,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS artifact_versions_uidx ON artifact_versions (artifact_id, version_number);
