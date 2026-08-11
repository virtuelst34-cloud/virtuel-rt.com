import fs from 'fs';

const userPath = 'src/lib/contexts/UserContext.tsx';
let user = fs.readFileSync(userPath, 'utf8');

user = user.replace(
  `          const mappedUser = mapSupabaseProfile(currentUser);
          setUser(mappedUser);`,
  `          const mappedUser = mapSupabaseProfile({
            ...currentUser,
            status: currentUser.status === 'offline' ? 'online' : currentUser.status,
          });
          setUser(mappedUser);`,
);

user = user.replace(
  `        const mappedUser = mapSupabaseProfile(profile);
        setUser(mappedUser);`,
  `        const mappedUser = mapSupabaseProfile({
          ...profile,
          status: profile.status === 'offline' ? 'online' : profile.status,
        });
        setUser(mappedUser);`,
);

const oldUpdate = `  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setProfiles(p => ({ ...p, [prev.name]: updated }));

      if (!supabaseUser) {
        saveGuestSession(updated);
      }

      const presenceUserId = supabaseUser?.id || updated.name;
      void presenceService.updateStatus(presenceUserId, (updated.status || 'online') as UserProfile['status'], {
        name: updated.name,
        avatar: updated.avatar,
        initials: updated.initials,
      });

      if (supabaseUser) {
        supabaseAuthService.updateProfile(supabaseUser.id, {
          name: updated.name,
          avatar: updated.avatar,
          initials: updated.initials,
          bio: updated.bio,
          status: updated.status,
          status_text: updated.statusText,
          level: updated.level,
          xp: updated.xp,
          is_premium: updated.isPremium,
          age: updated.age,
          city: updated.city,
          gender: updated.gender,
        }).catch(err => console.error('Erreur lors de la mise à jour du profil:', err));
      }

      return updated;
    });
  }, [supabaseUser, saveGuestSession]);`;

const newUpdate = `  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const updated = { ...user, ...updates };
    setUser(updated);
    setProfiles(p => ({ ...p, [updated.name]: updated }));

    if (!supabaseUser) {
      saveGuestSession(updated);
      saveGuestProfileCache(updated as unknown as Record<string, unknown>);
    }

    const presenceUserId = supabaseUser?.id || updated.name;
    void presenceService.updateStatus(presenceUserId, (updated.status || 'online') as UserProfile['status'], {
      name: updated.name,
      avatar: updated.avatar,
      initials: updated.initials,
    });

    if (supabaseUser) {
      try {
        await supabaseAuthService.updateProfile(supabaseUser.id, {
          name: updated.name,
          avatar: updated.avatar,
          initials: updated.initials,
          bio: updated.bio,
          status: updated.status,
          status_text: updated.statusText,
          level: updated.level,
          xp: updated.xp,
          is_premium: updated.isPremium,
          age: updated.age,
          city: updated.city,
          gender: updated.gender,
        });
      } catch (err) {
        console.error('Erreur lors de la mise à jour du profil:', err);
      }
    }
  }, [user, supabaseUser, saveGuestSession]);`;

if (user.includes(oldUpdate)) {
  user = user.replace(oldUpdate, newUpdate);
}

fs.writeFileSync(userPath, user);
console.log('UserContext patched');
