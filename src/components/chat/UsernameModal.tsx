import React, { useState, FormEvent, useEffect } from 'react';
import { useUser, useGlobalSettings } from '@/lib/contexts';
import { supabaseAuthService } from '@/lib/supabaseAuth';
import Avatar from './Avatar';
import { AVATAR_IDS } from '@/lib/chatConfig';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, KeyRound, Scale, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AGE_GATE_LABEL, MENTIONS_LEGALES_HREF } from '@/lib/welcomeContent';
import { hasAgeAcknowledged, setAgeAcknowledged } from '@/lib/ageGate';

export default function UsernameModal() {
  const { login, loginWithSupabase } = useUser();
  const { settings } = useGlobalSettings();
  const [mode, setMode] = useState<'guest' | 'login' | 'register'>('guest');

  const [name, setName] = useState('');
  const [selectedAv, setSelectedAv] = useState('av1');
  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : '??';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [ageOk, setAgeOk] = useState(() => hasAgeAcknowledged());

  useEffect(() => {
    if (settings.maintenance_mode) return;
    if (mode === 'guest' && !settings.allow_guest_access) {
      setMode(settings.allow_registration ? 'register' : 'login');
    }
    if (mode === 'register' && !settings.allow_registration) {
      setMode(settings.allow_guest_access ? 'guest' : 'login');
    }
  }, [settings, mode]);

  const requireAge = (): boolean => {
    if (!ageOk) {
      setError('Vous devez confirmer avoir 18 ans ou plus pour continuer.');
      return false;
    }
    setAgeAcknowledged();
    return true;
  };

  const handleGuestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings.allow_guest_access) {
      setError("Les connexions invitées sont désactivées.");
      return;
    }
    if (!requireAge()) return;
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
    if (!requireAge()) return;
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setInfo('');

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

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Indique ton email pour recevoir le lien.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const result = await supabaseAuthService.resetPassword(email);
      if (result.success) {
        setInfo('Email envoyé ! Vérifie ta boîte pour changer ton mot de passe.');
        setShowReset(false);
      } else {
        setError(result.error || 'Impossible d\'envoyer l\'email');
      }
    } catch (err: any) {
      setError(err.message || 'Impossible d\'envoyer l\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings.allow_registration) {
      setError("Les inscriptions sont désactivées.");
      return;
    }
    if (!requireAge()) return;
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

  if (settings.maintenance_mode) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border/50 rounded-3xl p-8 w-full max-w-[400px] text-center shadow-xl">
          <h2 className="text-lg font-bold text-foreground mb-2">Maintenance</h2>
          <p className="text-sm text-muted-foreground">
            {settings.maintenance_message || 'Le site est en maintenance. Revenez plus tard.'}
          </p>
        </div>
      </div>
    );
  }

  const ageCheckbox = (
    <label className="flex items-start gap-2.5 text-[11px] sm:text-xs text-muted-foreground/85 leading-snug cursor-pointer select-none bg-amber-500/8 border border-amber-500/25 rounded-xl px-3 py-2.5">
      <input
        type="checkbox"
        checked={ageOk}
        onChange={(e) => {
          setAgeOk(e.target.checked);
          if (e.target.checked) setAgeAcknowledged();
          setError('');
        }}
        className="mt-0.5 w-4 h-4 shrink-0 accent-primary rounded border-border"
        required
      />
      <span>
        <span className="font-semibold text-amber-200/90">18+ · </span>
        {AGE_GATE_LABEL}
      </span>
    </label>
  );

  const canSubmit = ageOk && !loading;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-3 sm:p-4 overflow-y-auto safe-area-pad">
      <div className="bg-card border border-border/50 rounded-3xl p-5 sm:p-8 w-full max-w-[400px] max-h-[min(92dvh,720px)] overflow-y-auto flex flex-col gap-4 sm:gap-5 shadow-[0_32px_64px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 my-auto">
        <div className="text-center shrink-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 overflow-hidden bg-black/40 shadow-lg shadow-primary/25 ring-1 ring-primary/20">
            <img src="/logo.png" alt="Virtuel-RT" className="w-full h-full object-contain p-0.5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">Bienvenue sur Virtuel-RT</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Choisissez comment vous connecter</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
            <ShieldAlert className="w-3 h-3 shrink-0" /> Interdit aux mineurs · 18 ans
          </p>
        </div>

        <div className="flex gap-2 bg-secondary/50 rounded-xl p-1">
          {settings.allow_guest_access && (
            <button
              type="button"
              onClick={() => setMode('guest')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all touch-target ${
                mode === 'guest' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Invité
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all touch-target ${
              mode === 'login' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connexion
          </button>
          {settings.allow_registration && (
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all touch-target ${
                mode === 'register' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inscription
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {info && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-400 flex items-center gap-2 shrink-0">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            {info}
          </div>
        )}

        {mode === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="flex flex-col gap-3.5 min-h-0">
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 max-h-[28vh] sm:max-h-[200px] overflow-y-auto p-1 justify-items-center">
              {AVATAR_IDS.map(av => (
                <button key={av} type="button" onClick={() => setSelectedAv(av)}
                  className={`rounded-full transition-all duration-200 touch-target ${selectedAv === av ? 'ring-2 ring-primary/60 scale-110 shadow-lg shadow-primary/25' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}>
                  <Avatar avatarClass={av} initials={initials} size="md" />
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
            {ageCheckbox}
            <button type="submit" disabled={!name.trim() || name.trim().length < 3 || !canSubmit}
              className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] touch-target">
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
          <form onSubmit={showReset ? handleResetPassword : handleLogin} className="flex flex-col gap-3.5">
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
            {!showReset && (
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
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 touch-target"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            {showReset && (
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Tu recevras un lien par email pour définir un nouveau mot de passe.
              </p>
            )}
            {!showReset && ageCheckbox}
            <button type="submit" disabled={!email || (!showReset && !password) || (!showReset && !canSubmit) || loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] touch-target">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {showReset ? 'Envoi...' : 'Connexion...'}
                </div>
              ) : (
                showReset ? 'Envoyer le lien' : 'Se connecter'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowReset(v => !v); setError(''); setInfo(''); }}
              className="text-[11px] text-primary/90 hover:text-primary underline-offset-2 hover:underline self-center py-1"
            >
              {showReset ? 'Retour à la connexion' : 'Changer / oublier mon mot de passe'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
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
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 max-h-[22vh] sm:max-h-[160px] overflow-y-auto p-1 justify-items-center">
              {AVATAR_IDS.map(av => (
                <button key={av} type="button" onClick={() => setSelectedAv(av)}
                  className={`rounded-full transition-all duration-200 touch-target ${selectedAv === av ? 'ring-2 ring-primary/60 scale-110 shadow-lg shadow-primary/25' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}>
                  <Avatar avatarClass={av} initials={initials} size="md" />
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
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 touch-target"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {ageCheckbox}
            <button type="submit" disabled={!email || !password || !name || !canSubmit}
              className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] touch-target">
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

        <Link
          to={MENTIONS_LEGALES_HREF}
          className="inline-flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-purple-300 transition-colors self-center pb-1"
        >
          <Scale className="w-3 h-3" /> Mentions légales · 18+
        </Link>
      </div>
    </div>
  );
}
