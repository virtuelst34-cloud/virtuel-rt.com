import React, { useEffect, useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import {
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  type TwoFactorStatus,
} from '@/lib/twoFactorAuth';

interface Props {
  userId: string;
  email: string;
}

export default function TwoFactorSection({ userId, email }: Props) {
  const [status, setStatus] = useState<TwoFactorStatus>({ enabled: false, remainingBackupCodes: 0 });
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = () => {
    void getTwoFactorStatus(userId).then(setStatus);
  };

  useEffect(() => { refresh(); }, [userId]);

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    const setup = await setupTwoFactor(userId, email);
    setLoading(false);
    if (!setup) {
      setError('Impossible de démarrer la configuration 2FA');
      return;
    }
    setSetupSecret(setup.secret);
    setQrUrl(setup.qrCodeUrl);
    setBackupCodes(setup.backupCodes);
  };

  const handleEnable = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    const ok = await enableTwoFactor(userId, email, code);
    setLoading(false);
    if (!ok) {
      setError('Code invalide. Vérifiez votre application authenticator.');
      return;
    }
    setSetupSecret(null);
    setQrUrl(null);
    setCode('');
    refresh();
  };

  const handleDisable = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    const ok = await disableTwoFactor(userId, code, email);
    setLoading(false);
    if (!ok) {
      setError('Code invalide');
      return;
    }
    setCode('');
    refresh();
  };

  const copyCodes = () => {
    void navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {status.enabled ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        ) : (
          <Shield className="w-5 h-5 text-muted-foreground" />
        )}
        <div>
          <div className="text-sm font-semibold text-foreground">Authentification à deux facteurs (TOTP)</div>
          <div className="text-[11px] text-muted-foreground">
            {status.enabled
              ? `Activée — ${status.remainingBackupCodes} codes de secours restants`
              : 'Protégez votre compte avec Google Authenticator ou équivalent'}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {!status.enabled && !setupSecret && (
        <button
          type="button"
          onClick={handleStartSetup}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          Configurer le 2FA
        </button>
      )}

      {setupSecret && !status.enabled && (
        <div className="space-y-3 bg-secondary border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">
            Scannez ce lien dans votre app authenticator ou entrez le secret manuellement :
          </p>
          <code className="block text-[10px] break-all bg-background px-2 py-1 rounded">{setupSecret}</code>
          {qrUrl && (
            <a href={qrUrl} className="text-xs text-primary underline break-all">{qrUrl}</a>
          )}
          {backupCodes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-foreground">Codes de secours</span>
                <button type="button" onClick={copyCodes} className="text-[10px] text-primary flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copier
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {backupCodes.map(c => (
                  <code key={c} className="text-[10px] bg-background px-2 py-0.5 rounded">{c}</code>
                ))}
              </div>
            </div>
          )}
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading || code.length !== 6}
            className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
            Activer le 2FA
          </button>
        </div>
      )}

      {status.enabled && (
        <div className="space-y-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code pour désactiver"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleDisable}
            disabled={loading || code.length !== 6}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 disabled:opacity-50">
            <ShieldOff className="w-4 h-4" /> Désactiver le 2FA
          </button>
        </div>
      )}
    </div>
  );
}
