import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MessageSquare, Send, Trash2, Wrench, ShieldAlert, Flag, Bell,
  VolumeX, Ban, Search, RefreshCw, Check, Loader2, ExternalLink,
  Paperclip, FileText, Smile, CheckCheck, MessagesSquare, Flame, Pin,
} from 'lucide-react';
import { useUser, useUI, useModeration, useNotifications, useSalons, useGlobalSettings } from '@/lib/contexts';
import { hasStaffAccess, hasAdminAccess } from '@/lib/utils/founderCheck';
import { staffChatService, type StaffMessage } from '@/lib/staffChatService';
import { uploadChatFile } from '@/lib/storageService';
import UserDisplayName from './UserDisplayName';
import ReactionPicker from './ReactionPicker';
import {
  moderationAlertService,
  type StaffReport,
  type ModerationAlertQueueItem,
} from '@/lib/moderationAlertService';
import { parseNotificationTarget } from '@/lib/utils/notificationNavigation';
import {
  resolveStaffNotifCategory,
  staffNotifLabel,
} from '@/lib/utils/staffNotifications';
import { supabase } from '@/lib/supabase';
import { supabaseDbService } from '@/lib/supabaseDb';
import { mergeAndSortSalons } from '@/lib/salonUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  onClose: () => void;
}

type StaffTab = 'notifications' | 'chat' | 'tools';

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
const MAX_FILE_MB = 5;

function isImageUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url);
}

