-- Extension trigram pour recherche texte (ilike performant)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_messages_text_trgm ON public.messages USING gin (text gin_trgm_ops);
