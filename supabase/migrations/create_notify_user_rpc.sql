-- Permet d'envoyer une notification à un utilisateur par son pseudo (réactions, DMs, amis…)
CREATE OR REPLACE FUNCTION public.notify_user_by_name(
  p_target_name TEXT,
  p_type TEXT,
  p_message TEXT,
  p_group_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_notif_id UUID;
BEGIN
  IF p_target_name IS NULL OR trim(p_target_name) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE name = p_target_name
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, group_key, group_count)
  VALUES (v_user_id, p_type, p_message, p_group_key, 1)
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user_by_name(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
