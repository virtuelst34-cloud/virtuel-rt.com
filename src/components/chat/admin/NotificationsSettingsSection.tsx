import React, { useState, useEffect } from 'react';
import { Bell, Save, RefreshCw, Mail, Smartphone, Volume2, VolumeX, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from './AdminComponents';
import { hasAdminAccess } from '@/lib/utils/founderCheck';

interface NotificationSettings {
  id?: string;
  enable_email_notifications: boolean;
  enable_push_notifications: boolean;
  enable_sound_notifications: boolean;
  enable_desktop_notifications: boolean;
  notification_sound: string;
  notification_duration: number;
  enable_mentions: boolean;
  enable_dm_notifications: boolean;
  enable_salon_notifications: boolean;
  enable_system_notifications: boolean;
  notification_cooldown: number;
  max_notifications_per_hour: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enable_email_notifications: false,
  enable_push_notifications: true,
  enable_sound_notifications: true,
  enable_desktop_notifications: true,
  notification_sound: 'default',
  notification_duration: 5000,
  enable_mentions: true,
  enable_dm_notifications: true,
  enable_salon_notifications: true,
  enable_system_notifications: true,
  notification_cooldown: 1000,
  max_notifications_per_hour: 50,
};

const SOUND_OPTIONS = [
  { id: 'default', label: 'Par défaut' },
  { id: 'chime', label: 'Carillon' },
  { id: 'pop', label: 'Pop' },
  { id: 'ding', label: 'Ding' },
  { id: 'none', label: 'Aucun' },
];

interface Props {
  readOnly?: boolean;
  user: any;
}

export default function NotificationsSettingsSection({ readOnly = false, user }: Props) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Vérifier si l'utilisateur est le fondateur
  const canModify = hasAdminAccess(user, readOnly);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Aucun paramètre de notification trouvé, utilisation des valeurs par défaut');
        } else {
          console.error('Erreur lors du chargement des paramètres de notification:', error);
        }
      } else if (data) {
        setSettings(data as NotificationSettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { id, ...payload } = settings;
      const { error } = id
        ? await supabase.from('notification_settings').update(payload).eq('id', id)
        : await supabase.from('notification_settings').insert(payload);

      if (error) throw error;

      if (!id) await loadSettings();

      setHasChanges(false);
      alert('Paramètres de notification sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres de notification');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
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
      {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
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
          <h3 className="text-lg font-semibold text-foreground">Paramètres de notification</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les notifications système globales
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
          <Bell className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Modifications non sauvegardées
          </span>
        </div>
      )}

      {/* Types de notifications */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Types de notifications
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_email_notifications}
            onToggle={() => updateSetting('enable_email_notifications', !settings.enable_email_notifications)}
            label="Notifications par email"
          />
          <Toggle
            enabled={settings.enable_push_notifications}
            onToggle={() => updateSetting('enable_push_notifications', !settings.enable_push_notifications)}
            label="Notifications push"
          />
          <Toggle
            enabled={settings.enable_sound_notifications}
            onToggle={() => updateSetting('enable_sound_notifications', !settings.enable_sound_notifications)}
            label="Notifications sonores"
          />
          <Toggle
            enabled={settings.enable_desktop_notifications}
            onToggle={() => updateSetting('enable_desktop_notifications', !settings.enable_desktop_notifications)}
            label="Notifications bureau"
          />
        </div>
      </div>

      {/* Son et durée */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Son et durée
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Son de notification</label>
            <select
              value={settings.notification_sound}
              onChange={(e) => updateSetting('notification_sound', e.target.value)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            >
              {SOUND_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Durée (ms)</label>
            <input
              type="number"
              value={settings.notification_duration}
              onChange={(e) => updateSetting('notification_duration', parseInt(e.target.value) || 5000)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Catégories de notifications */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Catégories de notifications
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_mentions}
            onToggle={() => updateSetting('enable_mentions', !settings.enable_mentions)}
            label="Notifications de mentions"
          />
          <Toggle
            enabled={settings.enable_dm_notifications}
            onToggle={() => updateSetting('enable_dm_notifications', !settings.enable_dm_notifications)}
            label="Notifications de messages privés"
          />
          <Toggle
            enabled={settings.enable_salon_notifications}
            onToggle={() => updateSetting('enable_salon_notifications', !settings.enable_salon_notifications)}
            label="Notifications de salon"
          />
          <Toggle
            enabled={settings.enable_system_notifications}
            onToggle={() => updateSetting('enable_system_notifications', !settings.enable_system_notifications)}
            label="Notifications système"
          />
        </div>
      </div>

      {/* Limites et cooldown */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Limites et cooldown
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cooldown (ms)</label>
            <input
              type="number"
              value={settings.notification_cooldown}
              onChange={(e) => updateSetting('notification_cooldown', parseInt(e.target.value) || 1000)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Temps minimum entre deux notifications
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max par heure</label>
            <input
              type="number"
              value={settings.max_notifications_per_hour}
              onChange={(e) => updateSetting('max_notifications_per_hour', parseInt(e.target.value) || 50)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Nombre maximum de notifications par heure par utilisateur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
