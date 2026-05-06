-- Add UNIQUE constraint on organizations.name.
--
-- Required by the race-safe upsert in src/routes/emergency-admin.ts
-- (`.upsert(..., { onConflict: 'name' })`). Without this constraint, concurrent
-- bootstrap requests for the same organizationName can produce duplicate rows.
--
-- Idempotent: skipped if the constraint already exists. Will fail if existing
-- rows already contain duplicate names — resolve manually before running.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_name_unique'
      AND conrelid = 'organizations'::regclass
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_name_unique UNIQUE (name);
  END IF;
END$$;
