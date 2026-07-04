-- Table pour les messages privés
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  reactions JSONB DEFAULT '{}',
  image_url TEXT
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(sender_id, receiver_id);

-- Activer RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can read their own messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.direct_messages;

-- Politique : Les utilisateurs peuvent lire leurs propres messages (envoyés ou reçus)
CREATE POLICY "Users can read their own messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = sender_id OR auth.uid()::text = receiver_id
  );

-- Politique : Les utilisateurs peuvent envoyer des messages
CREATE POLICY "Users can send messages"
  ON public.direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = sender_id
  );

-- Politique : Les utilisateurs peuvent mettre à jour le statut de lecture des messages reçus
CREATE POLICY "Users can update read status"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = receiver_id
  )
  WITH CHECK (
    auth.uid()::text = receiver_id
  );

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_direct_messages_updated_at ON public.direct_messages;
DROP FUNCTION IF EXISTS update_direct_messages_updated_at();

CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.read_at = COALESCE(NEW.read_at, OLD.read_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_direct_messages_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_messages_updated_at();
