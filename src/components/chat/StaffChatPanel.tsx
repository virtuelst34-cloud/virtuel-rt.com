import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MessageSquare, Send, Trash2, Wrench, ShieldAlert, Flag, Bell,
  VolumeX, Ban, Search, RefreshCw, Check, Loader2, ExternalLink,
} from 'lucide-react';
import { useUser, useUI, useModeration } from '@/lib/contexts';
import { hasStaffAccess, hasAdminAccess } from '@/lib/utils/founderCheck';
import { staffChatService, type StaffMessage } from '@/lib/staffChatService';
import {
  moderationAlertService,
  type StaffReport,
  type ModerationAlertQueueItem,
} from '@/lib/moderationAlertService';
import { supabase } from '@/lib/supabase';

interface Props {
  onClose: () => void;
}

type StaffTab = 'chat' | 'tools';

export default function StaffChatPanel({ onClose }: Props) {
  const { user, supabaseUser } = useUser();
  const { openAdmin } = useUI();
  const { banUser, muteUser, unbanUser, unmuteUser, isUserBanned, isUserMuted } = useModeration();
  const canStaff = hasStaffAccess(user);
  const canAdmin = hasAdminAccess(user);
  const [tab, setTab] = useState<StaffTab>('chat');

  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const [reports, setReports] = useState<StaffReport[]>([]);
  const [queue, setQueue] = useState<ModerationAlertQueueItem[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [banReason, setBanReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!canStaff) return;
    let active = true;
    staffChatService.fetchMessages().then((msgs) => {
      if (active) setMessages(msgs);
    });
    const channel = staffChatService.subscribe(
      (msg) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])),
      (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
    );
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [canStaff]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!canStaff) return null;

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = await staffChatService.sendMessage(
      supabaseUser?.id || null,
      user?.name || 'Staff',
      input,
    );
    setSending(false);
    if (msg) {
      setInput('');
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }
  };

  const openFullModeration = () => {
    openAdmin(user);
    onClose();
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
          {(pendingReports.length > 0 || pendingAlerts.length > 0) && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              {pendingReports.length + pendingAlerts.length}
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
            aria-selected={tab === 'chat'}
            onClick={() => setTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
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

        {tab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-8">
                  Aucun message staff pour le moment.
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="group">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold text-red-400">{msg.author_name}</span>
                    <span className="text-[9px] text-muted-foreground/50">
                      {new Date(msg.created_at).toLocaleString('fr-FR')}
                    </span>
                    {(msg.author_id === supabaseUser?.id || canAdmin) && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                        onClick={() => void staffChatService.deleteMessage(msg.id)}
                        aria-label="Supprimer le message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{msg.body}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="p-2 border-t border-border flex gap-2 shrink-0">
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
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-red-500/40"
              />
              <button
                type="button"
                disabled={sending || !input.trim()}
                onClick={() => void send()}
                className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 disabled:opacity-40"
                aria-label="Envoyer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
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
    </div>
  );

  return createPortal(panel, document.body);
}
