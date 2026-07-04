import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, RefreshCw, Clock, Trash2, Edit, Smile, Pin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from './AdminComponents';
import { isFounder } from '@/lib/utils/founderCheck';
import { useUser } from '@/lib/contexts';

interface MessageSettings {
  max_message_length: number;
  min_message_length: number;
  message_cooldown_ms: number;
  enable_message_editing: boolean;
  edit_time_limit_minutes: number;
  enable_message_reactions: boolean;
  enable_message_pinning: boolean;
  max_pinned_messages: number;
  auto_delete_messages_days: number;
  enable_message_deletion: boolean;
  enable_image_upload: boolean;
  max_image_size_mb: number;
  enable_link_preview: boolean;
  enable_code_blocks: boolean;
}

const DEFAULT_SETTINGS: MessageSettings = {
  max_message_length: 1000,
  min_message_length: 1,
  message_cooldown_ms: 1000,
  enable_message_editing: true,
  edit_time_limit_minutes: 15,
  enable_message_reactions: true,
  enable_message_pinning: true,
  max_pinned_messages: 5,
  auto_delete_messages_days: 0,
  enable_message_deletion: true,
  enable_image_upload: true,
  max_image_size_mb: 5,
  enable_link_preview: true,
  enable_code_blocks: true,
};

interface Props { readOnly?: boolean; }

export default function MessageSettingsSection({ readOnly = false }: Props) {
  const { user } = useUser();
  const [settings, setSettings] = useState<MessageSettings>(DEFAULT_SETTINGS);
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
        .from('message_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Aucun paramètre de message trouvé, utilisation des valeurs par défaut');
        } else {
          console.error('Erreur lors du chargement des paramètres de message:', error);
        }
      } else if (data) {
        setSettings(data as MessageSettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de message:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('message_settings')
        .upsert(settings);

      if (error) throw error;

      setHasChanges(false);
      alert('Paramètres de message sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres de message');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof MessageSettings>(key: K, value: MessageSettings[K]) => {
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
          <h3 className="text-lg font-semibold text-foreground">Gestion des messages</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les limites et fonctionnalités des messages
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
          <MessageSquare className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Modifications non sauvegardées
          </span>
        </div>
      )}

      {/* Limites de messages */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Limites et cooldown
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Longueur max (caractères)</label>
            <input
              type="number"
              value={settings.max_message_length}
              onChange={(e) => updateSetting('max_message_length', parseInt(e.target.value) || 1000)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Longueur min (caractères)</label>
            <input
              type="number"
              value={settings.min_message_length}
              onChange={(e) => updateSetting('min_message_length', parseInt(e.target.value) || 1)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cooldown entre messages (ms)</label>
            <input
              type="number"
              value={settings.message_cooldown_ms}
              onChange={(e) => updateSetting('message_cooldown_ms', parseInt(e.target.value) || 1000)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Auto-suppression (jours, 0 = jamais)</label>
            <input
              type="number"
              value={settings.auto_delete_messages_days}
              onChange={(e) => updateSetting('auto_delete_messages_days', parseInt(e.target.value) || 0)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Fonctionnalités d'édition */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Édition et suppression
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_message_editing}
            onToggle={() => updateSetting('enable_message_editing', !settings.enable_message_editing)}
            label="Autoriser l'édition des messages"
          />
          {settings.enable_message_editing && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Délai d'édition (minutes)</label>
              <input
                type="number"
                value={settings.edit_time_limit_minutes}
                onChange={(e) => updateSetting('edit_time_limit_minutes', parseInt(e.target.value) || 15)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
          <Toggle
            enabled={settings.enable_message_deletion}
            onToggle={() => updateSetting('enable_message_deletion', !settings.enable_message_deletion)}
            label="Autoriser la suppression des messages"
          />
        </div>
      </div>

      {/* Réactions et épinglage */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Smile className="w-4 h-4" />
          Réactions et épinglage
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_message_reactions}
            onToggle={() => updateSetting('enable_message_reactions', !settings.enable_message_reactions)}
            label="Autoriser les réactions"
          />
          <Toggle
            enabled={settings.enable_message_pinning}
            onToggle={() => updateSetting('enable_message_pinning', !settings.enable_message_pinning)}
            label="Autoriser l'épinglage"
          />
          {settings.enable_message_pinning && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max messages épinglés par salon</label>
              <input
                type="number"
                value={settings.max_pinned_messages}
                onChange={(e) => updateSetting('max_pinned_messages', parseInt(e.target.value) || 5)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Contenu enrichi */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Pin className="w-4 h-4" />
          Contenu enrichi
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_image_upload}
            onToggle={() => updateSetting('enable_image_upload', !settings.enable_image_upload)}
            label="Autoriser les images"
          />
          {settings.enable_image_upload && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Taille max image (MB)</label>
              <input
                type="number"
                value={settings.max_image_size_mb}
                onChange={(e) => updateSetting('max_image_size_mb', parseInt(e.target.value) || 5)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
          <Toggle
            enabled={settings.enable_link_preview}
            onToggle={() => updateSetting('enable_link_preview', !settings.enable_link_preview)}
            label="Prévisualisation des liens"
          />
          <Toggle
            enabled={settings.enable_code_blocks}
            onToggle={() => updateSetting('enable_code_blocks', !settings.enable_code_blocks)}
            label="Blocs de code"
          />
        </div>
      </div>
    </div>
  );
}
