CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    receiver_id TEXT,
    project_code TEXT,
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Full Access Direct Messages" ON public.direct_messages FOR ALL USING (true) WITH CHECK (true);