-- Autoriser les invités (anon) à mettre à jour les réactions via RPC
GRANT EXECUTE ON FUNCTION update_message_reaction(UUID, JSONB) TO anon;
