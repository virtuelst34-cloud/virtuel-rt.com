import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldAlert, Bell, Settings, Lock, MessageSquare, RefreshCw, Save,
  Check, X, Mail, Smartphone, Flag, Send, Trash2, Loader2, AlertTriangle,
  Paperclip, FileText, Smile,
} from 'lucide-react';
import { SectionTitle, StatCard } from './AdminComponents';
import { hasAdminAccess, hasStaffAccess } from '@/lib/utils/founderCheck';
import {
  moderationAlertService,
  DEFAULT_ALERT_SETTINGS,
  type ModerationAlertSettings,
  type ModerationAlertQueueItem,
  type ModerationAlertLog,
  type StaffReport,
} from '@/lib/moderationAlertService';
import { staffChatService, type StaffMessage } from '@/lib/staffChatService';
import { uploadChatFile } from '@/lib/storageService';
import { useUser } from '@/lib/contexts';
import { supabase } from '@/lib/supabase';
import UserDisplayName from '../UserDisplayName';
import ReactionPicker from '../ReactionPicker';
import { toast } from 'sonner';

const STAFF_IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;

interface Props {
  readOnly?: boolean;
  user: any;
  initialSubTab?: HubTab;
}

type HubTab = 'alerts' | 'channels' | 'settings' | 'permissions' | 'staff' | 'tools';

const HUB_TABS: { id: HubTab; label: string; icon: typeof Bell }[] = [
  { id: 'alerts', label: 'Alertes / File', icon: Flag },
  { id: 'channels', label: 'Canaux', icon: Bell },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'permissions', label: 'Permissions', icon: Lock },
  { id: 'staff', label: 'Espace staff', icon: MessageSquare },
  { id: 'tools', label: 'Outils', icon: ShieldAlert },
];

