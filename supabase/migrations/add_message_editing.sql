-- Ajouter colonnes pour l'édition de messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