export default function StaffChatPanel({ onClose }: Props) {
  const { user, supabaseUser } = useUser();
  const { openAdmin, staffChatIntent, clearStaffChatIntent } = useUI();
  const {
    staffNotifications,
    staffUnreadCount,
    markStaffNotificationsRead,
    markNotificationRead,
  } = useNotifications();
  const { banUser, muteUser, unbanUser, unmuteUser, isUserBanned, isUserMuted } = useModeration();
  const { currentSalon, customSalons, hiddenSalons, displayOrder } = useSalons();
  const { settings, refresh: refreshSettings } = useGlobalSettings();
  const canStaff = hasStaffAccess(user);
  const canAdmin = hasAdminAccess(user);
  const [tab, setTab] = useState<StaffTab>('chat');
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);

  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [reactionPicker, setReactionPicker] = useState<{
    msgId: string;
    x: number;
    y: number;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reports, setReports] = useState<StaffReport[]>([]);
  const [queue, setQueue] = useState<ModerationAlertQueueItem[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [banReason, setBanReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState(false);
  const [pickSalonId, setPickSalonId] = useState('');

  const featuredId = settings.featured_salon_id || null;
  const salonOptions = mergeAndSortSalons(customSalons || [], hiddenSalons || [], displayOrder || {});

  const pinFeaturedSalon = async (salonId: string | null) => {
    setFeaturedBusy(true);
    try {
      await supabaseDbService.staffSetFeaturedSalon(salonId);
      await refreshSettings();
      toast.success(
        salonId
          ? `Salon du moment : ${salonOptions.find((s) => s.id === salonId)?.name || salonId}`
          : 'Épinglage du salon du moment retiré',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible d’épingler');
    } finally {
      setFeaturedBusy(false);
    }
  };

  const clearSelectedFile = useCallback(() => {
    if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filePreview]);

  useEffect(() => {
    if (!canStaff) return;
    let active = true;
    staffChatService.fetchMessages().then((msgs) => {
      if (active) setMessages(msgs);
    });
    const channel = staffChatService.subscribe(
      (msg) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])),
      (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
      (msg) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m))),
    );
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [canStaff]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Appliquer l'intent d'ouverture (badge Espace staff / deep link notif)
  useEffect(() => {
    if (!canStaff || !staffChatIntent) return;
    const intent = staffChatIntent;
    if (intent.tab) setTab(intent.tab);
    if (intent.targetUser) setUserQuery(intent.targetUser);
    if (intent.messageId) setHighlightMsgId(intent.messageId);
    if (intent.tab === 'notifications') {
      void markStaffNotificationsRead();
    }
    clearStaffChatIntent();
  }, [canStaff, staffChatIntent, clearStaffChatIntent, markStaffNotificationsRead]);

  // Scroll vers un message staff ciblé
  useEffect(() => {
    if (!highlightMsgId || tab !== 'chat') return;
    const el = msgRefs.current[highlightMsgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const t = window.setTimeout(() => setHighlightMsgId(null), 2500);
      return () => window.clearTimeout(t);
    }
  }, [highlightMsgId, tab, messages]);

  useEffect(() => {
    if (tab === 'notifications' && staffUnreadCount > 0) {
      void markStaffNotificationsRead();
    }
  }, [tab, staffUnreadCount, markStaffNotificationsRead]);

  useEffect(() => () => {
    if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const loadTools = useCallback(async () => {
    setToolsLoading(true);
    const [r, q] = await Promise.all([
      moderationAlertService.fetchReports(),
      moderationAlertService.fetchQueue(25),
    ]);
    setReports(r);
    setQueue(q);
    setToolsLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== 'tools' || !canStaff) return;
    void loadTools();
  }, [tab, canStaff, loadTools]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reactionPicker) setReactionPicker(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, reactionPicker]);

  if (!canStaff) return null;

  const pickFile = (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (max ${MAX_FILE_MB} Mo)`);
      return;
    }
    if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const send = async () => {
    if ((!input.trim() && !selectedFile) || sending) return;
    setSending(true);
    try {
      let attachment: { fileUrl: string; fileName?: string } | null = null;
      if (selectedFile) {
        const ownerFolder = supabaseUser?.id || user?.id || user?.name || 'staff';
        const fileUrl = await uploadChatFile(selectedFile, ownerFolder);
        attachment = { fileUrl, fileName: selectedFile.name };
      }
      const msg = await staffChatService.sendMessage(
        supabaseUser?.id || null,
        user?.name || 'Staff',
        input,
        attachment,
      );
      if (msg) {
        setInput('');
        clearSelectedFile();
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      } else {
        toast.error('Impossible d\'envoyer le message');
      }
    } catch (error) {
      console.error('Erreur envoi staff:', error);
      toast.error(error instanceof Error ? error.message : 'Échec de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const applyReaction = async (msgId: string, emoji: string) => {
    const actor = user?.name;
    if (!actor) return;
    // Optimistic update
    setMessages((prev) =>
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
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, reactions: result } : m)),
      );
    }
  };

  const openFullModeration = () => {
    openAdmin(user, 'modhub');
    onClose();
  };

  const handleStaffNotifClick = (notif: (typeof staffNotifications)[number]) => {
    void markNotificationRead(notif.id);
    const target = parseNotificationTarget(
      notif.type,
      notif.groupKey,
      notif.message,
      notif.metadata,
    );
    switch (target.kind) {
      case 'staff_chat':
        setTab('chat');
        if (target.messageId) setHighlightMsgId(target.messageId);
        break;
      case 'staff_tools':
        setTab('tools');
        if (target.userName) setUserQuery(target.userName);
        void loadTools();
        break;
      case 'staff_moderation':
        openAdmin(user, 'moderation');
        onClose();
        break;
      case 'staff_modhub':
        openAdmin(user, 'modhub');
        onClose();
        break;
      default: {
        const cat = resolveStaffNotifCategory(notif.type, notif.metadata);
        if (cat === 'staff_message') setTab('chat');
        else if (cat === 'staff_report') setTab('tools');
        else setTab('tools');
        break;
      }
    }
  };

  const handleReport = async (report: StaffReport, status: StaffReport['status']) => {
    const ok = await moderationAlertService.updateReport(report.id, {
      status,
      handled_by: user?.name || null,
      handled_at: new Date().toISOString(),
    });
    if (ok) await loadTools();
  };

  const targetName = userQuery.trim();
  const pendingReports = reports.filter((r) => r.status === 'pending' || r.status === 'in_progress');
  const pendingAlerts = queue.filter((q) => q.status === 'pending' || q.status === 'processing');

  const runMute = async () => {
    if (!targetName || actionBusy) return;
    if (!window.confirm(`Rendre muet « ${targetName} » ?`)) return;
    setActionBusy(true);
    await muteUser(targetName);
    setActionBusy(false);
  };

  const runBan = async () => {
    if (!targetName || actionBusy) return;
    if (!window.confirm(`Bannir « ${targetName} »${banReason.trim() ? ` (${banReason.trim()})` : ''} ?`)) return;
    setActionBusy(true);
    await banUser(targetName, banReason.trim());
    setActionBusy(false);
    setBanReason('');
  };

  const runUnmute = async () => {
    if (!targetName || actionBusy) return;
    if (!window.confirm(`Rétablir la parole de « ${targetName} » ?`)) return;
    setActionBusy(true);
    await unmuteUser(targetName);
    setActionBusy(false);
  };

  const runUnban = async () => {
    if (!targetName || actionBusy) return;
    if (!window.confirm(`Débannir « ${targetName} » ?`)) return;
    setActionBusy(true);
    await unbanUser(targetName);
    setActionBusy(false);
  };

  const panel = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1900] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-panel-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-lg h-[min(80vh,640px)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-red-500/[0.06] shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h2 id="staff-panel-title" className="text-sm font-semibold text-foreground flex-1">
            Espace staff
          </h2>
          {(staffUnreadCount > 0 || pendingReports.length > 0 || pendingAlerts.length > 0) && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              {staffUnreadCount > 0
                ? staffUnreadCount
                : pendingReports.length + pendingAlerts.length}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-border shrink-0" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notifications'}
            onClick={() => setTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
              tab === 'notifications'
                ? 'text-red-400 border-b-2 border-red-400 bg-red-500/[0.06]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Alertes
            {staffUnreadCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {staffUnreadCount > 9 ? '9+' : staffUnreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chat'}
            onClick={() => setTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
              tab === 'chat'
                ? 'text-red-400 border-b-2 border-red-400 bg-red-500/[0.06]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tools'}
            onClick={() => setTab('tools')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
              tab === 'tools'
                ? 'text-red-400 border-b-2 border-red-400 bg-red-500/[0.06]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Outils
            {pendingReports.length > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingReports.length > 9 ? '9+' : pendingReports.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'notifications' ? (
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground flex-1">
                Notifications staff uniquement
              </span>
              {staffNotifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={() => void markStaffNotificationsRead()}
                  className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  <CheckCheck className="w-3 h-3" /> Tout lu
                </button>
              )}
            </div>
            {staffNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground/40">
                <Bell className="w-8 h-8" />
                <p className="text-xs">Aucune alerte staff</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {staffNotifications.map((notif) => {
                  const cat = resolveStaffNotifCategory(notif.type, notif.metadata);
                  return (
                    <li key={String(notif.id)}>
                      <button
                        type="button"
                        onClick={() => handleStaffNotifClick(notif)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] ${
                          notif.read ? 'opacity-60' : 'bg-red-500/[0.04]'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg border border-red-500/25 bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          {cat === 'staff_message' ? (
                            <MessagesSquare className="w-3.5 h-3.5 text-red-400" />
                          ) : cat === 'staff_report' ? (
                            <Flag className="w-3.5 h-3.5 text-amber-400" />
                          ) : cat === 'staff_ban' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400/80">
                            {staffNotifLabel(cat)}
                          </p>
                          <p className="text-[12px] text-foreground leading-relaxed mt-0.5">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                            {notif.timestamp
                              ? format(new Date(notif.timestamp), 'HH:mm · d MMM', { locale: fr })
                              : ''}
                          </p>
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-2" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : tab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-8">
                  Aucun message staff pour le moment.
                </p>
              )}
              {messages.map((msg) => {
                const reactions = msg.reactions || {};
                const hasReactions = Object.keys(reactions).some((e) => (reactions[e]?.length || 0) > 0);
                const fileOnly = !!msg.file_url && (!msg.body || msg.body === '📎 Fichier');
                const isHighlighted = highlightMsgId === msg.id;
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { msgRefs.current[msg.id] = el; }}
                    className={`group rounded-lg px-1.5 py-1 transition-colors ${
                      isHighlighted ? 'bg-red-500/15 ring-1 ring-red-500/40' : ''
                    }`}
                  >
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
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-70 text-muted-foreground hover:text-amber-400"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setReactionPicker({
                            msgId: msg.id,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        aria-label="Réagir"
                        title="Réagir"
                      >
                        <Smile className="w-3 h-3" />
                      </button>
                      {(msg.author_id === supabaseUser?.id || canAdmin) && (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-70 text-muted-foreground hover:text-red-400"
                          onClick={() => void staffChatService.deleteMessage(msg.id)}
                          aria-label="Supprimer le message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {msg.file_url && (
                      isImageUrl(msg.file_url) ? (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 mb-1"
                        >
                          <img
                            src={msg.file_url}
                            alt={msg.file_name || 'Pièce jointe'}
                            className="max-w-full max-h-40 rounded-lg object-cover border border-border"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-1 mb-1 px-2 py-1.5 rounded-lg bg-secondary border border-border text-[11px] text-red-400 hover:bg-red-500/10 max-w-full"
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
                      <div
                        className="flex gap-1 flex-wrap mt-1 items-center"
                        role="group"
                        aria-label="Réactions"
                      >
                        {Object.entries(reactions).map(([emoji, users]) => {
                          if (!users?.length) return null;
                          const isMine = user?.name ? users.includes(user.name) : false;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void applyReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 border transition-all select-none hover:scale-105 active:scale-95 ${
                                isMine
                                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                  : 'bg-white/5 border-white/10 text-foreground/70 hover:bg-white/10'
                              }`}
                              aria-label={`${emoji} — ${users.length} réaction${users.length > 1 ? 's' : ''}`}
                              aria-pressed={isMine}
                            >
                              <span aria-hidden="true">{emoji}</span>
                              <span className="font-medium">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="p-2 border-t border-border shrink-0 space-y-2">
              {selectedFile && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary border border-border rounded-xl">
                  {filePreview ? (
                    <img src={filePreview} alt="Aperçu" className="w-9 h-9 object-cover rounded-lg" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-red-400 font-semibold">Fichier prêt</span>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{selectedFile.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                    aria-label="Retirer le fichier"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) pickFile(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Joindre un fichier (max 5 Mo)"
                  aria-label="Joindre un fichier"
                  className={`p-2 rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${
                    selectedFile
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-background border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Message au staff…"
                  maxLength={2000}
                  className="flex-1 min-w-0 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-red-500/40"
                />
                <button
                  type="button"
                  disabled={sending || (!input.trim() && !selectedFile)}
                  onClick={() => void send()}
                  className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 disabled:opacity-40 shrink-0"
                  aria-label="Envoyer"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
            <button
              type="button"
              onClick={openFullModeration}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir le Centre de modération
            </button>

            {/* Salon du moment */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-primary" /> Salon du moment
              </h3>
              <p className="text-[10px] text-muted-foreground/50">
                Visible sur l’Accueil pour tout le monde.
                {featuredId
                  ? ` Actuel : ${salonOptions.find((s) => s.id === featuredId)?.name || featuredId}`
                  : ' (auto = salon le plus actif)'}
              </p>
              {currentSalon && (
                <button
                  type="button"
                  disabled={featuredBusy}
                  onClick={() =>
                    void pinFeaturedSalon(
                      featuredId === currentSalon ? null : currentSalon,
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 disabled:opacity-50"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {featuredId === currentSalon
                    ? 'Retirer l’épingle du salon actuel'
                    : 'Définir salon du moment (salon actuel)'}
                </button>
              )}
              <div className="flex gap-1.5">
                <select
                  value={pickSalonId}
                  onChange={(e) => setPickSalonId(e.target.value)}
                  className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2 py-2 text-xs outline-none focus:border-red-500/40"
                >
                  <option value="">Choisir un salon…</option>
                  {salonOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji || '💬'} {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!pickSalonId || featuredBusy}
                  onClick={() => void pinFeaturedSalon(pickSalonId || null)}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium disabled:opacity-40 shrink-0"
                >
                  Épingler
                </button>
              </div>
              {featuredId && (
                <button
                  type="button"
                  disabled={featuredBusy}
                  onClick={() => void pinFeaturedSalon(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Retirer l’épingle (revenir en auto)
                </button>
              )}
            </section>

            {/* Quick user actions */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                <Search className="w-3 h-3" /> Action rapide
              </h3>
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Nom d'utilisateur…"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-red-500/40"
              />
              {targetName && (
                <p className="text-[10px] text-muted-foreground">
                  {isUserBanned(targetName) && <span className="text-red-400 mr-2">Banni</span>}
                  {isUserMuted(targetName) && <span className="text-amber-400">Muet</span>}
                  {!isUserBanned(targetName) && !isUserMuted(targetName) && (
                    <span className="text-emerald-400/80">Aucun statut actif connu</span>
                  )}
                </p>
              )}
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Motif du ban (optionnel)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-red-500/40"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={!targetName || actionBusy}
                  onClick={() => void runMute()}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium disabled:opacity-40"
                >
                  <VolumeX className="w-3 h-3" /> Mute
                </button>
                <button
                  type="button"
                  disabled={!targetName || actionBusy}
                  onClick={() => void runBan()}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-medium disabled:opacity-40"
                >
                  <Ban className="w-3 h-3" /> Ban
                </button>
                <button
                  type="button"
                  disabled={!targetName || actionBusy}
                  onClick={() => void runUnmute()}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary border border-border text-muted-foreground text-[11px] disabled:opacity-40"
                >
                  Unmute
                </button>
                <button
                  type="button"
                  disabled={!targetName || actionBusy}
                  onClick={() => void runUnban()}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-secondary border border-border text-muted-foreground text-[11px] disabled:opacity-40"
                >
                  Unban
                </button>
              </div>
            </section>

            {/* Reports */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5 flex-1">
                  <Flag className="w-3 h-3" /> Signalements récents
                </h3>
                <button
                  type="button"
                  onClick={() => void loadTools()}
                  className="p-1 rounded text-muted-foreground hover:text-red-400"
                  aria-label="Actualiser"
                >
                  <RefreshCw className={`w-3 h-3 ${toolsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {toolsLoading && reports.length === 0 ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                </div>
              ) : pendingReports.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 py-2">Aucun signalement en attente.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingReports.slice(0, 8).map((report) => (
                    <li
                      key={report.id}
                      className="rounded-xl border border-border bg-secondary/40 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-foreground truncate">
                            {report.target_name || report.target_id}
                            <span className="ml-1.5 text-muted-foreground/50 font-normal">
                              · {report.reason}
                            </span>
                          </p>
                          {report.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              {report.description}
                            </p>
                          )}
                          <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                            par {report.reporter} · {new Date(report.created_at || report.timestamp).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleReport(report, 'resolved')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-medium"
                        >
                          <Check className="w-3 h-3" /> Traité
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReport(report, 'dismissed')}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground text-[10px]"
                        >
                          Rejeter
                        </button>
                        {report.target_name && (
                          <button
                            type="button"
                            onClick={() => setUserQuery(report.target_name || '')}
                            className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px]"
                            title="Préremplir pour mute/ban"
                          >
                            Cible
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Alert queue */}
            <section className="space-y-2 pb-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                <Bell className="w-3 h-3" /> File d&apos;alertes
                {pendingAlerts.length > 0 && (
                  <span className="ml-1 text-red-400 normal-case tracking-normal">
                    ({pendingAlerts.length} en attente)
                  </span>
                )}
              </h3>
              {queue.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 py-2">File vide.</p>
              ) : (
                <ul className="space-y-1.5">
                  {queue.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border/60 px-2.5 py-2 text-[10px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground/90">{item.event_type}</span>
                        <span className="text-muted-foreground/50">{item.channel}</span>
                        <span
                          className={`ml-auto px-1.5 py-px rounded border text-[9px] ${
                            item.status === 'pending' || item.status === 'processing'
                              ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                              : item.status === 'sent'
                                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                : 'text-muted-foreground border-border bg-secondary'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {reactionPicker && (
        <ReactionPicker
          position={{ x: reactionPicker.x, y: reactionPicker.y }}
          onSelect={(emoji) => {
            void applyReaction(reactionPicker.msgId, emoji);
            setReactionPicker(null);
          }}
          onClose={() => setReactionPicker(null)}
        />
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
