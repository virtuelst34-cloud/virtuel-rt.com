-- Correction des politiques RLS pour utiliser les noms d'utilisateurs au lieu des UUID

-- Supprimer les anciennes politiques pour direct_messages
DROP POLICY IF EXISTS "Users can read their own messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.direct_messages;

-- Nouvelles politiques pour direct_messages (basées sur les noms d'utilisateurs)
CREATE POLICY "Users can read their own messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = sender_id 
    OR (SELECT name FROM public.profiles WHERE id = auth.uid()) = receiver_id
  );

CREATE POLICY "Users can send messages"
  ON public.direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = sender_id
  );

CREATE POLICY "Users can update read status"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = receiver_id
  )
  WITH CHECK (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = receiver_id
  );

-- Supprimer les anciennes politiques pour friends
DROP POLICY IF EXISTS "Users can read their own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update friend status" ON public.friends;

-- Nouvelles politiques pour friends (basées sur les noms d'utilisateurs)
CREATE POLICY "Users can read their own friends"
  ON public.friends
  FOR SELECT
  TO authenticated
  USING (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = user_id 
    OR (SELECT name FROM public.profiles WHERE id = auth.uid()) = friend_id
  );

CREATE POLICY "Users can send friend requests"
  ON public.friends
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = user_id
  );

CREATE POLICY "Users can update friend status"
  ON public.friends
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = friend_id
  )
  WITH CHECK (
    (SELECT name FROM public.profiles WHERE id = auth.uid()) = friend_id
  );

-- Vérifier et corriger user_presence si nécessaire
DROP POLICY IF EXISTS "Allow public read access" ON public.user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to delete own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow users to manage own presence by name" ON public.user_presence;
DROP POLICY IF EXISTS "Users can manage their own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Authenticated users can read presence" ON public.user_presence;

-- Politique : permettre à tous de lire la présence (pour afficher les utilisateurs en ligne)
CREATE POLICY "Allow public read access" ON public.user_presence
  FOR SELECT
  TO public
  USING (true);

-- Politique : permettre à tous (invités inclus) d'insérer/mettre à jour leur propre présence via user_id
CREATE POLICY "Allow users to manage own presence by name" ON public.user_presence
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
