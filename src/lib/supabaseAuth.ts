import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  bio?: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  status_text?: string;
  level: number;
  xp: number;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  email_confirmed_at?: string;
  is_founder?: boolean;
  is_direction?: boolean;
  is_master_op?: boolean;
  is_admin?: boolean;
  is_iridescent?: boolean;
  special_badges?: string[];
  age?: number;
  city?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// Service d'authentification Supabase
export const supabaseAuthService = {
  // Inscription avec email et mot de passe
  async signUp(email: string, password: string, name: string, avatar: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Créer le profil utilisateur
        // Note: Si cela échoue avec une erreur RLS, vous devez configurer une politique RLS ou un trigger dans Supabase
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name,
            avatar,
            initials: name.slice(0, 2).toUpperCase(),
            status: 'online',
            level: 1,
            xp: 0,
            is_premium: false,
          });

        if (profileError) {
          console.error('Erreur RLS lors de la création du profil:', profileError);
          // Ne pas bloquer l'inscription si le profil échoue - le profil sera créé via trigger
          // L'utilisateur peut continuer, mais le profil sera manquant jusqu'à ce que le trigger soit configuré
        }

        return { success: true };
      }

      return { success: false, error: 'Échec de l\'inscription' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Connexion avec email et mot de passe
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Gestion des erreurs spécifiques
        if (error.message === 'Invalid login credentials') {
          return { success: false, error: 'Email ou mot de passe incorrect' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Email non confirmé. Vérifiez votre boîte mail.' };
        }
        throw error;
      }

      if (data.user) {
        // Récupérer le profil utilisateur
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erreur lors de la récupération du profil:', profileError);
          // Si le profil n'existe pas, le créer
          if (profileError.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                name: data.user.user_metadata?.name || email.split('@')[0],
                avatar: data.user.user_metadata?.avatar || 'av1',
                initials: (data.user.user_metadata?.name || email.split('@')[0]).slice(0, 2).toUpperCase(),
                status: 'online',
                level: 1,
                xp: 0,
                is_premium: false,
                email: data.user.email,
                email_confirmed_at: data.user.email_confirmed_at,
              });

            if (insertError) {
              console.error('Erreur lors de la création du profil:', insertError);
            } else {
              // Récupérer le profil créé
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

              if (newProfile) {
                return { success: true, user: newProfile as UserProfile };
              }
            }
          }
          throw profileError;
        }

        // Mettre à jour le statut en ligne
        await supabase
          .from('profiles')
          .update({ status: 'online' })
          .eq('id', data.user.id);

        return { success: true, user: profile as UserProfile };
      }

      return { success: false, error: 'Échec de la connexion' };
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, error: error.message || 'Erreur lors de la connexion' };
    }
  },

  // Connexion avec Google OAuth
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Déconnexion
  async signOut(userId: string): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  },

  // Récupérer l'utilisateur actuel
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      return profile as UserProfile;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  },

  // Mettre à jour le profil utilisateur
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      // Mapper les noms de propriétés camelCase vers snake_case pour Supabase
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.initials !== undefined) dbUpdates.initials = updates.initials;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.status_text !== undefined) dbUpdates.status_text = updates.status_text;
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
      if (updates.is_premium !== undefined) dbUpdates.is_premium = updates.is_premium;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
    }
  },

  // Renvoyer l'email de confirmation
  async resendConfirmationEmail(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Écouter les changements d'authentification
  onAuthStateChange(callback: (user: UserProfile | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getCurrentUser();
        callback(profile);
      } else {
        callback(null);
      }
    });
  },
};
