import { useState } from 'react';
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { supabaseAuthService } from '../../lib/supabaseAuth';

interface SupabaseLoginProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export function SupabaseLogin({ onSuccess, onCancel }: SupabaseLoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('av1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await supabaseAuthService.signIn(email, password);
        if (result.success && result.user) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess(result.user);
          }, 1000);
        } else {
          setError(result.error || 'Échec de la connexion');
        }
      } else {
        // Sign up
        if (!name.trim()) {
          setError('Le nom est requis');
          setLoading(false);
          return;
        }

        const result = await supabaseAuthService.signUp(email, password, name, avatar);
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess({ name, avatar, initials: name.slice(0, 2).toUpperCase() });
          }, 1000);
        } else {
          setError(result.error || 'Échec de l\'inscription');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await supabaseAuthService.signInWithGoogle();
      if (result.success) {
        setSuccess(true);
        // Google OAuth will redirect, so we don't need to call onSuccess here
      } else {
        setError(result.error || 'Échec de la connexion Google');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-2xl p-6 w-[360px] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-foreground">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-foreground font-medium">
              {isLogin ? 'Connexion réussie !' : 'Inscription réussie !'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Votre nom"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Avatar
                </label>
                <div className="flex gap-2">
                  {['av1', 'av2', 'av3', 'av4', 'av5', 'av6'].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        avatar === av ? 'ring-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className={`w-full h-full rounded-full bg-gradient-to-br ${
                        av === 'av1' ? 'from-purple-500 to-pink-500' :
                        av === 'av2' ? 'from-blue-500 to-cyan-500' :
                        av === 'av3' ? 'from-green-500 to-emerald-500' :
                        av === 'av4' ? 'from-orange-500 to-red-500' :
                        av === 'av5' ? 'from-indigo-500 to-purple-500' :
                        'from-pink-500 to-rose-500'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                isLogin ? 'Se connecter' : "S'inscrire"
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-gray-900 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
