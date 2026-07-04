import React, { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, Lock, Ban, AlertTriangle, Fingerprint, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from './AdminComponents';
import { isFounder } from '@/lib/utils/founderCheck';
import { useUser } from '@/lib/contexts';

interface SecuritySettings {
  enable_2fa: boolean;
  require_2fa_for_admins: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  enable_ip_banning: boolean;
  auto_ban_threshold: number;
  auto_ban_duration_hours: number;
  enable_content_filtering: boolean;
  filter_profanity: boolean;
  filter_personal_info: boolean;
  enable_rate_limiting: boolean;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  enable_session_timeout: boolean;
  session_timeout_minutes: number;
  enable_captcha: boolean;
  captcha_threshold: number;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  enable_2fa: false,
  require_2fa_for_admins: true,
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
  enable_ip_banning: true,
  auto_ban_threshold: 10,
  auto_ban_duration_hours: 24,
  enable_content_filtering: true,
  filter_profanity: true,
  filter_personal_info: true,
  enable_rate_limiting: true,
  rate_limit_per_minute: 10,
  rate_limit_per_hour: 100,
  enable_session_timeout: true,
  session_timeout_minutes: 60,
  enable_captcha: false,
  captcha_threshold: 3,
};

interface Props { readOnly?: boolean; }

export default function SecuritySettingsSection({ readOnly = false }: Props) {
  const { user } = useUser();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const canModify = !readOnly && isFounder(user);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Aucun paramètre de sécurité trouvé, utilisation des valeurs par défaut');
        } else {
          console.error('Erreur lors du chargement des paramètres de sécurité:', error);
        }
      } else if (data) {
        setSettings(data as SecuritySettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de sécurité:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('security_settings')
        .upsert(settings);

      if (error) throw error;

      setHasChanges(false);
      alert('Paramètres de sécurité sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres de sécurité');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const Toggle = ({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) => (
    <button
      onClick={onToggle}
      disabled={!canModify}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        !canModify
          ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10'
          : enabled
            ? 'bg-green-500/15 border-green-500/30 text-green-400'
            : 'bg-red-500/15 border-red-500/30 text-red-400'
      }`}
    >
      {enabled ? <span className="text-xs">✓</span> : <span className="text-xs">✗</span>}
      <span className="text-xs">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sécurité</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les paramètres de sécurité du site
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSettings}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-white/[0.04] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
          <button
            onClick={saveSettings}
            disabled={!canModify || !hasChanges || saving}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Modifications non sauvegardées
          </span>
        </div>
      )}

      {/* Authentification */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Fingerprint className="w-4 h-4" />
          Authentification
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_2fa}
            onToggle={() => updateSetting('enable_2fa', !settings.enable_2fa)}
            label="Activer 2FA (double authentification)"
          />
          <Toggle
            enabled={settings.require_2fa_for_admins}
            onToggle={() => updateSetting('require_2fa_for_admins', !settings.require_2fa_for_admins)}
            label="Exiger 2FA pour les admins"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max tentatives login</label>
              <input
                type="number"
                value={settings.max_login_attempts}
                onChange={(e) => updateSetting('max_login_attempts', parseInt(e.target.value) || 5)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Durée verrouillage (min)</label>
              <input
                type="number"
                value={settings.lockout_duration_minutes}
                onChange={(e) => updateSetting('lockout_duration_minutes', parseInt(e.target.value) || 30)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bannissement IP */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Ban className="w-4 h-4" />
          Bannissement IP
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_ip_banning}
            onToggle={() => updateSetting('enable_ip_banning', !settings.enable_ip_banning)}
            label="Activer le bannissement IP"
          />
          {settings.enable_ip_banning && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Seuil auto-ban</label>
                <input
                  type="number"
                  value={settings.auto_ban_threshold}
                  onChange={(e) => updateSetting('auto_ban_threshold', parseInt(e.target.value) || 10)}
                  disabled={!canModify}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Durée auto-ban (heures)</label>
                <input
                  type="number"
                  value={settings.auto_ban_duration_hours}
                  onChange={(e) => updateSetting('auto_ban_duration_hours', parseInt(e.target.value) || 24)}
                  disabled={!canModify}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtrage de contenu */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Filtrage de contenu
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_content_filtering}
            onToggle={() => updateSetting('enable_content_filtering', !settings.enable_content_filtering)}
            label="Activer le filtrage de contenu"
          />
          <Toggle
            enabled={settings.filter_profanity}
            onToggle={() => updateSetting('filter_profanity', !settings.filter_profanity)}
            label="Filtrer les gros mots"
          />
          <Toggle
            enabled={settings.filter_personal_info}
            onToggle={() => updateSetting('filter_personal_info', !settings.filter_personal_info)}
            label="Filtrer les infos personnelles (email, téléphone)"
          />
        </div>
      </div>

      {/* Rate limiting */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Rate limiting
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_rate_limiting}
            onToggle={() => updateSetting('enable_rate_limiting', !settings.enable_rate_limiting)}
            label="Activer le rate limiting"
          />
          {settings.enable_rate_limiting && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Limite par minute</label>
                <input
                  type="number"
                  value={settings.rate_limit_per_minute}
                  onChange={(e) => updateSetting('rate_limit_per_minute', parseInt(e.target.value) || 10)}
                  disabled={!canModify}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Limite par heure</label>
                <input
                  type="number"
                  value={settings.rate_limit_per_hour}
                  onChange={(e) => updateSetting('rate_limit_per_hour', parseInt(e.target.value) || 100)}
                  disabled={!canModify}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Session
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_session_timeout}
            onToggle={() => updateSetting('enable_session_timeout', !settings.enable_session_timeout)}
            label="Activer le timeout de session"
          />
          {settings.enable_session_timeout && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Timeout session (minutes)</label>
              <input
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value) || 60)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
          <Toggle
            enabled={settings.enable_captcha}
            onToggle={() => updateSetting('enable_captcha', !settings.enable_captcha)}
            label="Activer CAPTCHA"
          />
          {settings.enable_captcha && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Seuil CAPTCHA (tentatives)</label>
              <input
                type="number"
                value={settings.captcha_threshold}
                onChange={(e) => updateSetting('captcha_threshold', parseInt(e.target.value) || 3)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
