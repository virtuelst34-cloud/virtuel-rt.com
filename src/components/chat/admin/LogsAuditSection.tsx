import React, { useState, useEffect } from 'react';
import { FileText, Save, RefreshCw, Download, Search, Filter, Calendar, User, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionTitle } from './AdminComponents';
import { isFounder } from '@/lib/utils/founderCheck';
import { useUser } from '@/lib/contexts';

interface LogEntry {
  id: string;
  action: string;
  user_id: string;
  user_name: string;
  details: string;
  ip_address: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface LogsAuditSettings {
  enable_logging: boolean;
  log_retention_days: number;
  log_admin_actions: boolean;
  log_user_actions: boolean;
  log_security_events: boolean;
  log_api_calls: boolean;
  enable_log_export: boolean;
  enable_realtime_monitoring: boolean;
  alert_on_critical: boolean;
  alert_email_recipients: string[];
}

const DEFAULT_SETTINGS: LogsAuditSettings = {
  enable_logging: true,
  log_retention_days: 30,
  log_admin_actions: true,
  log_user_actions: true,
  log_security_events: true,
  log_api_calls: false,
  enable_log_export: true,
  enable_realtime_monitoring: true,
  alert_on_critical: true,
  alert_email_recipients: [],
};

interface Props { readOnly?: boolean; }

export default function LogsAuditSection({ readOnly = false }: Props) {
  const { user } = useUser();
  const [settings, setSettings] = useState<LogsAuditSettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [newEmail, setNewEmail] = useState('');

  const canModify = !readOnly && isFounder(user);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('logs_audit_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Aucun paramètre de logs trouvé, utilisation des valeurs par défaut');
        } else {
          console.error('Erreur lors du chargement des paramètres de logs:', error);
        }
      } else if (data) {
        setSettings(data as LogsAuditSettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erreur lors du chargement des logs:', error);
      } else {
        setLogs(data as LogEntry[]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('logs_audit_settings')
        .upsert(settings);

      if (error) throw error;

      setHasChanges(false);
      alert('Paramètres de logs sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres de logs');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof LogsAuditSettings>(key: K, value: LogsAuditSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addEmailRecipient = () => {
    if (newEmail.trim() && !settings.alert_email_recipients.includes(newEmail.trim())) {
      updateSetting('alert_email_recipients', [...settings.alert_email_recipients, newEmail.trim()]);
      setNewEmail('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    updateSetting('alert_email_recipients', settings.alert_email_recipients.filter(e => e !== email));
  };

  const exportLogs = () => {
    const csv = logs.map(log => 
      `${log.timestamp},${log.action},${log.user_name},${log.severity},${log.details}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString()}.csv`;
    a.click();
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

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
          <h3 className="text-lg font-semibold text-foreground">Logs et audit</h3>
          <p className="text-sm text-muted-foreground">
            Consultez et configurez les logs système
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-white/[0.04] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
          <button
            onClick={exportLogs}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-white/[0.04] transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
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
          <FileText className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Modifications non sauvegardées
          </span>
        </div>
      )}

      {/* Configuration des logs */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Configuration des logs
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.enable_logging}
            onToggle={() => updateSetting('enable_logging', !settings.enable_logging)}
            label="Activer le logging"
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Rétention des logs (jours)</label>
            <input
              type="number"
              value={settings.log_retention_days}
              onChange={(e) => updateSetting('log_retention_days', parseInt(e.target.value) || 30)}
              disabled={!canModify}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
            />
          </div>
          <Toggle
            enabled={settings.log_admin_actions}
            onToggle={() => updateSetting('log_admin_actions', !settings.log_admin_actions)}
            label="Logger les actions_Admin"
          />
          <Toggle
            enabled={settings.log_user_actions}
            onToggle={() => updateSetting('log_user_actions', !settings.log_user_actions)}
            label="Logger les actions utilisateurs"
          />
          <Toggle
            enabled={settings.log_security_events}
            onToggle={() => updateSetting('log_security_events', !settings.log_security_events)}
            label="Logger les événements de sécurité"
          />
          <Toggle
            enabled={settings.log_api_calls}
            onToggle={() => updateSetting('log_api_calls', !settings.log_api_calls)}
            label="Logger les appels API"
          />
          <Toggle
            enabled={settings.enable_realtime_monitoring}
            onToggle={() => updateSetting('enable_realtime_monitoring', !settings.enable_realtime_monitoring)}
            label="Monitoring en temps réel"
          />
        </div>
      </div>

      {/* Alertes */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Alertes et notifications
        </h4>
        <div className="space-y-3">
          <Toggle
            enabled={settings.alert_on_critical}
            onToggle={() => updateSetting('alert_on_critical', !settings.alert_on_critical)}
            label="Alerte sur événements critiques"
          />
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Destinataires d'alertes email</label>
            <div className="flex gap-2">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Ajouter un email..."
                disabled={!canModify}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40 disabled:opacity-50"
              />
              <button
                onClick={addEmailRecipient}
                disabled={!canModify}
                className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.alert_email_recipients.map((email) => (
                <div key={email} className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1">
                  <span className="text-xs text-foreground">{email}</span>
                  <button
                    onClick={() => removeEmailRecipient(email)}
                    disabled={!canModify}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logs récents */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Logs récents
        </h4>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40"
            />
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40"
          >
            <option value="all">Tous</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 italic">Aucun log trouvé.</p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`p-2 rounded-lg border ${
                log.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                log.severity === 'error' ? 'bg-red-500/5 border-red-500/20' :
                log.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-secondary border-border'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted-foreground/50">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    log.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    log.severity === 'error' ? 'bg-red-500/15 text-red-400' :
                    log.severity === 'warning' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-blue-500/15 text-blue-400'
                  }`}>{log.severity.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3 h-3 text-muted-foreground/40" />
                  <span className="text-xs font-medium text-foreground">{log.user_name}</span>
                </div>
                <div className="text-xs text-foreground">{log.action}</div>
                {log.details && <div className="text-[10px] text-muted-foreground/60 mt-1">{log.details}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