const ROLE_OPTIONS = [
  { id: 'founder', label: 'Fondateur' },
  { id: 'direction', label: 'Direction' },
  { id: 'master_op', label: 'Master OP' },
  { id: 'moderator', label: 'Modérateur' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  sent: 'Envoyé',
  failed: 'Échec',
  skipped: 'Ignoré',
  provider_missing: 'Provider manquant',
  in_progress: 'En traitement',
  resolved: 'Résolu',
  dismissed: 'Rejeté',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  processing: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  sent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  failed: 'text-red-400 border-red-500/30 bg-red-500/10',
  skipped: 'text-muted-foreground border-border bg-secondary',
  provider_missing: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  in_progress: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  resolved: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  dismissed: 'text-muted-foreground border-border bg-secondary',
};

export default function ModerationHubSection({ readOnly = false, user, initialSubTab }: Props) {
  const { supabaseUser } = useUser();
  const canModify = hasAdminAccess(user, readOnly);
  const canStaff = hasStaffAccess(user);
  const [subTab, setSubTab] = useState<HubTab>(initialSubTab || 'alerts');

  const [settings, setSettings] = useState<ModerationAlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reports, setReports] = useState<StaffReport[]>([]);
  const [queue, setQueue] = useState<ModerationAlertQueueItem[]>([]);
  const [log, setLog] = useState<ModerationAlertLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Staff chat
  const [staffMessages, setStaffMessages] = useState<StaffMessage[]>([]);
  const [staffInput, setStaffInput] = useState('');
  const [sendingStaff, setSendingStaff] = useState(false);
  const [staffFile, setStaffFile] = useState<File | null>(null);
  const [staffReactionPicker, setStaffReactionPicker] = useState<{
    msgId: string;
    x: number;
    y: number;
  } | null>(null);
  const staffEndRef = useRef<HTMLDivElement>(null);
  const staffFileRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, r, q, l, p] = await Promise.all([
      moderationAlertService.getSettings(),
      moderationAlertService.fetchReports(),
      moderationAlertService.fetchQueue(40),
      moderationAlertService.fetchLog(30),
      moderationAlertService.getProviderStatus(),
    ]);
    setSettings(s);
    setReports(r);
    setQueue(q);
    setLog(l);
    setProviderStatus(p);
    setHasChanges(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (subTab !== 'staff' || !canStaff) return;
    let active = true;
    staffChatService.fetchMessages().then((msgs) => {
      if (active) setStaffMessages(msgs);
    });
    const channel = staffChatService.subscribe(
      (msg) => setStaffMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])),
      (id) => setStaffMessages((prev) => prev.filter((m) => m.id !== id)),
      (msg) => setStaffMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m))),
    );
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [subTab, canStaff]);

  useEffect(() => {
    staffEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [staffMessages]);

  const updateSetting = <K extends keyof ModerationAlertSettings>(key: K, value: ModerationAlertSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!canModify) return;
    setSaving(true);
    const ok = await moderationAlertService.saveSettings(settings);
    setSaving(false);
    if (ok) {
      setHasChanges(false);
      alert('Paramètres d\'alertes sauvegardés.');
      await loadAll();
    } else {
      alert('Erreur lors de la sauvegarde.');
    }
  };

  const handleTestAlert = async () => {
    if (!canModify) return;
    setTesting(true);
    const n = await moderationAlertService.dispatch(
      'test',
      '🧪 Alerte de test Virtuel-RT — canaux app / email / SMS selon configuration.',
      { source: 'admin_test' },
      user?.name,
    );
    await moderationAlertService.processQueue();
    setTesting(false);
    alert(n > 0 ? `Alerte de test envoyée (${n} destinataire(s)/canal).` : 'Aucun destinataire (vérifiez rôles et canaux).');
    await loadAll();
  };

  const handleProcessQueue = async () => {
    if (!canModify) return;
    setProcessing(true);
    const result = await moderationAlertService.processQueue();
    setProviderStatus(result.providerStatus);
    setProcessing(false);
    alert(`File traitée : ${result.processed} élément(s).`);
    await loadAll();
  };

  const handleReportStatus = async (report: StaffReport, status: StaffReport['status']) => {
    if (!canStaff || readOnly) return;
    const ok = await moderationAlertService.updateReport(report.id, {
      status,
      handled_by: user?.name || null,
      handled_at: new Date().toISOString(),
    });
    if (ok) await loadAll();
  };

  const sendStaffMessage = async () => {
    if (!canStaff || (!staffInput.trim() && !staffFile) || sendingStaff) return;
    setSendingStaff(true);
    try {
      let attachment: { fileUrl: string; fileName?: string } | null = null;
      if (staffFile) {
        if (staffFile.size > 5 * 1024 * 1024) {
          toast.error('Fichier trop volumineux (max 5 Mo)');
          return;
        }
        const ownerFolder = supabaseUser?.id || user?.id || user?.name || 'staff';
        const fileUrl = await uploadChatFile(staffFile, ownerFolder);
        attachment = { fileUrl, fileName: staffFile.name };
      }
      const msg = await staffChatService.sendMessage(
        supabaseUser?.id || null,
        user?.name || 'Staff',
        staffInput,
        attachment,
      );
      if (msg) {
        setStaffInput('');
        setStaffFile(null);
        if (staffFileRef.current) staffFileRef.current.value = '';
        setStaffMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Échec de l\'envoi');
    } finally {
      setSendingStaff(false);
    }
  };

  const toggleStaffReaction = async (msgId: string, emoji: string) => {
    const actor = user?.name;
    if (!actor) return;
    setStaffMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = [...(reactions[emoji] || [])];
        const idx = users.indexOf(actor);
        if (idx >= 0) users.splice(idx, 1);
        else users.push(actor);
        if (users.length === 0) delete reactions[emoji];
        else reactions[emoji] = users;
        return { ...m, reactions };
      }),
    );
    const result = await staffChatService.toggleReaction(msgId, emoji, actor);
    if (result) {
      setStaffMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, reactions: result } : m)),
      );
    }
  };

  const Toggle = ({
    enabled,
    onToggle,
    label,
    disabled,
  }: {
    enabled: boolean;
    onToggle: () => void;
    label: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || !canModify}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs ${
        disabled || !canModify
          ? 'opacity-50 cursor-not-allowed border-border text-muted-foreground'
          : enabled
            ? 'bg-green-500/15 border-green-500/30 text-green-400'
            : 'bg-red-500/15 border-red-500/30 text-red-400'
      }`}
    >
      {enabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      {label}
    </button>
  );

  const pendingReports = reports.filter((r) => r.status === 'pending' || !r.status).length;
  const pendingQueue = queue.filter((q) => q.status === 'pending' || q.status === 'provider_missing').length;

  if (!canStaff && !canModify) {
    return (
      <div className="text-sm text-muted-foreground">
        Accès réservé au staff (fondateur, direction, master OP, modérateur).
      </div>
    );
  }

  return (
    <div>
      <SectionTitle icon={ShieldAlert}>Centre de modération</SectionTitle>
      <p className="text-xs text-muted-foreground mb-4">
        Alertes, signalements, canaux de notification et espace de discussion staff.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard value={pendingReports} label="Signalements" color="amber" />
        <StatCard value={pendingQueue} label="File alertes" color="red" />
        <StatCard value={log.length} label="Journal récent" color="blue" />
      </div>

      <div className="flex flex-wrap gap-1 mb-4" role="tablist">
        {HUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                subTab === tab.id
                  ? 'bg-red-500/12 border-red-500/25 text-red-400'
                  : 'border-transparent text-muted-foreground/70 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          {/* ── Alertes / File ── */}
          {subTab === 'alerts' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground">Signalements en attente</h4>
                <button
                  type="button"
                  onClick={() => void loadAll()}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3 h-3" /> Actualiser
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {reports.length === 0 && (
                  <p className="text-xs text-muted-foreground/60">Aucun signalement.</p>
                )}
                {reports.map((report) => (
                  <div key={report.id} className="bg-secondary border border-border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground truncate">
                            {report.target_name || report.target_id}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[report.status] || STATUS_COLORS.pending}`}>
                            {STATUS_LABELS[report.status] || report.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {report.reason} · par {report.reporter} · {new Date(report.created_at || report.timestamp).toLocaleString('fr-FR')}
                        </p>
                        {report.description && (
                          <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2">{report.description}</p>
                        )}
                      </div>
                      {(report.status === 'pending' || !report.status) && canStaff && !readOnly && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleReportStatus(report, 'resolved')}
                            className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                          >
                            Traité
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReportStatus(report, 'dismissed')}
                            className="text-[10px] px-2 py-1 rounded bg-secondary border border-border text-muted-foreground"
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">File d&apos;alertes (email / SMS)</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {queue.length === 0 && (
                    <p className="text-xs text-muted-foreground/60">File vide.</p>
                  )}
                  {queue.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-[10px] bg-background/50 border border-border rounded-lg px-2.5 py-1.5">
                      <span className="uppercase text-muted-foreground w-10">{item.channel}</span>
                      <span className="flex-1 truncate text-foreground/80">{item.body}</span>
                      <span className={`px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Journal</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {log.map((entry) => (
                    <div key={entry.id} className="text-[10px] text-muted-foreground border-b border-border/50 py-1.5">
                      <span className="text-foreground/70">{entry.event_type}</span>
                      {' · '}
                      {entry.message}
                      <span className="text-muted-foreground/50"> · {entry.recipients_count} dest. · {new Date(entry.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Canaux ── */}
          {subTab === 'channels' && (
            <div className="space-y-4">
              <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-red-400" /> Canaux d&apos;alerte
                </h4>
                <Toggle
                  enabled={settings.enable_app_alerts}
                  onToggle={() => updateSetting('enable_app_alerts', !settings.enable_app_alerts)}
                  label="Notifications in-app"
                />
                <Toggle
                  enabled={settings.enable_email_alerts}
                  onToggle={() => updateSetting('enable_email_alerts', !settings.enable_email_alerts)}
                  label="Email (Resend)"
                />
                <Toggle
                  enabled={settings.enable_sms_alerts}
                  onToggle={() => updateSetting('enable_sms_alerts', !settings.enable_sms_alerts)}
                  label="SMS (Twilio)"
                />
              </div>

              <div className="bg-secondary border border-border rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-red-400" /> État des providers
                </h4>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className={`px-2 py-1 rounded border ${providerStatus.email === 'configured' ? STATUS_COLORS.sent : STATUS_COLORS.provider_missing}`}>
                    Email : {providerStatus.email === 'configured' ? 'configuré' : 'non configuré'}
                  </span>
                  <span className={`px-2 py-1 rounded border ${providerStatus.sms === 'configured' ? STATUS_COLORS.sent : STATUS_COLORS.provider_missing}`}>
                    SMS : {providerStatus.sms === 'configured' ? 'configuré' : 'non configuré'}
                  </span>
                </div>
                {(providerStatus.email !== 'configured' || providerStatus.sms !== 'configured') && (
                  <p className="text-[10px] text-amber-400/90 flex items-start gap-1.5 mt-2">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    Sans clés Resend/Twilio, les alertes restent en file (`provider_missing`). Voir `.env.example` et secrets Edge Functions.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canModify || testing}
                  onClick={() => void handleTestAlert()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Tester une alerte
                </button>
                <button
                  type="button"
                  disabled={!canModify || processing}
                  onClick={() => void handleProcessQueue()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Traiter la file
                </button>
                {hasChanges && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSettings()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs"
                  >
                    <Save className="w-3.5 h-3.5" /> Sauvegarder
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Paramètres ── */}
          {subTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Auto-notification</h4>
                <Toggle enabled={settings.auto_notify_on_report} onToggle={() => updateSetting('auto_notify_on_report', !settings.auto_notify_on_report)} label="Nouveau signalement" />
                <Toggle enabled={settings.auto_notify_on_ban} onToggle={() => updateSetting('auto_notify_on_ban', !settings.auto_notify_on_ban)} label="Ban / unban" />
                <Toggle enabled={settings.auto_notify_on_mute} onToggle={() => updateSetting('auto_notify_on_mute', !settings.auto_notify_on_mute)} label="Mute / unmute" />
                <Toggle enabled={settings.auto_notify_on_content_flag} onToggle={() => updateSetting('auto_notify_on_content_flag', !settings.auto_notify_on_content_flag)} label="Contenu signalé" />
                <Toggle enabled={settings.auto_notify_on_appeal} onToggle={() => updateSetting('auto_notify_on_appeal', !settings.auto_notify_on_appeal)} label="Appels" />
              </div>

              <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Rôles destinataires</h4>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const active = settings.recipient_roles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        disabled={!canModify}
                        onClick={() => {
                          const next = active
                            ? settings.recipient_roles.filter((r) => r !== role.id)
                            : [...settings.recipient_roles, role.id];
                          updateSetting('recipient_roles', next);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] ${
                          active
                            ? 'bg-red-500/15 border-red-500/30 text-red-400'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Le fondateur/créateur conserve toujours tous les droits, indépendamment de ces toggles.
                </p>
              </div>

              {hasChanges && canModify && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveSettings()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              )}
            </div>
          )}

          {/* ── Permissions ── */}
          {subTab === 'permissions' && (
            <div className="bg-secondary border border-border rounded-xl p-4 space-y-3 text-xs text-muted-foreground">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-red-400" /> Droits de modération
              </h4>
              <ul className="space-y-2 list-disc pl-4">
                <li><span className="text-foreground">Fondateur / créateur</span> — tous les droits (alertes, bans, permissions, staff).</li>
                <li><span className="text-foreground">Direction / Master OP</span> — alertes, signalements, ban/mute, chat staff, config alertes.</li>
                <li><span className="text-foreground">Modérateur</span> — recevoir alertes, traiter signalements, ban/mute, chat staff (pas la config globale).</li>
              </ul>
              <p>
                Matrice détaillée : onglet <strong className="text-foreground">Permissions</strong> du panneau admin
                (actions <code className="text-red-300/80">manage_alerts</code>, <code className="text-red-300/80">receive_alerts</code>, <code className="text-red-300/80">staff_chat</code>, <code className="text-red-300/80">handle_reports</code>).
              </p>
            </div>
          )}

          {/* ── Espace staff ── */}
          {subTab === 'staff' && (
            <div className="flex flex-col h-[360px] bg-secondary border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[11px] text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-red-400" />
                Discussion privée — staff uniquement
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {staffMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-8">Aucun message. Démarrez la conversation.</p>
                )}
                {staffMessages.map((msg) => {
                  const reactions = msg.reactions || {};
                  const hasReactions = Object.keys(reactions).some((e) => (reactions[e]?.length || 0) > 0);
                  const fileOnly = !!msg.file_url && (!msg.body || msg.body === '📎 Fichier');
                  return (
                  <div key={msg.id} className="group">
                    <div className="flex items-baseline gap-2">
                      <UserDisplayName
                        name={msg.author_name}
                        size="xs"
                        showSpecialLabels={false}
                        nameClassName="text-[11px] font-semibold text-red-400"
                      />
                      <span className="text-[9px] text-muted-foreground/50">
                        {new Date(msg.created_at).toLocaleString('fr-FR')}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-400"
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setStaffReactionPicker({
                              msgId: msg.id,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          aria-label="Réagir"
                        >
                          <Smile className="w-3 h-3" />
                        </button>
                      )}
                      {(msg.author_id === supabaseUser?.id || canModify) && !readOnly && (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                          onClick={() => void staffChatService.deleteMessage(msg.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {msg.file_url && (
                      STAFF_IMAGE_RE.test(msg.file_url) ? (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mt-1 mb-1">
                          <img
                            src={msg.file_url}
                            alt={msg.file_name || 'Pièce jointe'}
                            className="max-w-full max-h-36 rounded-lg object-cover border border-border"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-1 mb-1 px-2 py-1.5 rounded-lg bg-background border border-border text-[11px] text-red-400 hover:bg-red-500/10"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{msg.file_name || 'Télécharger le fichier'}</span>
                        </a>
                      )
                    )}
                    {!fileOnly && msg.body && (
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{msg.body}</p>
                    )}
                    {hasReactions && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {Object.entries(reactions).map(([emoji, users]) => {
                          if (!users?.length) return null;
                          const isMine = user?.name ? users.includes(user.name) : false;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              disabled={readOnly}
                              onClick={() => void toggleStaffReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 border ${
                                isMine
                                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                  : 'bg-white/5 border-white/10 text-foreground/70'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}
                <div ref={staffEndRef} />
              </div>
              {!readOnly && canStaff && (
                <div className="p-2 border-t border-border space-y-2">
                  {staffFile && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background border border-border text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate flex-1">{staffFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStaffFile(null);
                          if (staffFileRef.current) staffFileRef.current.value = '';
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Retirer le fichier"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={staffFileRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setStaffFile(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => staffFileRef.current?.click()}
                      disabled={sendingStaff}
                      className={`px-2 py-2 rounded-lg border shrink-0 ${
                        staffFile
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'bg-background border-border text-muted-foreground hover:text-red-400'
                      }`}
                      aria-label="Joindre un fichier"
                      title="Joindre un fichier (max 5 Mo)"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <input
                      value={staffInput}
                      onChange={(e) => setStaffInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void sendStaffMessage();
                        }
                      }}
                      placeholder="Message au staff…"
                      maxLength={2000}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40"
                    />
                    <button
                      type="button"
                      disabled={sendingStaff || (!staffInput.trim() && !staffFile)}
                      onClick={() => void sendStaffMessage()}
                      className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {staffReactionPicker && (
            <ReactionPicker
              position={{ x: staffReactionPicker.x, y: staffReactionPicker.y }}
              onSelect={(emoji) => {
                void toggleStaffReaction(staffReactionPicker.msgId, emoji);
                setStaffReactionPicker(null);
              }}
              onClose={() => setStaffReactionPicker(null)}
            />
          )}

          {/* ── Outils liés ── */}
          {subTab === 'tools' && (
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>Accès rapide aux outils de modération existants (via les onglets du panneau) :</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li><span className="text-foreground">Modération</span> — liste des bannis / mutés</li>
                <li><span className="text-foreground">Utilisateurs</span> — ban, mute, badges</li>
                <li><span className="text-foreground">Contenu</span> — filtres auto-modération</li>
                <li><span className="text-foreground">Logs</span> — audit et destinataires email legacy</li>
              </ul>
              <div className="flex items-center gap-2 text-[11px] text-foreground/80 bg-background/40 border border-border rounded-lg p-3">
                <Smartphone className="w-4 h-4 text-red-400 shrink-0" />
                Les utilisateurs peuvent renseigner un téléphone + consentement SMS dans Paramètres → Compte.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
