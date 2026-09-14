ALTER TABLE document_tracks 
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS doc_type text,
ADD COLUMN IF NOT EXISTS contract_name text,
ADD COLUMN IF NOT EXISTS due_date text,
ADD COLUMN IF NOT EXISTS remind_days integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS updated_by text,
ADD COLUMN IF NOT EXISTS updated_at text;