import React, { useState } from 'react';
import { useChat } from '@/lib/ChatContext';
import Avatar from './Avatar';

const AVATARS = ['av1', 'av2', 'av3', 'av4', 'av5', 'av6'];

export default function UsernameModal() {
  const { login } = useChat();
  const [name, setName] = useState('');
  const [selectedAv, setSelectedAv] = useState('av1');
  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : '??';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    login(name.trim(), selectedAv, name.trim().slice(0, 2).toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
      <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-3xl p-8 w-full max-w-[360px] flex flex-col gap-6 shadow-[0_32px_64px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary/25">
            V
          </div>
          <h2 className="text-lg font-bold text-foreground">Bienvenue sur Virtuel-ST</h2>
          <p className="text-sm text-muted-foreground mt-1">Choisissez un pseudo et un avatar pour commencer</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {AVATARS.map(av => (
            <button key={av} type="button" onClick={() => setSelectedAv(av)}
              className={`rounded-full transition-all duration-200 ${selectedAv === av ? 'ring-4 ring-primary/50 scale-110 shadow-lg shadow-primary/25' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}>
              <Avatar avatarClass={av} initials={initials} size="lg" />
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre pseudo..."
            maxLength={20} autoFocus
            className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
          <div className="flex justify-between text-[10px] text-muted-foreground/40">
            <span>3-20 caractères</span>
            <span>{name.length}/20</span>
          </div>
        </div>
        <button type="submit" disabled={!name.trim() || name.trim().length < 3}
          className="w-full bg-gradient-to-r from-primary to-purple-600 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]">
          Entrer dans le chat
        </button>
      </form>
    </div>
  );
}
