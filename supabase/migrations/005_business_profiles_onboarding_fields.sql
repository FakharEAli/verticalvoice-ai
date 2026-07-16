ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT,
  ADD COLUMN IF NOT EXISTS secondary_language TEXT,
  ADD COLUMN IF NOT EXISTS number_of_locations INTEGER,
  ADD COLUMN IF NOT EXISTS business_size TEXT;
