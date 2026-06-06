import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useModeration, useNotifications, useXP, useDM } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { Send, X, MessageSquare, Search } from 'lucide-react';
import { format } from 'date-fns';

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground/50 italic">
      <span className="flex gap-0.5">
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </span>
      est en train d'écrire...
    </div>
  );
}

export default function DirectMessagePanel({ onClose, initialUser }) {
  const { user, profiles } = useUser();
  const { addNotification } = useNotifications();
  const { isBlocked } = useModeration();
  const { sounds } = useXP();
  const { sendDM, getConversation, markRead, getUnreadCount } = useDM();

  const [selectedUser, setSelectedUser] = useState(initialUser || null);
  const [text, setText]                 = useState('');
  const [search, setSearch]             = useState('');
  const [remoteTyping, setRemoteTyping] = useState(false);
  const messagesEndRef  = useRef(null);
  const typingTimerRef  = useRef(null);
  const inputRef        = useRef(null);

  // Scroll en bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, remoteTyping, getConversation(user?.name || '', selectedUser || '')?.length]);

  // Marquer comme lu quand on ouvre la conversation
  useEffect(() => {
    if (selectedUser && user) markRead(user.name, selectedUser);
  }, [selectedUser, user, markRead]);

  useEffect(() => () => clearTimeout(typingTimerRef.current), []);

  // Focus input quand on sélectionne un contact
  useEffect(() => {
    if (selectedUser) setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectedUser]);

  const simulateTyping = () => {
    setRemoteTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setRemoteTyping(false), 2500);
  };

  const contacts = Object.values(profiles).filter(p => p.name !== user?.name && !isBlocked(p.name));
  const filteredContacts = contacts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const unreadFor = useCallback((name) => {
    if (!user) return 0;
    return getConversation(user.name, name).filter(m => !m.is_read && m.sender_name !== user.name).length;
  }, [user, getConversation]);

  const handleSend = () => {
    if (!text.trim() || !selectedUser || !user) return;
    sendDM(user, selectedUser, text.trim());
    addNotification({ type: 'dm', message: `💬 Message envoyé à ${selectedUser}` });
    sounds?.dm();
    setText('');
    simulateTyping();
  };

  // Notification push navigateur
  const sendPushNotification = useCallback((fromName, msg) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(`Message de ${fromName}`, { body: msg, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(`Message de ${fromName}`, { body: msg, icon: '/favicon.ico' });
      });
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const messages = user && selectedUser ? getConversation(user.name, selectedUser) : [];
  const contact  = selectedUser ? (profiles[selectedUser] || { name: selectedUser, avatar: 'av1', initials: selectedUser.slice(0,2).toUpperCase(), level: 1 }) : null;
  const totalUnread = user ? getUnreadCount(user.name) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1500]" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-[700px] max-w-[96vw] h-[540px] flex overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}>

        {/* Sidebar contacts */}
        <div className="w-[210px] bg-secondary border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" /> Messages
              {totalUnread > 0 && (
                <span className="text-[9px] bg-primary text-white rounded-full px-1.5 py-px font-bold">{totalUnread}</span>
              )}
            </span>
            <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-2 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1">
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
            ) : filteredContacts.map(u => {
              const unread = unreadFor(u.name);
              const lastMsg = user ? getConversation(user.name, u.name).at(-1) : null;
              return (
                <button key={u.name} onClick={() => setSelectedUser(u.name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left ${selectedUser === u.name ? 'bg-primary/15 border-r-2 border-primary' : 'hover:bg-white/[0.04]'}`}>
                  <div className="relative shrink-0">
                    <Avatar avatarClass={u.avatar || 'av1'} initials={u.initials || u.name.slice(0,2).toUpperCase()} size="sm" />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-medium truncate ${unread > 0 ? 'text-foreground' : 'text-muted-foreground/80'}`}>{u.name}</span>
                      <DiamondBadge level={u.level || 1} size="xs" />
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${unread > 0 ? 'text-foreground/60 font-medium' : 'text-muted-foreground/40'}`}>
                      {lastMsg ? lastMsg.text : `Nv.${u.level || 1}`}
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
                <Avatar avatarClass={contact.avatar || 'av1'} initials={contact.initials || contact.name.slice(0,2).toUpperCase()} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{contact.name}</span>
                    <DiamondBadge level={contact.level || 1} size="xs" />
                  </div>
                  <div className="text-[10px] text-muted-foreground/50">
                    {remoteTyping
                      ? <span className="text-emerald-400 italic">est en train d'écrire...</span>
                      : contact.status === 'online' ? <span className="text-emerald-400">En ligne</span> : `Nv.${contact.level || 1}`
                    }
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground/40 mt-16">
                    <MessageSquare className="w-8 h-8" />
                    <p className="text-xs">Démarrez une conversation avec {selectedUser}</p>
                  </div>
                ) : messages.map(msg => {
                  const isOwn = msg.sender_name === user?.name;
                  return (
                    <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && <Avatar avatarClass={msg.sender_avatar} initials={msg.sender_initials} size="xs" />}
                      <div className={`max-w-[65%] px-3 py-2 text-[13px] rounded-xl leading-relaxed break-words ${isOwn ? 'bg-purple-700/30 border border-purple-500/30 rounded-br-sm' : 'bg-secondary border border-border rounded-bl-sm'}`}>
                        <span className="text-foreground">{msg.text}</span>
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
                <div className="flex items-center gap-2 bg-secondary border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-primary/50 transition-colors">
                  <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={`Message à ${selectedUser}...`} rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/40 resize-none min-h-[22px] max-h-[80px] leading-relaxed py-0.5"
                    style={{ height: 'auto' }}
                    onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; }} />
                  <button onClick={handleSend} disabled={!text.trim()}
                    className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 disabled:bg-secondary disabled:text-muted-foreground/40 hover:bg-primary/80 transition-colors">
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
