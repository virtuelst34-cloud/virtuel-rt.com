import React, { useEffect, useState } from 'react';
import { Folders, Plus, Trash2, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { SectionTitle } from './AdminComponents';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useSalons } from '@/lib/contexts';
import type { SalonCategoryState } from '@/lib/contexts/SalonsContext';

interface Props {
  readOnly?: boolean;
}

const emptyForm = {
  id: '',
  name: '',
  emoji: '💬',
  description: '',
  subcategories: '',
  isCoquin: false,
};

export default function CategoriesSection({ readOnly = false }: Props) {
  const { categories, upsertCategory, deleteCategory } = useSalons();
  const { can, isAdmin } = usePermissions();
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void can('salons', 'manage_categories').then(ok => setCanManage(ok || isAdmin));
  }, [can, isAdmin]);

  const ordered = [...(categories || [])].sort((a, b) => a.sort_order - b.sort_order);

  const slugify = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || `cat_${Date.now()}`;

  const handleSave = async () => {
    if (readOnly || !canManage) return;
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    const id = (editingId || form.id || slugify(form.name)).trim();
    const payload: SalonCategoryState = {
      id,
      name: form.name.trim(),
      emoji: form.emoji || '💬',
      description: form.description.trim(),
      sort_order: editingId
        ? (ordered.find(c => c.id === editingId)?.sort_order ?? ordered.length * 10)
        : ordered.length * 10,
      subcategories: form.subcategories
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      isCoquin: form.isCoquin,
    };
    await upsertCategory(payload);
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const startEdit = (c: SalonCategoryState) => {
    setEditingId(c.id);
    setForm({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      description: c.description || '',
      subcategories: (c.subcategories || []).join(', '),
      isCoquin: !!c.isCoquin,
    });
  };

  const move = async (categoryId: string, direction: -1 | 1) => {
    if (readOnly || !canManage) return;
    const ids = ordered.map(c => c.id);
    const idx = ids.indexOf(categoryId);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const a = ordered[idx];
    const b = ordered[swap];
    await upsertCategory({ ...a, sort_order: b.sort_order });
    await upsertCategory({ ...b, sort_order: a.sort_order });
  };

  return (
    <div>
      <SectionTitle icon={Folders}>Catégories de salons</SectionTitle>
      <p className="text-[11px] text-muted-foreground/60 mb-4 leading-relaxed">
        Organisez la sidebar par thèmes. Les salons coquins restent masqués hors Mode coquin Premium.
      </p>

      <div className={`bg-secondary border border-border rounded-xl p-4 mb-5 ${readOnly || !canManage ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {editingId ? 'Modifier' : 'Créer'} une catégorie
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom (ex. Divertissement)"
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs col-span-2"
          />
          {!editingId && (
            <input
              value={form.id}
              onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              placeholder="ID technique (optionnel)"
              className="bg-background border border-border rounded-lg px-3 py-2 text-xs col-span-2"
            />
          )}
          <input
            value={form.emoji}
            onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            placeholder="Emoji"
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs"
          />
          <label className="flex items-center gap-2 text-[11px] px-1">
            <input
              type="checkbox"
              checked={form.isCoquin}
              onChange={e => setForm(f => ({ ...f, isCoquin: e.target.checked }))}
            />
            Catégorie coquine (Premium)
          </label>
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description"
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs col-span-2"
          />
          <input
            value={form.subcategories}
            onChange={e => setForm(f => ({ ...f, subcategories: e.target.value }))}
            placeholder="Sous-thèmes (séparés par des virgules)"
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs col-span-2"
          />
        </div>
        {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" /> {editingId ? 'Enregistrer' : 'Créer'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm(emptyForm); setError(''); }}
              className="px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {ordered.map((c, index) => (
          <div key={c.id} className="bg-secondary border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" disabled={readOnly || !canManage || index === 0} onClick={() => void move(c.id, -1)} className="p-0.5 text-muted-foreground/50 disabled:opacity-20">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" disabled={readOnly || !canManage || index === ordered.length - 1} onClick={() => void move(c.id, 1)} className="p-0.5 text-muted-foreground/50 disabled:opacity-20">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-lg">{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground flex items-center gap-1.5">
                {c.name}
                {c.isCoquin && <span className="text-[8px] px-1.5 py-px rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">18+</span>}
              </div>
              <div className="text-[10px] text-muted-foreground/50 truncate">
                {(c.subcategories || []).join(' · ') || 'Aucun sous-thème'}
              </div>
            </div>
            <button type="button" disabled={readOnly || !canManage} onClick={() => startEdit(c)} className="text-[10px] text-blue-400 disabled:opacity-30">
              Éditer
            </button>
            <button
              type="button"
              disabled={readOnly || !canManage || c.id === 'general' || c.id === 'coquin'}
              onClick={() => void deleteCategory(c.id)}
              className="text-muted-foreground/40 hover:text-red-400 disabled:opacity-20"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
