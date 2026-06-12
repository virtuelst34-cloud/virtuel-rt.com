import React, { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { useUser, useSalons, useXP, useModeration, useMessages, useNotifications } from '@/lib/contexts';
import { SALONS, SCENE_MEMBERS } from '@/lib/chatConfig';
import { Users, Search, VolumeX, X, ArrowLeft, Pin, ChevronDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ReactionPicker from './ReactionPicker';
import LevelUpToast from './LevelUpToast';
import ScenePanel from './ScenePanel';
import UserProfileView from './UserProfileView';

interface JoinToastProps {
  name: string;
  onDone: () => void;
}

function JoinToast({ name, onDone }: JoinToastProps) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 animate-fade-in-down">
      <div className="bg-primary/20 border border-primary/40 text-primary text-xs px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 shadow-lg">
        🎉 <span className="font-medium">{name}</span> a rejoint le salon
      </div>
    </div>
  );
}

interface TypingIndicatorProps {
  names: string[];
}

function TypingIndicator({ names }: TypingIndicatorProps) {
  if (!names.length) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-[11px] text-muted-foreground/50 italic">
      <span className="flex gap-0.5">
        {[0,1,2].map(i => (
          <span key={i} className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
      {names.join(', ')} {names.length === 1 ? "est en train d'écrire..." : "sont en train d'écrire..."}
    </div>
  );
}

// Demander permission notifications push une seule fois
function requestPushPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendPush(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

interface ChatAreaProps {
  micActive: boolean;
  micLevel: number;
  onOpenDM?: (name: string) => void;
}

export default function ChatArea({ micActive, micLevel, onOpenDM }: ChatAreaProps) {
  const { user, profiles } = useUser();
  const { currentSalon, setCurrentSalon, customSalons, hiddenSalons } = useSalons();
  const { awardXP, sounds } = useXP();
  const { isUserBanned, isUserMuted, isBlocked } = useModeration();
  const { addMessage, getMessages, deleteMessage, pinMessage, updateReaction } = useMessages();
  const { addNotification } = useNotifications();

  const scrollRef                           = useRef<HTMLDivElement>(null);
  const messagesEndRef                      = useRef<HTMLDivElement>(null);
  const typingTimerRef                      = useRef<number | null>(null);
  const timeoutsRef                         = useRef<number[]>([]);
  const prevMsgCountRef                     = useRef(0);
  const inputRef                           = useRef<HTMLTextAreaElement>(null);

  const [reactionPicker, setReactionPicker] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [levelUp, setLevelUp]               = useState<number | null>(null);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [showMembers, setShowMembers]       = useState(false);
  const [joinToast, setJoinToast]           = useState<string | null>(null);
  const [typing, setTyping]                 = useState<string[]>([]);
  const [viewProfile, setViewProfile]       = useState<string | null>(null);
  const [replyTo, setReplyTo]               = useState<any>(null);
  const [isAtBottom, setIsAtBottom]         = useState(true);
  const [unreadNew, setUnreadNew]           = useState(0);

  const allSalons    = [...SALONS, ...(customSalons || [])].filter(s => !(hiddenSalons || []).includes(s.id));
  const salon        = allSalons.find(s => s.id === currentSalon);
  const sceneMembers = SCENE_MEMBERS[currentSalon || ''] || [];
  const hasScene     = salon?.type === 'vocal' || salon?.type === 'chat vocal' || salon?.type === 'video';
  const messages     = currentSalon ? getMessages(currentSalon) : [];
  const pinnedMsg    = messages.find(m => m.pinned);

  // Demander permission push au montage
  useEffect(() => { requestPushPermission(); }, []);

  // Navigation hash
  useEffect(() => {
    window.location.hash = currentSalon ? `salon/${currentSalon}` : '';
  }, [currentSalon]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('salon/')) {
      const id = hash.replace('salon/', '');
      if (SALONS.find(s => s.id === id)) setCurrentSalon(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset état à chaque changement de salon
  useEffect(() => {
    if (!salon) return;
    setSearchQuery(''); setSearchOpen(false); setShowMembers(false);
    setReplyTo(null); setUnreadNew(0); setIsAtBottom(true);
    prevMsgCountRef.current = messages.length;
    if (salon.welcome) {
      const welcomeId = 'welcome-' + salon.id;
      const already = currentSalon ? getMessages(currentSalon).some(m => m.id === welcomeId) : false;
      if (!already && currentSalon) {
        addMessage(currentSalon, {
          id: welcomeId,
          is_system: true, is_announcement: true,
          text: salon.welcome,
          created_date: new Date().toISOString(),
          author_name: 'System',
          author_avatar: 'av1',
          author_initials: 'SY',
          salon: currentSalon,
          reactions: {},
        } as any);
      }
    }
    if (user) {
      setJoinToast(user.name);
      sounds?.join();
    }
    return () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSalon]);

  // Scroll intelligent : scroll si en bas, sinon compteur nouveaux messages
  useEffect(() => {
    const newCount = messages.length;
    const added    = newCount - prevMsgCountRef.current;
    prevMsgCountRef.current = newCount;
    if (added <= 0) return;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadNew(0);
    } else {
      setUnreadNew(prev => prev + added);
    }

    // Notification push pour les mentions
    if (user && added > 0) {
      const last = messages[messages.length - 1];
      if (last && last.author_name !== user.name && last.text?.includes(`@${user.name}`)) {
        sendPush(`${last.author_name} vous a mentionné`, last.text);
        addNotification({ type: 'dm', message: `📢 ${last.author_name} vous a mentionné dans #${salon?.name}` });
      }
    }
  }, [messages.length]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const evt = e as unknown as KeyboardEvent;
      // Cmd/Ctrl + K: Toggle recherche
      if ((evt.metaKey || evt.ctrlKey) && evt.key === 'k') {
        evt.preventDefault();
        setSearchOpen(o => !o);
        if (!searchOpen) setTimeout(() => (document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement)?.focus(), 100);
      }
      // Escape: Fermer les panneaux
      if (evt.key === 'Escape') {
        setSearchOpen(false);
        setShowMembers(false);
        setReplyTo(null);
        setReactionPicker(null);
      }
      // Cmd/Ctrl + N: Focus input
      if ((evt.metaKey || evt.ctrlKey) && evt.key === 'n') {
        evt.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Détecter si l'utilisateur est en bas du scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadNew(0);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadNew(0);
    setIsAtBottom(true);
  };

  const handleSend = useCallback((text: string, imageUrl: string | null, reply: any = null) => {
    if (!user || !currentSalon) return;
    if (isUserBanned(user.name) || isUserMuted(user.name)) return;
    const newMsg = {
      id: Date.now().toString(),
      salon: currentSalon,
      author_name: user.name,
      author_avatar: user.avatar,
      author_initials: user.initials,
      text: text || '',
      image_url: imageUrl || '',
      reactions: {},
      replyTo: reply ? { id: reply.id, author_name: reply.author_name, text: reply.text, author_avatar: reply.author_avatar || '', author_initials: reply.author_initials || '', created_date: reply.created_date || '' } : undefined,
      created_date: new Date().toISOString(),
    };
    addMessage(currentSalon, newMsg);
    sounds?.message();
    setReplyTo(null);
    const newLevel = awardXP();
    if (newLevel) setLevelUp(newLevel);
  }, [user, currentSalon, isUserBanned, isUserMuted, addMessage, sounds, awardXP]);

  const handleReact = useCallback((msgId: string, event: { clientX: number; clientY: number } | null, emoji?: string) => {
    if (emoji) {
      const msgs = currentSalon ? getMessages(currentSalon) : [];
      const msg  = msgs.find(m => m.id === msgId);
      if (!msg || !user) return;
      const reactions = { ...(msg.reactions || {}) };
      const users = [...(reactions[emoji] || [])];
      const idx = users.indexOf(user.name);
      if (idx >= 0) users.splice(idx, 1); else users.push(user.name);
      if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users;
      if (currentSalon) updateReaction(currentSalon, msgId, reactions);
    } else if (event) {
      setReactionPicker({ msgId, x: event.clientX, y: event.clientY });
    }
  }, [currentSalon, getMessages, updateReaction, user]);

  const handleDelete      = useCallback((msgId: string) => { if (currentSalon) deleteMessage(currentSalon, msgId); }, [currentSalon, deleteMessage]);
  const handlePin         = useCallback((msgId: string) => { if (currentSalon) pinMessage(currentSalon, msgId); }, [currentSalon, pinMessage]);
  const handleViewProfile = useCallback((name: string) => { if (name !== user?.name) setViewProfile(name); }, [user]);
  const handleReply       = useCallback((msg: any) => setReplyTo(msg), []);

  const handleTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping([]), 3000);
  };

  if (!salon) return null;

  const banned = user && isUserBanned(user.name);
  const muted  = user && isUserMuted(user.name);

  const visibleMessages = messages.filter(msg => {
    if (msg.is_system) return true;
    if (isBlocked(msg.author_name)) return false;
    if (searchQuery.trim()) {
      return msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             msg.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Membres réels du salon : membres sur scène + profils connectés (hors utilisateur courant)
  const realProfiles = Object.values(profiles || {})
    .filter(p => p.status !== 'offline' && p.name !== user?.name)
    .map(p => ({ name: p.name, avatar: p.avatar, initials: p.initials }));

  const allMembers = [
    ...sceneMembers,
    ...realProfiles,
  ].filter((m, i, arr) => arr.findIndex(x => x.name === m.name) === i);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative" onClick={() => setReactionPicker(null)}>

      {joinToast && <JoinToast name={joinToast} onDone={() => setJoinToast(null)} />}

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 shrink-0 bg-card">
        <button onClick={() => setCurrentSalon(null)}
          className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-colors" title="Retour">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-lg shrink-0">
          {salon.emoji || ({'musique60':'🎵','musique80':'🎸','karaoke':'🎤','debat':'⚡','quiz':'🧠','jeunes':'👋','lgbt':'🌈','divorce':'💙','libre':'🚪','insulte':'😤','cameras':'📹','bar':'🍷'})[currentSalon || ''] || '#'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{salon.name}</div>
          <div className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
            <span>{salon.type}</span>
            {salon.live && <span className="text-[9px] bg-red-600 text-red-100 rounded px-1.5 py-px font-semibold">LIVE</span>}
            <span className="text-muted-foreground/30">·</span>
            <span>{allMembers.length} membres</span>
          </div>
        </div>
        <button onClick={() => setSearchOpen(o => !o)}
          className={`p-1.5 rounded-lg border transition-colors ${searchOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground/60 hover:bg-white/5'}`}>
          <Search className="w-4 h-4" />
        </button>
        <button onClick={() => setShowMembers(o => !o)}
          className={`p-1.5 rounded-lg border transition-colors ${showMembers ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground/60 hover:bg-white/5'}`}>
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* Recherche */}
      {searchOpen && (
        <div className="px-4 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 bg-secondary border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les messages..."
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/40" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-muted-foreground/40 hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          {searchQuery && <p className="text-[10px] text-muted-foreground/40 mt-1 px-1">{visibleMessages.filter(m => !m.is_system).length} résultat(s)</p>}
        </div>
      )}

      {/* Message épinglé */}
      {pinnedMsg && !searchQuery && (
        <div className="mx-4 mt-2 px-3 py-2 bg-amber-500/8 border border-amber-500/25 rounded-xl flex items-center gap-2 shrink-0">
          <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[12px] text-amber-300/80 flex-1 truncate">{pinnedMsg.text}</span>
          <button onClick={() => handlePin(pinnedMsg.id)} className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {banned && (
        <div className="mx-4 mt-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-sm text-red-400 shrink-0">
          <VolumeX className="w-4 h-4 shrink-0" /><span>Votre compte a été banni.</span>
        </div>
      )}
      {muted && !banned && (
        <div className="mx-4 mt-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-sm text-amber-400 shrink-0">
          <VolumeX className="w-4 h-4 shrink-0" /><span>Vous êtes muté.</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">

          {hasScene && <ScenePanel salonId={currentSalon || ''} members={sceneMembers} micActive={micActive} userMicLevel={micLevel} />}

          {/* Zone messages avec scroll intelligent */}
          <div ref={scrollRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
            {!searchQuery && (
              <div className="text-center text-[10px] text-muted-foreground/40 py-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-border" /><span>Aujourd'hui</span><div className="flex-1 h-px bg-border" />
              </div>
            )}
            {visibleMessages.map((msg, index) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 30}ms` }}>
                <MessageBubble
                  message={msg}
                  onReact={handleReact}
                  onDelete={handleDelete}
                  onPin={handlePin}
                  onViewProfile={handleViewProfile}
                  onReply={handleReply}
                />
              </div>
            ))}
            {searchQuery && visibleMessages.filter(m => !m.is_system).length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground/40">
                <Search className="w-8 h-8" />
                <p className="text-xs">Aucun message trouvé pour « {searchQuery} »</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bouton scroll bas + compteur nouveaux messages */}
          {!isAtBottom && (
            <button onClick={scrollToBottom}
              className="absolute bottom-24 right-6 flex items-center gap-2 bg-primary text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-primary/80 transition-all z-10">
              <ChevronDown className="w-3.5 h-3.5" />
              {unreadNew > 0 ? `${unreadNew} nouveau${unreadNew > 1 ? 'x' : ''}` : 'Bas'}
            </button>
          )}

          <TypingIndicator names={typing} />

          <ChatInput
            onSend={handleSend}
            onTyping={handleTyping}
            disabled={banned || muted || undefined}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            members={allMembers}
          />
        </div>

        {/* Panneau membres */}
        {showMembers && (
          <div className="w-[180px] border-l border-border bg-card flex flex-col shrink-0">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">Membres ({allMembers.length})</span>
              <button onClick={() => setShowMembers(false)} className="text-muted-foreground/40 hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {allMembers.map((m, i) => (
                <button key={m.name + i} onClick={() => handleViewProfile(m.name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors text-left">
                  <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold border shrink-0
                    ${m.avatar==='av1'?'bg-purple-900 text-purple-200 border-purple-500':m.avatar==='av2'?'bg-emerald-900 text-emerald-300 border-emerald-500':m.avatar==='av3'?'bg-red-900 text-red-300 border-red-500':m.avatar==='av4'?'bg-blue-900 text-blue-300 border-blue-500':m.avatar==='av5'?'bg-amber-900 text-amber-300 border-amber-500':'bg-pink-900 text-pink-300 border-pink-500'}`}>
                    {m.initials}
                  </div>
                  <span className="text-[11px] text-muted-foreground/80 truncate flex-1">{m.name}</span>
                  {(m as any).speaking && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ReactionPicker
        position={reactionPicker}
        onSelect={(emoji) => { if (reactionPicker) { handleReact(reactionPicker.msgId, null, emoji); setReactionPicker(null); } }}
        onClose={() => setReactionPicker(null)}
      />

      {levelUp && <LevelUpToast level={levelUp} onDone={() => setLevelUp(null)} />}

      {viewProfile && (
        <UserProfileView
          targetName={viewProfile}
          onClose={() => setViewProfile(null)}
          onOpenDM={(name) => { setViewProfile(null); onOpenDM?.(name); }}
        />
      )}
    </div>
  );
}
