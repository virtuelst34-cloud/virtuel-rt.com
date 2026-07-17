-- Fonction RPC pour mettre à jour les réactions d'un message
CREATE OR REPLACE FUNCTION update_message_reaction(message_id UUID, new_reactions JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET reactions = new_reactions
  WHERE id = message_id;
END;
$$;

-- Granter l'exécution aux utilisateurs authentifiés et invités
GRANT EXECUTE ON FUNCTION update_message_reaction(UUID, JSONB) TO authenticated, anon;
