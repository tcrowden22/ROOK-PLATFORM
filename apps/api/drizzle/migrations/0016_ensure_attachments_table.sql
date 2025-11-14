-- Ensure sigurd.attachments exists for unified attachment APIs
CREATE TABLE IF NOT EXISTS sigurd.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type text NOT NULL CHECK (ticket_type IN ('incident', 'service_request', 'problem', 'change')),
  ticket_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size numeric(20,0) NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES muninn.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON sigurd.attachments(ticket_type, ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON sigurd.attachments(uploaded_by);
