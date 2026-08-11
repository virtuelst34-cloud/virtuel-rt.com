-- Staff chat: pièces jointes + réactions emoji
ALTER TABLE public.staff_messages
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Autoriser body vide si une pièce jointe est fournie
ALTER TABLE public.staff_messages
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.staff_messages
  ALTER COLUMN body SET DEFAULT '';

UPDATE public.staff_messages
  SET body = COALESCE(body, '')
  WHERE body IS NULL;

ALTER TABLE public.staff_messages
  ALTER COLUMN body SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_messages_body_or_file'
  ) THEN
    ALTER TABLE public.staff_messages
      ADD CONSTRAINT staff_messages_body_or_file
      CHECK (
        length(trim(body)) > 0
        OR (file_url IS NOT NULL AND length(trim(file_url)) > 0)
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Staff can update staff messages" ON public.staff_messages;
CREATE POLICY "Staff can update staff messages"
  ON public.staff_messages FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Mise à jour atomique des réactions (évite les courses entre clients)
CREATE OR REPLACE FUNCTION public.update_staff_message_reaction(
  p_message_id UUID,
  p_emoji TEXT,
  p_user_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_reactions JSONB;
  users JSONB;
  user_list TEXT[];
  idx INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Accès staff requis';
  END IF;

  IF p_emoji IS NULL OR length(trim(p_emoji)) = 0 THEN
    RAISE EXCEPTION 'Emoji requis';
  END IF;

  IF p_user_name IS NULL OR length(trim(p_user_name)) = 0 THEN
    RAISE EXCEPTION 'Nom utilisateur requis';
  END IF;

  SELECT COALESCE(reactions, '{}'::jsonb)
  INTO current_reactions
  FROM public.staff_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message introuvable';
  END IF;

  users := COALESCE(current_reactions -> p_emoji, '[]'::jsonb);
  SELECT ARRAY(SELECT jsonb_array_elements_text(users)) INTO user_list;

  idx := array_position(user_list, p_user_name);
  IF idx IS NULL THEN
    user_list := array_append(user_list, p_user_name);
  ELSE
    user_list := array_remove(user_list, p_user_name);
  END IF;

  IF array_length(user_list, 1) IS NULL THEN
    current_reactions := current_reactions - p_emoji;
  ELSE
    current_reactions := jsonb_set(
      current_reactions,
      ARRAY[p_emoji],
      to_jsonb(user_list),
      true
    );
  END IF;

  UPDATE public.staff_messages
  SET reactions = current_reactions
  WHERE id = p_message_id;

  RETURN current_reactions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_message_reaction(UUID, TEXT, TEXT) TO authenticated;
