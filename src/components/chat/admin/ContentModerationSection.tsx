import React, { useState, useEffect } from 'react';
import { ShieldAlert, Save, RefreshCw, AlertTriangle, Bot, FileText, Trash2, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from './AdminComponents';
import { isFounder } from '@/lib/utils/founderCheck';
import { useUser } from '@/lib/contexts';

interface ContentModerationSettings {
  enable_auto_moderation: boolean;
  auto_moderation_threshold: number;
  enable_spam_detection: boolean;
  spam_threshold: number;
  enable_link_filtering: boolean;
  blocked_domains: string[];
  banned_words: string[];
  enable_ai_moderation: boolean;
  ai_moderation_model: string;
  enable_report_review: boolean;
  auto_ban_on_violation: boolean;
  violation_threshold: number;
  enable_content_queue: boolean;
  require_approval_for_new_users: boolean;
  approval_post_count: number;
}

const DEFAULT_SETTINGS: ContentModerationSettings = {
  enable_auto_moderation: true,
  auto_moderation_threshold: 0.7,
  enable_spam_detection: true,
  spam_threshold: 0.8,
  enable_link_filtering: true,
  blocked_domains: [],
  banned_words: [],
  enable_ai_moderation: false,
  ai_moderation_model: 'gpt-4',
  enable_report_review: true,
  auto_ban_on_violation: false,
  violation_threshold: 5,
  enable_content_queue: false,
  require_approval_for_new_users: false,
  approval_post_count: 3,
};

interface Props { readOnly?: boolean; }

export default function ContentModerationSection({ readOnly = false }: Props) {
  const { user } = useUser();
  const [settings, setSettings] = useState<ContentModerationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const canModify = !readOnly && isFounder(user);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_moderation_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Aucun paramètre de modération trouvé, utilisation des valeurs par défaut');
        } else {
          console.error('Erreur lors du chargement des paramètres de modération:', error);
        }
      } else if (data) {
        setSettings(data as ContentModerationSettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de modération:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('content_moderation_settings')
        .upsert(settings);

      if (error) throw error;

      setHasChanges(false);
      alert('Paramètres de modération sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres de modération');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ContentModerationSettings>(key: K, value: ContentModerationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addBannedWord = () => {
    if (newWord.trim() && !settings.banned_words.includes(newWord.trim())) {
      updateSetting('banned_words', [...settings.banned_words, newWord.trim()]);
      setNewWord('');
    }
  };

  const removeBannedWord = (word: string) => {
    updateSetting('banned_words', settings.banned_words.filter(w => w !== word));
  };

  const addBlockedDomain = () => {
    if (newDomain.trim() && !settings.blocked_domains.includes(newDomain.trim())) {
      updateSetting('blocked_domains', [...settings.blocked_domains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const removeBlockedDomain = (domain: string) => {
    updateSetting('blocked_domains', settings.blocked_domains.filter(d => d !== domain));
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
          <h3 className="text-lg font-semibold text-foreground">Modération automatique</h3>
          <p className="text-sm text-muted-foreground">
            Configurez la modération automatique du contenu
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
          <ShieldAlert className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Modifications non sauvegardées
          </span>
        </div>
      )}

      {/* Modération automatique */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Modération automatique
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_auto_moderation}
            onToggle={() => updateSetting('enable_auto_moderation', !settings.enable_auto_moderation)}
            label="Activer la modération automatique"
          />
          {settings.enable_auto_moderation && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Seuil de modération (0-1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={settings.auto_moderation_threshold}
                onChange={(e) => updateSetting('auto_moderation_threshold', parseFloat(e.target.value) || 0.7)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
          <Toggle
            enabled={settings.enable_spam_detection}
            onToggle={() => updateSetting('enable_spam_detection', !settings.enable_spam_detection)}
            label="Détection de spam"
          />
          {settings.enable_spam_detection && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Seuil de spam (0-1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={settings.spam_threshold}
                onChange={(e) => updateSetting('spam_threshold', parseFloat(e.target.value) || 0.8)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mots interdits */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Mots interdits
        </h4>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Ajouter un mot interdit..."
              disabled={!canModify}
              className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
            <button
              onClick={addBannedWord}
              disabled={!canModify}
              className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.banned_words.map((word) => (
              <div key={word} className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1">
                <span className="text-xs text-foreground">{word}</span>
                <button
                  onClick={() => removeBannedWord(word)}
                  disabled={!canModify}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Domaines bloqués */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Domaines bloqués
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_link_filtering}
            onToggle={() => updateSetting('enable_link_filtering', !settings.enable_link_filtering)}
            label="Activer le filtrage de liens"
          />
          {settings.enable_link_filtering && (
            <>
              <div className="flex gap-2">
                <input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="Ajouter un domaine (ex: spam.com)..."
                  disabled={!canModify}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
                />
                <button
                  onClick={addBlockedDomain}
                  disabled={!canModify}
                  className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.blocked_domains.map((domain) => (
                  <div key={domain} className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1">
                    <span className="text-xs text-foreground">{domain}</span>
                    <button
                      onClick={() => removeBlockedDomain(domain)}
                      disabled={!canModify}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* IA et sanctions */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          IA et sanctions automatiques
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_ai_moderation}
            onToggle={() => updateSetting('enable_ai_moderation', !settings.enable_ai_moderation)}
            label="Modération par IA"
          />
          {settings.enable_ai_moderation && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Modèle IA</label>
              <select
                value={settings.ai_moderation_model}
                onChange={(e) => updateSetting('ai_moderation_model', e.target.value)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude 3</option>
              </select>
            </div>
          )}
          <Toggle
            enabled={settings.auto_ban_on_violation}
            onToggle={() => updateSetting('auto_ban_on_violation', !settings.auto_ban_on_violation)}
            label="Bannissement automatique sur violation"
          />
          {settings.auto_ban_on_violation && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Seuil de violations</label>
              <input
                type="number"
                value={settings.violation_threshold}
                onChange={(e) => updateSetting('violation_threshold', parseInt(e.target.value) || 5)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Approbation */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Approbation et file d'attente
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_content_queue}
            onToggle={() => updateSetting('enable_content_queue', !settings.enable_content_queue)}
            label="File d'attente de contenu"
          />
          <Toggle
            enabled={settings.require_approval_for_new_users}
            onToggle={() => updateSetting('require_approval_for_new_users', !settings.require_approval_for_new_users)}
            label="Exiger approbation pour nouveaux utilisateurs"
          />
          {settings.require_approval_for_new_users && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre de posts avant approbation</label>
              <input
                type="number"
                value={settings.approval_post_count}
                onChange={(e) => updateSetting('approval_post_count', parseInt(e.target.value) || 3)}
                disabled={!canModify}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>
          )}
          <Toggle
            enabled={settings.enable_report_review}
            onToggle={() => updateSetting('enable_report_review', !settings.enable_report_review)}
            label="Révision des signalements"
          />
        </div>
      </div>
    </div>
  );
}
