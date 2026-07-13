import React, { useState, FormEvent } from 'react';
import { useUser } from '@/lib/contexts';
import { supabaseAuthService } from '@/lib/supabaseAuth';
import Avatar from './Avatar';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

const AVATARS = ['av1', 'av2', 'av3', 'av4', 'av5', 'av6', 'av7', 'av8', 'av9', 'av10', 'av11', 'av12', 'av13', 'av14', 'av15', 'av16', 'av17', 'av18', 'av19', 'av20', 'av21', 'av22', 'av23', 'av24', 'av25', 'av26', 'av27', 'av28', 'av29', 'av30'];

export default function UsernameModal() {
  const { login, loginWithSupabase } = useUser();
  const [mode, setMode] = useState<'guest' | 'login' | 'register'>('guest');
  
  const [name, setName] = useState('');
  const [selectedAv, setSelectedAv] = useState('av1');
  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : '??';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) return;

    setLoading(true);
    setError('');

    const result = await login(name.trim(), selectedAv, name.trim().slice(0, 2).toUpperCase());
    if (!result.success) {
      setError(result.error || 'Impossible de se connecter en invité');
    }
    setLoading(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const result = await supabaseAuthService.signIn(email, password);
      if (result.success && result.user) {
        loginWithSupabase(result.user);
      } else {
        setError(result.error || 'Erreur lors de la connexion');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;

    setLoading(true);
    setError('');

    try {
      const result = await supabaseAuthService.signUp(email, password, name, selectedAv);
      if (result.success) {
        setError('Compte créé ! Vérifiez votre email pour confirmer.');
        setMode('login');
      } else {
        setError(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
      <div className="bg-card border border-border/50 rounded-3xl p-8 w-full max-w-[400px] flex flex-col gap-6 shadow-[0_32px_64px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg shadow-primary/25">
            <img src="/logo.png" alt="Virtuel-RT" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Bienvenue sur Virtuel-RT</h2>
          <p className="text-sm text-muted-foreground mt-1">Choisissez comment vous connecter</p>
        </div>

        <div className="flex gap-2 bg-secondary/50 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMode('guest')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === 'guest' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Invité
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === 'login' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === 'register' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inscription
          </button>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {mode === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap justify-center">
              {AVATARS.map(av => (
                <button key={av} type="button" onClick={() => setSelectedAv(av)}
                  className={`rounded-full transition-all duration-200 ${selectedAv === av ? 'ring-4 ring-primary/50 scale-110 shadow-lg shadow-primary/25' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}>
                  <Avatar avatarClass={av} initials={initials} size="lg" />
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre pseudo..."
                maxLength={20} autoFocus
                className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
              <div className="flex justify-between text-[10px] text-muted-foreground/40">
                <span>3-20 caractères</span>
                <span>{name.length}/20</span>
              </div>
            </div>
            <button type="submit" disabled={!name.trim() || name.trim().length < 3 || loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </div>
              ) : (
                'Entrer en mode invité'
              )}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-xl px-4 py-3">
                <Lock className="w-4 h-4 text-muted-foreground/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={!email || !password || loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-xl px-4 py-3">
                <User className="w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Pseudo"
                  maxLength={20}
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {AVATARS.map(av => (
                <button key={av} type="button" onClick={() => setSelectedAv(av)}
                  className={`rounded-full transition-all duration-200 ${selectedAv === av ? 'ring-4 ring-primary/50 scale-110 shadow-lg shadow-primary/25' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}>
                  <Avatar avatarClass={av} initials={initials} size="lg" />
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-xl px-4 py-3">
                <Lock className="w-4 h-4 text-muted-foreground/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={!email || !password || !name || loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Inscription...
                </div>
              ) : (
                "S'inscrire"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
