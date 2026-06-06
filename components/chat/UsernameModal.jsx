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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-7 w-[320px] flex flex-col gap-5 shadow-2xl">
        <h2 className="text-base font-semibold text-foreground">Bienvenue sur Virtuel-ST</h2>
        <p className="text-sm text-muted-foreground -mt-2">Choisissez un pseudo et un avatar pour commencer.</p>
        <div className="flex gap-2 flex-wrap">
          {AVATARS.map(av => (
            <button key={av} type="button" onClick={() => setSelectedAv(av)}
              className={`rounded-full transition-all ${selectedAv === av ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}>
              <Avatar avatarClass={av} initials={initials} size="lg" />
            </button>
          ))}
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre pseudo..."
          maxLength={20} autoFocus
          className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors" />
        <button type="submit" disabled={!name.trim()}
          className="premium-gradient rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90">
          Entrer dans le chat
        </button>
      </form>
    </div>
  );
}
