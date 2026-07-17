import React, { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { useUser, useSalons, useXP, useModeration, useMessages, useNotifications, useMuteBlock, useTyping } from '@/lib/contexts';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { SALONS } from '@/lib/chatConfig';
import { Message } from '@/lib/searchUtils';
import Avatar from './Avatar';
import ChatInput from './ChatInput';
import ReactionPicker from './ReactionPicker';
import LevelUpToast from './LevelUpToast';
import ScenePanel from './ScenePanel';
import QuizPanel from './QuizPanel';
import UserProfileView from './UserProfileView';
import { FilterPanel } from './FilterPanel';
import { ExportPanel } from './ExportPanel';
import { ReportPanel } from './ReportPanel';
import TypingIndicator from './TypingIndicator';
import MembersPanel from './MembersPanel';
import MessageBubble from './MessageBubble';
import OfflineBanner from './OfflineBanner';
import VirtualMessageList from './VirtualMessageList';
import { presenceService } from '@/lib/presenceService';
import { recordMessageSent, recordReaction, recordMention } from '@/lib/userActivity';
import { uploadChatMedia, uploadChatFile } from '@/lib/storageService';
import { supabaseDbService } from '@/lib/supabaseDb';
import { mediaBroadcastService } from '@/lib/mediaBroadcastService';
import { Users, Search, VolumeX, X, ArrowLeft, Pin, ChevronDown, Filter as FilterIcon, Download } from 'lucide-react';

interface JoinToastProps {
  name: string;
  onDone: () => void;
}

function JoinToast({ name, onDone }: JoinToastProps) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 animate-fade-in-down">
      <div className="bg-primary/20 border border-primary/40 text-primary text-xs px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 shadow-lg">
        ?? <span className="font-medium">{name}</span> a rejoint le salon
      </div>
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
  const { isMuted: isLocallyMuted, isBlocked: isLocallyBlocked } = useMuteBlock();
  const { getTypingUsers } = useTyping();
  const { can, isAdmin } = usePermissions();
  const { getMessages, addMessage, deleteMessage, pinMessage, updateMessage, updateReaction, setCurrentSalonId, loadMoreMessages, isLoadingHistory } = useMessages();
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
  const [typing, setTypingLocal]                 = useState<string[]>([]);
  const [viewProfile, setViewProfile]       = useState<string | null>(null);
  const [replyTo, setReplyTo]               = useState<any>(null);
  const [isAtBottom, setIsAtBottom]         = useState(true);
  const [unreadNew, setUnreadNew]           = useState(0);
  const [showFilter, setShowFilter]         = useState(false);
  const [filteredMessages, setFilteredMessages] = useState<Message[] | null>(null);
  const [showExport, setShowExport]         = useState(false);
  const [showReport, setShowReport]         = useState(false);
  const [salonWelcome, setSalonWelcome] = useState<string | null>(null);
  const [reportTarget, setReportTarget]     = useState<{ id: string; type: 'message' | 'user'; name?: string; content?: string } | null>(null);
  const [, setPresenceTick]                 = useState(0);
  const [remoteMic, setRemoteMic]           = useState<Record<string, { active: boolean; level: number }>>({});

  const allSalons    = [...SALONS, ...(customSalons || [])].filter(s => !(hiddenSalons || []).includes(s.id));
  const salon        = allSalons.find(s => s.id === currentSalon);
  const onlineUsers  = currentSalon
    ? presenceService.getOnlineUsersInSalon(currentSalon).filter(u => !isLocallyMuted(u.name) && !isLocallyBlocked(u.name))
    : [];
  const hasScene     = salon?.type === 'vocal' || salon?.type === 'chat vocal' || salon?.type === 'video';
  const messages     = currentSalon ? getMessages(currentSalon) : [];
  const pinnedMsg    = messages.find(m => m.pinned);

  // Demander permission push au montage
  useEffect(() => { requestPushPermission(); }, []);

  useEffect(() => {
    return presenceService.subscribe(() => {
      setPresenceTick(tick => tick + 1);
    });
  }, []);

  useEffect(() => {
    if (!currentSalon) return;
    return mediaBroadcastService.subscribe(currentSalon, (payload) => {
      setRemoteMic(prev => ({
        ...prev,
        [payload.userName]: { active: payload.micActive, level: payload.level },
      }));
    });
  }, [currentSalon]);

  const sceneMembers = onlineUsers.map(u => {
    const remote = remoteMic[u.name];
    const speaking = u.name === user?.name
      ? micActive && micLevel > 8
      : !!(remote?.active && remote.level > 8);
    return {
      name: u.name,
      avatar: u.avatar || 'av1',
      initials: u.initials || u.name.slice(0, 2).toUpperCase(),
      speaking,
      micLevel: u.name === user?.name
        ? (micActive ? micLevel : 0)
        : (remote?.active ? remote.level : 0),
    };
  });
  useEffect(() => {
    window.location.hash = currentSalon ? `salon/${currentSalon}` : '';
  }, [currentSalon]);

  // Synchroniser le salon actif avec MessagesContext pour charger/souscrire les messages
  useEffect(() => {
    setCurrentSalonId(currentSalon);
  }, [currentSalon, setCurrentSalonId]);

  useEffect(() => {
    let active=true;
    if(!currentSalon){ setSalonWelcome(null); return; }
    import('../../lib/salonSettings').then(({getSalonSettings})=>{
      getSalonSettings(currentSalon).then((data:any)=>{
        if(active) setSalonWelcome(data?.welcome_enabled ? data?.welcome_message : null);
      });
    });
    return ()=>{active=false};
  }, [currentSalon]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('salon/')) {
      const id = hash.replace('salon/', '');
      const exists = SALONS.some(s => s.id === id) || customSalons.some(s => s.id === id);
      if (exists) setCurrentSalon(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSalons.length]);

  // Reset ?tat ? chaque changement de salon
  useEffect(() => {
    if (!salon) return;
    setSearchQuery(''); setSearchOpen(false); setShowMembers(false);
    setReplyTo(null); setUnreadNew(0); setIsAtBottom(true);
    prevMsgCountRef.current = messages.length;
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
        sendPush(`${last.author_name} vous a mentionn�`, last.text);
        addNotification({
          type: 'mention',
          message: `@ ${last.author_name} vous a mentionn� dans #${salon?.name}`,
          groupKey: `mention:${last.author_name}`,
        });
        recordMention(user.name);
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

  // D?tecter si l'utilisateur est en bas du scroll et charger plus de messages en haut
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadNew(0);
    
    // Charger plus de messages quand on est pr?s du haut
    if (el.scrollTop < 100 && currentSalon && !isLoadingHistory) {
      loadMoreMessages(currentSalon);
    }
  }, [currentSalon, loadMoreMessages, isLoadingHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadNew(0);
    setIsAtBottom(true);
  };

  const handleSend = useCallback(async (text: string, imageUrl: string | null, reply: any = null, file?: File | null) => {
    if (!user || !currentSalon) return;
    if (isUserBanned(user.name) || isUserMuted(user.name)) return;

    const ownerFolder = user.id || user.name || 'guest';
    let uploadedImageUrl: string | null = null;
    try {
      if (file) {
        uploadedImageUrl = await uploadChatFile(file, ownerFolder);
      } else {
        uploadedImageUrl = await uploadChatMedia(imageUrl, ownerFolder);
      }
    } catch (err) {
      addNotification({ type: 'block', message: err instanceof Error ? err.message : '?chec upload fichier' });
      return;
    }

    const newMsg = {
      id: Date.now().toString(),
      salon: currentSalon,
      author_name: user.name,
      author_avatar: user.avatar,
      author_initials: user.initials,
      text: text || '',
      image_url: uploadedImageUrl || '',
      reactions: {},
      replyTo: reply ? { id: reply.id, author_name: reply.author_name, text: reply.text, author_avatar: reply.author_avatar || '', author_initials: reply.author_initials || '', created_date: reply.created_date || '' } : undefined,
      created_date: new Date().toISOString(),
    };
    addMessage(currentSalon, newMsg);
    sounds?.message();
    setReplyTo(null);
    recordMessageSent(user.name, (achievement) => {
      addNotification({ type: 'achievement', message: `${achievement.icon} Succ?s d?bloqu? : ${achievement.name}` });
    });
    const newLevel = await awardXP();
    if (newLevel) setLevelUp(newLevel);
  }, [user, currentSalon, isUserBanned, isUserMuted, addMessage, sounds, recordMessageSent, awardXP, addNotification]);

  const handleQuizAnswerPosted = useCallback((text: string) => {
    if (!currentSalon || currentSalon !== 'quiz') return;
    addMessage(currentSalon, {
      id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      salon: currentSalon,
      author_name: 'Quiz',
      author_avatar: '',
      author_initials: 'QZ',
      text,
      reactions: {},
      created_date: new Date().toISOString(),
      is_system: true,
    });
  }, [currentSalon, addMessage]);

  const handleEdit = useCallback(async (messageId: string, newText: string) => {
    if (!user || !currentSalon) return;
    if (isUserBanned(user.name) || isUserMuted(user.name)) return;
    
    const messages = getMessages(currentSalon);
    const message = messages.find(m => m.id === messageId);
    
    if (!message || message.author_name !== user.name) return;
    
    // Update local state
    updateMessage(currentSalon, messageId, { 
      text: newText, 
      edited: true, 
      edited_at: new Date().toISOString() 
    });
  }, [user, currentSalon, isUserBanned, isUserMuted, getMessages, updateMessage]);

  const handleReact = useCallback((msgId: string, event: { clientX: number; clientY: number } | null, emoji?: string) => {
    if (emoji) {
      const msgs = currentSalon ? getMessages(currentSalon) : [];
      const msg  = msgs.find(m => m.id === msgId);
      if (!msg || !user) return;
      const reactions = { ...(msg.reactions || {}) };
      const users = [...(reactions[emoji] || [])];
      const idx = users.indexOf(user.name);
      if (idx >= 0) users.splice(idx, 1); else {
        users.push(user.name);
        recordReaction(user.name, (achievement) => {
          addNotification({ type: 'achievement', message: `${achievement.icon} Succ?s d?bloqu? : ${achievement.name}` });
        });
        if (msg.author_name !== user.name) {
          addNotification({
            type: 'dm',
            message: `${user.name} a r?agi ${emoji} ? votre message`,
            groupKey: `reaction:${msg.id}`,
          });
          void supabaseDbService.notifyUserByName(
            msg.author_name,
            'dm',
            `${user.name} a r?agi ${emoji} ? votre message`,
            `reaction:${msg.id}`,
          );
        }
      }
      if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users;
      if (currentSalon) updateReaction(currentSalon, msgId, reactions, user.name);
    } else if (event) {
      setReactionPicker({ msgId, x: event.clientX, y: event.clientY });
    }
  }, [currentSalon, getMessages, updateReaction, user]);

  const handleDelete = useCallback(async (msgId: string) => {
    if (!currentSalon || !user) return;
    const msg = getMessages(currentSalon).find(m => m.id === msgId);
    const canDelete = msg?.author_name === user.name || isAdmin || await can('chat', 'delete_any');
    if (!canDelete) {
      addNotification({ type: 'block', message: 'Permission insuffisante pour supprimer ce message.' });
      return;
    }
    deleteMessage(currentSalon, msgId);
  }, [currentSalon, deleteMessage, getMessages, user, isAdmin, can, addNotification]);
  const handlePin         = useCallback((msgId: string) => { if (currentSalon) pinMessage(currentSalon, msgId); }, [currentSalon, pinMessage]);
  const handleViewProfile = useCallback((name: string) => { if (name !== user?.name) setViewProfile(name); }, [user]);
  const handleReply       = useCallback((msg: any) => setReplyTo(msg), []);
  const handleReport      = useCallback((targetId: string, targetType: 'message' | 'user', targetName?: string, targetContent?: string) => {
    setReportTarget({ id: targetId, type: targetType, name: targetName, content: targetContent });
    setShowReport(true);
  }, []);

  const handleTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTypingLocal([]), 3000);
  };

  const typingUsers = currentSalon ? getTypingUsers(currentSalon) : [];

  if (!salon) return null;

  const banned = user && isUserBanned(user.name);
  const muted  = user && isUserMuted(user.name);

  const visibleMessages = (filteredMessages || messages).filter(msg => {
    if (msg.is_system) return true;
    if (isBlocked(msg.author_name)) return false;
    if (isLocallyMuted(msg.author_name) || isLocallyBlocked(msg.author_name)) return false;
    if (searchQuery.trim()) {
      return msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             msg.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Membres r?els du salon : membres sur sc?ne + profils connect?s (hors utilisateur courant)
  const realProfiles = Object.values(profiles || {})
    .filter(p => p.status !== 'offline' && p.name !== user?.name && !isLocallyMuted(p.name) && !isLocallyBlocked(p.name))
    .map(p => ({ name: p.name, avatar: p.avatar, initials: p.initials }));

  const allMembers = [
    ...sceneMembers,
    ...realProfiles,
  ].filter((m, i, arr) => arr.findIndex(x => x.name === m.name) === i);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">

      {joinToast && <JoinToast name={joinToast} onDone={() => setJoinToast(null)} />}
      <OfflineBanner />

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 shrink-0 bg-card">
        <button onClick={() => setCurrentSalon(null)}
          className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-colors" title="Retour">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-lg shrink-0">
          {salon.emoji || ({'musique60':'??','musique80':'??','karaoke':'??','debat':'?','quiz':'??','jeunes':'??','lgbt':'??','divorce':'??','libre':'??','insulte':'??','cameras':'??','bar':'??'})[currentSalon || ''] || '#'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{salon.name}</div>
          <div className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
            <span>{salon.type}</span>
            {salon.live && <span className="text-[9px] bg-red-600 text-red-100 rounded px-1.5 py-px font-semibold">LIVE</span>}
            <span className="text-muted-foreground/30">?</span>
            <span>{allMembers.length} membres</span>
          </div>
        </div>
        <button onClick={() => setSearchOpen(o => !o)}
          className={`p-1.5 rounded-lg border transition-colors ${searchOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground/60 hover:bg-white/5'}`}
          title="Rechercher" aria-label="Rechercher dans le salon">
          <Search className="w-4 h-4" />
        </button>
        <button onClick={() => setShowFilter(true)}
          className={`p-1.5 rounded-lg border transition-colors ${filteredMessages ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground/60 hover:bg-white/5'}`}
          title="Filtres" aria-label="Filtrer les messages">
          <FilterIcon className="w-4 h-4" />
        </button>
        <button onClick={() => setShowExport(true)}
          className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 transition-colors"
          title="Exporter" aria-label="Exporter les messages">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={() => setShowMembers(o => !o)}
          className={`p-1.5 rounded-lg border transition-colors ${showMembers ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground/60 hover:bg-white/5'}`}
          title="Membres" aria-label="Voir les membres du salon">
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
          {searchQuery && <p className="text-[10px] text-muted-foreground/40 mt-1 px-1">{visibleMessages.filter(m => !m.is_system).length} r?sultat(s)</p>}
        </div>
      )}

      {/* Message ?pingl? */}
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
          <VolumeX className="w-4 h-4 shrink-0" /><span>Votre compte a ?t? banni.</span>
        </div>
      )}
      {muted && !banned && (
        <div className="mx-4 mt-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-sm text-amber-400 shrink-0">
          <VolumeX className="w-4 h-4 shrink-0" /><span>Vous ?tes mut?.</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">

          {hasScene && <ScenePanel salonId={currentSalon || ''} members={sceneMembers} micActive={micActive} userMicLevel={micLevel} />}
          {currentSalon === 'quiz' && (
            <QuizPanel salonId={currentSalon} onAnswerPosted={handleQuizAnswerPosted} />
          )}

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
                  onEdit={handleEdit}
                  onViewProfile={handleViewProfile}
                  onReply={handleReply}
                  onReport={(id, name, content) => handleReport(id, 'message', name, content)}
                />
              </div>
            ))}
            {searchQuery && visibleMessages.filter(m => !m.is_system).length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground/40">
                <Search className="w-8 h-8" />
                <p className="text-xs">Aucun message trouv? pour ? {searchQuery} ?</p>
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

          <TypingIndicator />

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
        {showMembers && <MembersPanel onClose={() => setShowMembers(false)} onOpenDM={onOpenDM} />}
      </div>

      <ReactionPicker
        position={reactionPicker}
        salonId={currentSalon || undefined}
        onSelect={(emoji) => { if (reactionPicker) { handleReact(reactionPicker.msgId, null, emoji); setReactionPicker(null); } }}
        onClose={() => setReactionPicker(null)}
      />

      {levelUp && <LevelUpToast level={levelUp} onDone={() => setLevelUp(null)} />}

      {showFilter && (
        <FilterPanel
          messages={messages.map(m => ({ ...m, salon: currentSalon || '' })) as Message[]}
          onFilteredMessages={setFilteredMessages}
          onClose={() => setShowFilter(false)}
        />
      )}

      {showExport && (
        <ExportPanel
          messages={messages.map(m => ({ ...m, salon: currentSalon || '' })) as Message[]}
          salonName={salon.name}
          onClose={() => setShowExport(false)}
        />
      )}

      {showReport && reportTarget && (
        <ReportPanel
          onClose={() => setShowReport(false)}
          targetId={reportTarget.id}
          targetType={reportTarget.type}
          targetName={reportTarget.name}
          targetContent={reportTarget.content}
        />
      )}

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
