import React, { useState, useRef, useEffect, useCallback, KeyboardEvent, useMemo } from 'react';
import { useUser, useNotifications, useXP, useDM, useMuteBlock } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { Send, X, MessageSquare, Search, Mic, Video, PhoneOff, MicOff, VideoOff, Paperclip, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { dmTypingService } from '@/lib/dmTypingService';
import { getSpecialBadgeForUser, SPECIAL_BADGES } from '@/lib/diamondBadges';
import { webrtcService, RemoteStreamInfo } from '@/lib/webrtcService';
import { uploadChatFile } from '@/lib/storageService';
import { toast } from 'sonner';
import { DEFAULT_BANNED_WORDS, findBannedWord, mergeBannedWords } from '@/lib/bannedWords';

interface DirectMessagePanelProps {
  onClose: () => void;
  initialUser?: string | { name: string };
}

function dmRoomId(a: string, b: string): string {
  return `dm:${[a, b].sort((x, y) => x.localeCompare(y)).join(':')}`;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground/50 italic">
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
      est en train d'écrire...
    </div>
  );
}

/** Badges spéciaux uniquement si l'utilisateur en possède réellement. */
function SpecialBadgesOnly({ profile, size = 'xs' }: { profile?: Record<string, unknown> | null; size?: 'xs' | 'sm' }) {
  if (!profile) return null;

  const roleId = getSpecialBadgeForUser({
    isFounder: !!profile.isFounder,
    isDirection: !!profile.isDirection,
    isMasterOp: !!profile.isMasterOp,
    isIridescent: !!profile.isIridescent,
  });

  const extraIds = Array.isArray(profile.specialBadges)
    ? (profile.specialBadges as string[]).filter((id) => id && id !== roleId)
    : [];

  const ids = [...(roleId ? [roleId] : []), ...extraIds];
  if (ids.length === 0) return null;

  const iconClass = size === 'sm' ? 'text-sm' : 'text-[11px]';

  return (
    <>
      {ids.map((id) => {
        if (id === 'iridescent') {
          return <DiamondBadge key={id} level={1} size={size} specialBadge="iridescent" />;
        }
        const special = SPECIAL_BADGES.find((b) => b.id === id);
        if (!special) return null;
        return (
          <span
            key={id}
            className={`${iconClass} leading-none shrink-0`}
            title={special.label}
            style={{ color: special.color }}
          >
            {special.icon}
          </span>
        );
      })}
    </>
  );
}

