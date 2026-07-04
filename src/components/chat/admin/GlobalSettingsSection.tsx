import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Globe, Palette, Bell, Shield, Database, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from './AdminComponents';
import { isFounder } from '@/lib/utils/founderCheck';
import { useUser } from '@/lib/contexts';

interface GlobalSettings {
  default_theme: string;
  default_party_mode: boolean;
  default_accent_color: string;
  default_compact_mode: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_guest_access: boolean;
  allow_registration: boolean;
  max_users: number;
  enable_notifications: boolean;
  enable_presence: boolean;
  enable_dm: boolean;
  enable_voice: boolean;
  auto_cleanup_days: number;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  default_theme: 'dark',
  default_party_mode: false,
  default_accent_color: 'purple',
  default_compact_mode: false,
  maintenance_mode: false,
  maintenance_message: 'Le site est en maintenance. Revenez plus tard.',
  allow_guest_access: true,
  allow_registration: true,
  max_users: 1000,
  enable_notifications: true,
  enable_presence: true,
  enable_dm: true,
  enable_voice: false,
  auto_cleanup_days: 30,
};

interface Props { readOnly?: boolean; }

export default function GlobalSettingsSection({ readOnly = false }: Props) {
  const { user } = useUser();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Vérifier si l'utilisateur est le fondateur
  const canModify = !readOnly && isFounder(user);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Table vide, utiliser les valeurs par défaut
          console.log('Aucun paramètre global trouvé, utilisation des valeurs par défaut');
        } else {
          console.error('Erreur lors du chargement des paramètres:', error);
        }
      } else if (data) {
        setSettings(data as GlobalSettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('global_settings')
        .upsert(settings);

      if (error) throw error;

      setHasChanges(false);
      alert('Paramètres globaux sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
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
      {enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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
          <h3 className="text-lg font-semibold text-foreground">Paramètres globaux</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les paramètres système par défaut
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
          <Settings className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Modifications non sauvegardées
          </span>
        </div>
      )}

      {/* Apparence par défaut */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Apparence par défaut
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Thème par défaut</label>
            <select
              value={settings.default_theme}
              onChange={(e) => updateSetting('default_theme', e.target.value)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            >
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Couleur d'accent par défaut</label>
            <select
              value={settings.default_accent_color}
              onChange={(e) => updateSetting('default_accent_color', e.target.value)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            >
              <option value="purple">Violet</option>
              <option value="blue">Bleu</option>
              <option value="emerald">Émeraude</option>
              <option value="rose">Rose</option>
              <option value="amber">Ambre</option>
              <option value="red">Rouge</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Toggle
            enabled={settings.default_party_mode}
            onToggle={() => updateSetting('default_party_mode', !settings.default_party_mode)}
            label="Mode Party par défaut"
          />
          <Toggle
            enabled={settings.default_compact_mode}
            onToggle={() => updateSetting('default_compact_mode', !settings.default_compact_mode)}
            label="Mode compact par défaut"
          />
        </div>
      </div>

      {/* Accès et inscription */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Accès et inscription
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.allow_guest_access}
            onToggle={() => updateSetting('allow_guest_access', !settings.allow_guest_access)}
            label="Autoriser les invités"
          />
          <Toggle
            enabled={settings.allow_registration}
            onToggle={() => updateSetting('allow_registration', !settings.allow_registration)}
            label="Autoriser les nouvelles inscriptions"
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nombre maximum d'utilisateurs</label>
            <input
              type="number"
              value={settings.max_users}
              onChange={(e) => updateSetting('max_users', parseInt(e.target.value) || 1000)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Fonctionnalités */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Fonctionnalités
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_notifications}
            onToggle={() => updateSetting('enable_notifications', !settings.enable_notifications)}
            label="Activer les notifications"
          />
          <Toggle
            enabled={settings.enable_presence}
            onToggle={() => updateSetting('enable_presence', !settings.enable_presence)}
            label="Activer la présence en temps réel"
          />
          <Toggle
            enabled={settings.enable_dm}
            onToggle={() => updateSetting('enable_dm', !settings.enable_dm)}
            label="Activer les messages privés"
          />
          <Toggle
            enabled={settings.enable_voice}
            onToggle={() => updateSetting('enable_voice', !settings.enable_voice)}
            label="Activer le voice chat"
          />
        </div>
      </div>

      {/* Maintenance */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Maintenance et nettoyage
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.maintenance_mode}
            onToggle={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
            label="Mode maintenance"
          />
          {settings.maintenance_mode && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Message de maintenance</label>
              <textarea
                value={settings.maintenance_message}
                onChange={(e) => updateSetting('maintenance_message', e.target.value)}
                disabled={!canModify}
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50 resize-none"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nettoyage automatique (jours)</label>
            <input
              type="number"
              value={settings.auto_cleanup_days}
              onChange={(e) => updateSetting('auto_cleanup_days', parseInt(e.target.value) || 30)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Les données plus anciennes que ce nombre de jours seront automatiquement supprimées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
