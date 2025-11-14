-- Add attachments table for all ticket types
CREATE TABLE IF NOT EXISTS sigurd.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type text NOT NULL CHECK (ticket_type IN ('incident', 'service_request', 'problem', 'change')),
  ticket_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid REFERENCES muninn.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_attachments_ticket ON sigurd.attachments(ticket_type, ticket_id);
CREATE INDEX idx_attachments_uploaded_by ON sigurd.attachments(uploaded_by);

-- Add mentions JSONB column to ticket_comments table
ALTER TABLE sigurd.ticket_comments 
ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ticket_comments_mentions ON sigurd.ticket_comments USING gin(mentions);

-- Add form_schema and category columns to service_catalog_items
ALTER TABLE sigurd.service_catalog_items 
ADD COLUMN IF NOT EXISTS form_schema jsonb,
ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON sigurd.service_catalog_items(category);

