import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Trash2 } from 'lucide-react';
import { useUser } from '@/lib/contexts';
import { hasStaffAccess, hasAdminAccess } from '@/lib/utils/founderCheck';
import { staffChatService, type StaffMessage } from '@/lib/staffChatService';
import { supabase } from '@/lib/supabase';

interface Props {
  onClose: () => void;
}

export default function StaffChatPanel({ onClose }: Props) {
  const { user, supabaseUser } = useUser();
  const canStaff = hasStaffAccess(user);
  const canAdmin = hasAdminAccess(user);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1900] p-4">
      <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-md h-[70vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-red-500/[0.06]">
          <MessageSquare className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-foreground flex-1">Espace staff</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

        <div className="p-2 border-t border-border flex gap-2">
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
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
