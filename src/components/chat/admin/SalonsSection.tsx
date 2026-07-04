import React, { useState } from 'react';
import { DoorOpen, Plus, Trash2, Lock } from 'lucide-react';
import { useSalons } from '@/lib/contexts';
import { SALONS, SALON_TYPES, SALON_EMOJIS_LIST } from '@/lib/chatConfig';
import { SectionTitle } from './AdminComponents';

interface Props { readOnly?: boolean; }

export default function SalonsSection({ readOnly = false }: Props) {
  const { customSalons, addSalon, deleteSalon, hiddenSalons, setHiddenSalons } = useSalons();
  const [form, setForm] = useState({ name: '', type: 'chat vocal', emoji: '💬', welcome: '', isPrivate: false, password: '' });
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (readOnly) return;
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    if (form.isPrivate && !form.password.trim()) { setError('Le mot de passe est requis pour un salon privé.'); return; }
    const id = 'custom_' + Date.now();
    addSalon({
      id,
      name: form.name.trim(),
      type: form.type,
      emoji: form.emoji,
      welcome: form.welcome.trim() || `Bienvenue dans ${form.name.trim()} !`,
      isPrivate: form.isPrivate,
      password: form.isPrivate ? form.password.trim() : undefined
    } as any);
    setForm({ name: '', type: 'chat vocal', emoji: '💬', welcome: '', isPrivate: false, password: '' });
    setError('');
  };

  const handleRestoreSalon = (id: string) => {
    if (readOnly) return;
    setHiddenSalons(prev => prev.filter(s => s !== id));
  };

  return (
    <div>
      <SectionTitle icon={DoorOpen}>Gestion des salons</SectionTitle>

      {/* Formulaire création */}
      <div className={`bg-secondary border border-border rounded-xl p-4 mb-5 ${readOnly ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Créer un salon
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom du salon..."
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40 col-span-2" />
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40">
            {(SALON_TYPES || ['chat', 'vocal', 'chat vocal', 'video']).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-red-500/40">
            {(SALON_EMOJIS_LIST || ['💬','🎵','🎸','🎤','⚡','🧠','👋','🌈','💙','🚪','😤','📹','🍷']).map(em => <option key={em} value={em}>{em}</option>)}
          </select>
          <input value={form.welcome} onChange={e => setForm(f => ({ ...f, welcome: e.target.value }))}
            placeholder="Message de bienvenue (optionnel)..."
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40 col-span-2" />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" id="isPrivate" checked={form.isPrivate}
            onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))}
            className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary/50" />
          <label htmlFor="isPrivate" className="text-xs text-foreground">Salon privé (mot de passe requis)</label>
        </div>

        {form.isPrivate && (
          <div className="mb-2">
            <input type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mot de passe..."
              className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40 w-full" />
          </div>
        )}

        {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}

        <button onClick={handleCreate} className="w-full bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-red-500/20 transition-colors">
          Créer le salon
        </button>
      </div>

      {/* Liste des salons personnalisés */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Salons personnalisés</div>
      {customSalons?.length === 0 && <p className="text-[11px] text-muted-foreground/40 italic mb-4">Aucun salon personnalisé.</p>}
      <div className="space-y-1.5 mb-5">
        {customSalons?.map(s => (
          <div key={s.id} className="flex items-center gap-2.5 bg-secondary border border-border rounded-xl px-3 py-2">
            <span className="text-lg">{s.emoji || '💬'}</span>
            <span className="text-xs text-foreground flex-1 truncate">{s.name}</span>
            {s.isPrivate && <Lock className="w-3 h-3 text-amber-400" />}
            <button
              onClick={() => !readOnly && deleteSalon(s.id)}
              disabled={readOnly}
              className="text-muted-foreground/40 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Salons supprimés */}
      {hiddenSalons?.length > 0 && (
        <>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Salons supprimés</div>
          <div className="space-y-1.5">
            {hiddenSalons.map(id => {
              const salon = SALONS.find(s => s.id === id);
              if (!salon) return null;
              return (
                <div key={id} className="flex items-center gap-2.5 bg-secondary/50 border border-border/50 rounded-xl px-3 py-2">
                  <span className="text-lg opacity-50">{salon.emoji || '💬'}</span>
                  <span className="text-xs text-muted-foreground/60 flex-1 truncate">{salon.name}</span>
                  <button
                    onClick={() => handleRestoreSalon(id)}
                    disabled={readOnly}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Restaurer
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