export default function DirectMessagePanel({ onClose, initialUser }: DirectMessagePanelProps) {
  const { user, supabaseUser, profiles } = useUser();
  const { addNotification } = useNotifications();
  const { isMuted, isBlocked } = useMuteBlock();
  const { sounds } = useXP();
  const { conversations, sendDM, getConversation, markRead, getUnreadCount, loadConversation } = useDM();

  const [selectedUser, setSelectedUser] = useState<string | null>(typeof initialUser === 'string' ? initialUser : (initialUser?.name || null));
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callHasVideo, setCallHasVideo] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);
  const [callBusy, setCallBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingBroadcastRef = useRef<number | null>(null);
  const remoteTypingTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const messages = user && selectedUser ? getConversation(user.name, selectedUser) : [];
  const contact = selectedUser
    ? (profiles[selectedUser] || {
        name: selectedUser,
        avatar: 'av1',
        initials: selectedUser.slice(0, 2).toUpperCase(),
        level: 1,
        status: 'offline' as const,
      })
    : null;
  const totalUnread = user ? getUnreadCount(user.name) : 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, remoteTyping, messages.length]);

  useEffect(() => {
    if (selectedUser && user) void loadConversation(user.name, selectedUser);
  }, [selectedUser, user, loadConversation]);

  useEffect(() => {
    if (selectedUser && user) void markRead(user.name, selectedUser);
  }, [selectedUser, user, markRead, messages.length]);

  useEffect(() => () => {
    if (typingBroadcastRef.current) clearTimeout(typingBroadcastRef.current);
    if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
  }, []);

  const myUserId = supabaseUser?.id ?? user?.name ?? '';
  const contactUserId = selectedUser ? (profiles[selectedUser]?.id ?? selectedUser) : null;

  useEffect(() => {
    if (!myUserId || !contactUserId || !selectedUser) {
      setRemoteTyping(false);
      return;
    }

    return dmTypingService.subscribe(myUserId, contactUserId, (payload) => {
      if (payload.userId === myUserId) return;
      setRemoteTyping(payload.isTyping);
      if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
      if (payload.isTyping) {
        remoteTypingTimerRef.current = window.setTimeout(() => setRemoteTyping(false), 3000);
      }
    });
  }, [myUserId, contactUserId, selectedUser, profiles]);

  // Écoute signalisation DM (réception d'appel)
  useEffect(() => {
    if (!user?.name || !selectedUser || !myUserId) return;
    const room = dmRoomId(user.name, selectedUser);
    void webrtcService.joinSignalOnly(room, myUserId, user.name);

    webrtcService.setListeners(
      (info) => {
        setRemoteStreams((prev) => {
          const next = prev.filter((s) => s.peerId !== info.peerId);
          next.push(info);
          return next;
        });
        setInCall(true);
        setCallHasVideo((v) => v || info.hasVideo);
      },
      (peerId) => {
        setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
      },
    );

    return () => {
      if (!inCall) {
        void webrtcService.leaveSalon();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inCall volontairement omis pour ne pas relancer leave
  }, [user?.name, selectedUser, myUserId]);

  useEffect(() => {
    const local = webrtcService.getLocalStream();
    if (localVideoRef.current && local) {
      localVideoRef.current.srcObject = local;
    }
  }, [inCall, camOn, callHasVideo]);

  useEffect(() => {
    const remote = remoteStreams[0]?.stream;
    if (remoteVideoRef.current && remote) {
      remoteVideoRef.current.srcObject = remote;
    }
  }, [remoteStreams]);

  useEffect(() => () => {
    void webrtcService.leaveSalon();
  }, []);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!myUserId || !contactUserId || !user?.name) return;
    dmTypingService.broadcast(myUserId, contactUserId, {
      userId: myUserId,
      userName: user.name,
      isTyping,
    });
  }, [myUserId, contactUserId, user?.name]);

  const handleTextChange = (value: string) => {
    setText(value);
    if (!myUserId || !contactUserId) return;

    broadcastTyping(true);
    if (typingBroadcastRef.current) clearTimeout(typingBroadcastRef.current);
    typingBroadcastRef.current = window.setTimeout(() => broadcastTyping(false), 2000);
  };

  useEffect(() => {
    if (selectedUser) setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectedUser]);

  const contacts = useMemo(() => {
    if (!user?.name) return [];

    const base = Object.values(profiles)
      .filter(p => p.name !== user.name && !isMuted(p.name) && !isBlocked(p.name))
      .map(p => ({
        name: p.name,
        avatar: p.avatar,
        initials: p.initials,
        level: (p as { level?: number }).level,
        status: (p as { status?: string }).status,
        lastAt: (p as { lastAt?: string }).lastAt,
        profile: p,
      }));

    const fromInboxMap = new Map<string, {
      name: string;
      avatar?: string;
      initials?: string;
      level?: number;
      status?: string;
      lastAt?: string;
      profile?: (typeof profiles)[string];
    }>();

    for (const msgs of Object.values(conversations || {})) {
      for (const m of msgs as Array<{ sender_id?: string; receiver_id?: string; created_at?: string }>) {
        const sender = m?.sender_id;
        const receiver = m?.receiver_id;
        if (!sender || !receiver) continue;
        if (sender !== user.name && receiver !== user.name) continue;

        const other = sender === user.name ? receiver : sender;
        if (!other || other === user.name) continue;
        if (isMuted(other) || isBlocked(other)) continue;

        const p = profiles[other];
        const existing = fromInboxMap.get(other);
        const createdAt = m?.created_at;
        const lastAt = !existing?.lastAt
          ? createdAt
          : (createdAt && createdAt > existing.lastAt ? createdAt : existing.lastAt);

        fromInboxMap.set(other, {
          name: other,
          avatar: p?.avatar || existing?.avatar,
          initials: p?.initials || existing?.initials || other.slice(0, 2).toUpperCase(),
          level: (p as { level?: number } | undefined)?.level ?? existing?.level ?? 1,
          status: (p as { status?: string } | undefined)?.status ?? existing?.status ?? 'offline',
          lastAt,
          profile: p || existing?.profile,
        });
      }
    }

    const merged = new Map<string, (typeof base)[number]>();
    for (const c of base) merged.set(c.name, c);
    for (const c of fromInboxMap.values()) {
      merged.set(c.name, { ...merged.get(c.name), ...c } as (typeof base)[number]);
    }

    return Array.from(merged.values())
      .sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || '') || a.name.localeCompare(b.name));
  }, [user?.name, profiles, conversations, isMuted, isBlocked]);

  const filteredContacts = useMemo(
    () => contacts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [contacts, search],
  );

  const unreadFor = useCallback((name: string) => {
    if (!user) return 0;
    return getConversation(user.name, name).filter(m => !m.is_read && m.sender_name !== user.name).length;
  }, [user, getConversation]);

  const clearSelectedFile = useCallback(() => {
    if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filePreview]);

  useEffect(() => () => {
    if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const pickFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 Mo)');
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

  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || !selectedUser || !user || sending) return;
    if (isMuted(selectedUser) || isBlocked(selectedUser)) return;

    if (text.trim() && findBannedWord(text.trim(), mergeBannedWords(DEFAULT_BANNED_WORDS))) {
      toast.error('Message bloqué : contenu non autorisé.');
      return;
    }

    setSending(true);
    try {
      let imageUrl: string | null = null;
      if (selectedFile) {
        const ownerFolder = user.id || user.name || 'guest';
        imageUrl = await uploadChatFile(selectedFile, ownerFolder);
      }
      await sendDM(user.name, selectedUser, text.trim(), imageUrl);
      addNotification({ type: 'dm', message: `💬 Message envoyé à ${selectedUser}` });
      sounds?.dm();
      setText('');
      clearSelectedFile();
      broadcastTyping(false);
      if (typingBroadcastRef.current) clearTimeout(typingBroadcastRef.current);
    } catch (error) {
      console.error('Erreur envoi DM:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible d\'envoyer le message privé',
      });
    } finally {
      setSending(false);
    }
  };

  const endCall = useCallback(async () => {
    setInCall(false);
    setCallHasVideo(false);
    setCamOn(false);
    setMicOn(true);
    setRemoteStreams([]);
    await webrtcService.leaveSalon();
    if (user?.name && selectedUser && myUserId) {
      await webrtcService.joinSignalOnly(dmRoomId(user.name, selectedUser), myUserId, user.name);
    }
  }, [user?.name, selectedUser, myUserId]);

  const startCall = async (withVideo: boolean) => {
    if (!user?.name || !selectedUser || !myUserId || callBusy) return;
    setCallBusy(true);
    try {
      const room = dmRoomId(user.name, selectedUser);
      const peerId = contactUserId || selectedUser;
      const stream = await webrtcService.joinSalon(room, myUserId, user.name, {
        audio: true,
        video: withVideo,
      });
      if (!stream) {
        toast.error(withVideo ? 'Impossible d\'accéder à la caméra / micro.' : 'Impossible d\'accéder au microphone.');
        return;
      }
      webrtcService.setListeners(
        (info) => {
          setRemoteStreams((prev) => {
            const next = prev.filter((s) => s.peerId !== info.peerId);
            next.push(info);
            return next;
          });
        },
        (peerIdLeft) => {
          setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerIdLeft));
        },
      );
      webrtcService.connectToPeer(peerId, selectedUser);
      setInCall(true);
      setCallHasVideo(withVideo);
      setCamOn(withVideo);
      setMicOn(true);
      addNotification({
        type: 'system',
        message: withVideo
          ? `Appel vidéo vers ${selectedUser}…`
          : `Appel vocal vers ${selectedUser}…`,
      });
    } finally {
      setCallBusy(false);
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    webrtcService.toggleTrack('audio', next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    if (!camOn) {
      const ok = await webrtcService.ensureVideoTrack();
      if (!ok) {
        toast.error('Impossible d\'activer la caméra.');
        return;
      }
      webrtcService.toggleTrack('video', true);
      setCamOn(true);
      setCallHasVideo(true);
    } else {
      webrtcService.toggleTrack('video', false);
      setCamOn(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const handleClose = () => {
    void webrtcService.leaveSalon();
    onClose();
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1500]" onClick={onClose}>
        <div className="bg-card border-2 border-red-500/50 rounded-2xl p-6 text-center shadow-[0_32px_96px_rgba(0,0,0,0.5),0_0_0_1px_rgba(239,68,68,0.3)]">
          <p className="text-sm text-muted-foreground">Connectez-vous pour envoyer des messages privés</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1500] animate-in fade-in duration-300 p-4" onClick={handleClose}>
      <div
        className="bg-card border-2 border-red-500/50 rounded-3xl w-full max-w-[720px] h-[90vh] max-h-[560px] flex overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5),0_0_0_1px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar contacts */}
        <div className="w-[210px] bg-secondary border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary animate-pulse" /> Messages
              {totalUnread > 0 && (
                <span className="text-[9px] bg-primary text-white rounded-full px-1.5 py-px font-bold animate-bounce">{totalUnread}</span>
              )}
            </span>
            <button onClick={handleClose} className="p-1 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-all duration-200 hover:scale-110 active:scale-95">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-2 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 focus-within:border-primary/50 transition-all duration-200">
              <Search className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="flex-1 bg-transparent border-none outline-none text-[11px] text-foreground placeholder:text-muted-foreground/40" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {filteredContacts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/40 italic px-3 py-4 text-center">
                {contacts.length === 0 ? 'Aucun contact.' : 'Aucun résultat.'}
              </p>
            ) : filteredContacts.map((u, index) => {
              const unread = unreadFor(u.name);
              const lastMsg = user ? getConversation(user.name, u.name).at(-1) : null;
              const profile = u.profile || profiles[u.name];
              return (
                <button key={u.name} onClick={() => setSelectedUser(u.name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all duration-200 text-left ${selectedUser === u.name ? 'bg-primary/15 border-r-2 border-primary' : 'hover:bg-white/[0.04] hover:scale-[1.01]'} animate-slide-in-right`}
                  style={{ animationDelay: `${index * 30}ms` }}>
                  <div className="relative shrink-0 transition-transform duration-200 hover:scale-110">
                    <Avatar avatarClass={u.avatar || 'av1'} initials={u.initials || u.name.slice(0, 2).toUpperCase()} size="sm" />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">{unread}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-medium truncate ${unread > 0 ? 'text-foreground' : 'text-muted-foreground/80'}`}>{u.name}</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <DiamondBadge level={u.level || 1} size="xs" />
                        <SpecialBadgesOnly profile={profile as Record<string, unknown>} />
                      </span>
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${unread > 0 ? 'text-foreground/60 font-medium' : 'text-muted-foreground/40'}`}>
                      {lastMsg
                        ? (lastMsg.image_url && (!lastMsg.text || lastMsg.text === '📎 Fichier')
                          ? '📎 Fichier'
                          : lastMsg.text)
                        : `Nv.${u.level || 1}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedUser && contact ? (
            <>
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 shrink-0 bg-card">
                <Avatar avatarClass={contact.avatar || 'av1'} initials={contact.initials || contact.name.slice(0, 2).toUpperCase()} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{contact.name}</span>
                    <DiamondBadge level={contact.level || 1} size="xs" />
                    <SpecialBadgesOnly profile={contact as Record<string, unknown>} />
                  </div>
                  <div className="text-[10px] text-muted-foreground/50">
                    {inCall
                      ? <span className="text-emerald-400">En appel{callHasVideo ? ' vidéo' : ' vocal'}…</span>
                      : remoteTyping
                        ? <span className="text-emerald-400 italic animate-pulse">est en train d'écrire...</span>
                        : contact.status === 'online' ? <span className="text-emerald-400">En ligne</span> : `Nv.${contact.level || 1}`
                    }
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!inCall ? (
                    <>
                      <button
                        type="button"
                        disabled={callBusy}
                        onClick={() => void startCall(false)}
                        title="Appel vocal"
                        className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={callBusy}
                        onClick={() => void startCall(true)}
                        title="Appel vidéo"
                        className="p-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={toggleMic}
                        title={micOn ? 'Couper le micro' : 'Activer le micro'}
                        className={`p-2 rounded-lg border transition-colors ${micOn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}
                      >
                        {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleCam()}
                        title={camOn ? 'Couper la caméra' : 'Activer la caméra'}
                        className={`p-2 rounded-lg border transition-colors ${camOn ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-border text-muted-foreground'}`}
                      >
                        {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void endCall()}
                        title="Raccrocher"
                        className="p-2 rounded-lg border border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {inCall && (
                <div className="relative shrink-0 border-b border-border bg-black/40 px-3 py-2">
                  <div className="flex gap-2 items-stretch justify-center min-h-[120px]">
                    <div className="relative flex-1 max-w-[280px] rounded-xl overflow-hidden bg-secondary border border-border">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover min-h-[110px] ${remoteStreams[0]?.hasVideo || callHasVideo ? '' : 'hidden'}`}
                      />
                      {!remoteStreams[0]?.hasVideo && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/50">
                          <Avatar
                            avatarClass={contact.avatar || 'av1'}
                            initials={contact.initials || contact.name.slice(0, 2).toUpperCase()}
                            size="md"
                          />
                          <span className="text-[10px]">{remoteStreams.length ? 'Audio uniquement' : 'En attente…'}</span>
                        </div>
                      )}
                      <span className="absolute bottom-1 left-2 text-[9px] text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
                        {selectedUser}
                      </span>
                    </div>
                    <div className="relative w-[100px] rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover min-h-[110px] ${camOn ? '' : 'hidden'}`}
                      />
                      {!camOn && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/50">
                          Vous
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground/40 mt-16">
                    <MessageSquare className="w-8 h-8 animate-float" />
                    <p className="text-xs">Démarrez une conversation avec {selectedUser}</p>
                  </div>
                ) : messages.map((msg, index) => {
                  const isOwn = msg.sender_name === user?.name;
                  const isImage = !!msg.image_url && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(msg.image_url);
                  const isFileOnly = !!msg.image_url && (!msg.text || msg.text === '📎 Fichier');
                  return (
                    <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : ''} animate-slide-in-up`} style={{ animationDelay: `${index * 30}ms` }}>
                      {!isOwn && <Avatar avatarClass={msg.sender_avatar} initials={msg.sender_initials} size="xs" />}
                      <div className={`max-w-[65%] px-3 py-2 text-[13px] rounded-xl leading-relaxed break-words transition-all duration-200 hover:scale-[1.02] ${isOwn ? 'bg-purple-700/30 border border-purple-500/30 rounded-br-sm hover:bg-purple-700/40' : 'bg-secondary border border-border rounded-bl-sm hover:bg-secondary/90'}`}>
                        {msg.image_url && (
                          isImage ? (
                            <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                              <img src={msg.image_url} alt="Pièce jointe" className="max-w-full max-h-48 rounded-lg object-cover" />
                            </a>
                          ) : (
                            <a
                              href={msg.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded-lg bg-black/20 border border-white/10 text-[11px] text-primary hover:bg-black/30"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Télécharger le fichier</span>
                            </a>
                          )
                        )}
                        {!isFileOnly && msg.text && (
                          <span className="text-foreground">{msg.text}</span>
                        )}
                        <div className={`text-[9px] mt-1 flex items-center gap-1 ${isOwn ? 'justify-end text-purple-300/50' : 'text-muted-foreground/40'}`}>
                          {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                          {isOwn && <span className="text-purple-300/40">{msg.is_read ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {remoteTyping && <TypingDots />}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border px-4 py-2.5 shrink-0">
                {selectedFile && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-secondary border border-border rounded-xl">
                    {filePreview ? (
                      <img src={filePreview} alt="Aperçu" className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-primary font-semibold">Fichier prêt</span>
                      <p className="text-[11px] text-muted-foreground/60 truncate">{selectedFile.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="text-muted-foreground/40 hover:text-foreground transition-colors"
                      aria-label="Retirer le fichier"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-secondary border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10 transition-all duration-200">
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
                    title="Joindre un fichier (max 5 Mo)"
                    className="p-1 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <textarea ref={inputRef} value={text} onChange={e => handleTextChange(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={`Message à ${selectedUser}...`} rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/40 resize-none min-h-[22px] max-h-[80px] leading-relaxed py-0.5 transition-all duration-200"
                    style={{ height: 'auto' }}
                    onInput={(e) => { (e.target as HTMLTextAreaElement).style.height = 'auto'; (e.target as HTMLTextAreaElement).style.height = Math.min((e.target as HTMLTextAreaElement).scrollHeight, 80) + 'px'; }} />
                  <button onClick={() => void handleSend()} disabled={sending || (!text.trim() && !selectedFile)}
                    className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 disabled:bg-secondary disabled:text-muted-foreground/40 hover:bg-primary/80 transition-all duration-200 hover:scale-110 active:scale-95 disabled:hover:scale-100">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
              <MessageSquare className="w-10 h-10" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
