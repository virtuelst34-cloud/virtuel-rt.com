import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smile, Send, X, Reply } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { useUser } from '@/lib/contexts';

export default function ChatInput({ onSend, onTyping, disabled = false, replyTo = null, onCancelReply = null, members = [] }) {
  const { profiles } = useUser();
  const [text, setText]               = useState('');
  const [showEmojis, setShowEmojis]   = useState(false);
  const [mentions, setMentions]       = useState([]); // suggestions @
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef  = useRef(null);
  const caretRef  = useRef(0);

  // Construire la liste des gens mentionnables
  const allNames = [...new Set([
    ...members.map(m => m.name),
    ...Object.keys(profiles),
  ])];

  // Détecter @ dans le texte
  const detectMention = useCallback((val, pos) => {
    const before = val.slice(0, pos);
    const match  =  before.match(/@([\p{L}\p{N}_]*)$/u);
    if (match) {
      const q = match[1].toLowerCase();
      const suggestions = allNames.filter(n => n.toLowerCase().startsWith(q) && n.toLowerCase() !== '').slice(0, 5);
      setMentionQuery(match[1]);
      setMentions(suggestions);
      setMentionIndex(0);
    } else {
      setMentions([]);
      setMentionQuery('');
    }
  }, [allNames]);

  const insertMention = useCallback((name) => {
    const pos    = caretRef.current;
    const before = text.slice(0, pos);
    const after  = text.slice(pos);
    const atPos  = before.lastIndexOf('@');
    const newText = before.slice(0, atPos) + `@${name} ` + after;
    setText(newText);
    setMentions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [text]);

  const handleChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    caretRef.current = pos;
    setText(val);
    detectMention(val, pos);
    onTyping?.();
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleKeyDown = (e) => {
    if (mentions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && mentions.length > 0)) {
        e.preventDefault(); insertMention(mentions[mentionIndex]); return;
      }
      if (e.key === 'Escape') { setMentions([]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), null, replyTo || null);
    setText('');
    setMentions([]);
    if (onCancelReply) onCancelReply();
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
  };

  // Focus auto quand replyTo change
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  return (
    <div className="border-t border-border bg-card px-4 py-2.5 shrink-0 relative">

      {/* Suggestions @ */}
      {mentions.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20 min-w-[180px]">
          {mentions.map((name, i) => (
            <button key={name} onClick={() => insertMention(name)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors ${i === mentionIndex ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-foreground'}`}>
              <span className="text-primary font-bold">@</span>{name}
            </button>
          ))}
        </div>
      )}

      {/* Réponse en cours */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-secondary border border-border rounded-xl">
          <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-primary font-semibold">Réponse à {replyTo.author_name}</span>
            <p className="text-[11px] text-muted-foreground/60 truncate">{replyTo.text}</p>
          </div>
          <button onClick={onCancelReply} className="text-muted-foreground/40 hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showEmojis && !disabled && (
        <EmojiPicker onSelect={em => { setText(p => p + em); inputRef.current?.focus(); }} onClose={() => setShowEmojis(false)} />
      )}

      <div className={`flex items-end gap-2 bg-secondary border rounded-xl px-2 py-1.5 transition-colors ${disabled ? 'opacity-50 border-border' : 'border-white/10 focus-within:border-primary/50'}`}>
        <button onClick={(e) => { e.stopPropagation(); if (!disabled) setShowEmojis(!showEmojis); }}
          disabled={disabled}
          className="p-1.5 rounded-lg text-muted-foreground/60 hover:bg-white/[0.06] hover:text-muted-foreground transition-colors disabled:pointer-events-none">
          <Smile className="w-4 h-4" />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={e => { caretRef.current = e.target.selectionStart; }}
          disabled={disabled}
          placeholder={disabled ? 'Vous ne pouvez pas envoyer de messages.' : 'Envoyer un message... (@ pour mentionner)'}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/40 resize-none min-h-[22px] max-h-[120px] leading-relaxed py-0.5 disabled:cursor-not-allowed"
          style={{ height: 'auto' }}
        />
        <button onClick={handleSend} disabled={!text.trim() || disabled}
          className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 disabled:bg-secondary disabled:text-muted-foreground/40 hover:bg-primary/80 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
