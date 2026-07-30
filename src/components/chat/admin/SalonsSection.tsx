import React, { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Plus, Trash2, Lock, Pencil, ChevronUp, ChevronDown, Save, X } from 'lucide-react';
import { SALONS, SALON_TYPES, SALON_EMOJIS_LIST } from '@/lib/chatConfig';
import { SectionTitle } from './AdminComponents';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useUser } from '@/lib/contexts';
import { isSalonCreator, mergeAndSortSalons } from '@/lib/salonUtils';

interface SalonItem {
  id: string;
  name: string;
  emoji?: string;
  type?: string;
  welcome?: string;
  description?: string;
  isPrivate?: boolean;
  password?: string;
  created_by?: string;
  sort_order?: number;
  category_id?: string;
  subcategory?: string;
}

interface Props {
  readOnly?: boolean;
  customSalons: SalonItem[];
  addSalon: (salon: SalonItem) => void;
  updateSalon: (id: string, updates: Partial<SalonItem>) => Promise<void>;
  deleteSalon: (id: string) => void;
  reorderSalons: (orderedIds: string[]) => Promise<void>;
  displayOrder: Record<string, number>;
  hiddenSalons: string[];
  setHiddenSalons: React.Dispatch<React.SetStateAction<string[]>>;
}

const emptyForm = { name: '', type: 'chat', emoji: '💬', welcome: '', description: '', isPrivate: false, password: '' };

export default function SalonsSection({
  readOnly = false,
  customSalons,
  addSalon,
  updateSalon,
  deleteSalon,
  reorderSalons,
  displayOrder,
  hiddenSalons,
  setHiddenSalons,
}: Props) {
  const { user } = useUser();
  const { can, isAdmin } = usePermissions();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canReorder, setCanReorder] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    void Promise.all([
      can('salons', 'create_custom'),
      can('salons', 'edit_custom'),
      can('salons', 'reorder'),
      can('salons', 'delete_custom'),
    ]).then(([c, e, r, d]) => {
      setCanCreate(c);
      setCanEdit(e);
      setCanReorder(r);
      setCanDelete(d);
    });
  }, [can]);

  const ordered = useMemo(
    () => mergeAndSortSalons(customSalons || [], hiddenSalons || [], displayOrder || {}),
    [customSalons, hiddenSalons, displayOrder],
  );

  const customIds = useMemo(() => new Set((customSalons || []).map(s => s.id)), [customSalons]);

  const handleCreate = () => {
    if (readOnly || !canCreate) return;
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    if (form.isPrivate && !form.password.trim()) { setError('Le mot de passe est requis pour un salon privé.'); return; }
    const id = 'custom_' + Date.now();
    addSalon({
      id,
      name: form.name.trim(),
      type: form.type,
      emoji: form.emoji,
      welcome: form.welcome.trim() || `Bienvenue dans ${form.name.trim()} !`,
      description: form.description.trim(),
      isPrivate: form.isPrivate,
      password: form.isPrivate ? form.password.trim() : undefined,
      created_by: user?.name,
      sort_order: 1000 + (customSalons?.length || 0) * 10,
      category_id: 'libre',
      subcategory: 'Libre',
    });
    setForm(emptyForm);
    setError('');
  };

  const startEdit = (s: SalonItem) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name || '',
      type: s.type || 'chat',
      emoji: s.emoji || '💬',
      welcome: s.welcome || '',
      description: s.description || '',
      isPrivate: !!s.isPrivate,
      password: s.password || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId || readOnly) return;
    const salon = customSalons.find(s => s.id === editingId);
    const allowed = isAdmin || canEdit || isSalonCreator(salon || {}, user?.name);
    if (!allowed) return;
    if (!editForm.name.trim()) { setError('Le nom est requis.'); return; }
    await updateSalon(editingId, {
      name: editForm.name.trim(),
      type: editForm.type,
      emoji: editForm.emoji,
      welcome: editForm.welcome.trim(),
      description: editForm.description.trim(),
      isPrivate: editForm.isPrivate,
      password: editForm.isPrivate ? editForm.password.trim() : undefined,
    });
    setEditingId(null);
    setError('');
  };

  const move = async (salonId: string, direction: -1 | 1) => {
    if (readOnly || !(isAdmin || canReorder)) return;
    const ids = ordered.map(s => s.id);
    const idx = ids.indexOf(salonId);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    await reorderSalons(next);
  };

  const canEditSalon = (s: SalonItem) =>
    isAdmin || canEdit || isSalonCreator(s, user?.name);

  const canDeleteSalon = (s: SalonItem) =>
    isAdmin || canDelete || isSalonCreator(s, user?.name);

  const handleRestoreSalon = (id: string) => {
    if (readOnly) return;
    setHiddenSalons(prev => prev.filter(s => s !== id));
  };

  return (
    <div>
      <SectionTitle icon={DoorOpen}>Gestion des salons</SectionTitle>
      <p className="text-[11px] text-muted-foreground/60 mb-4 leading-relaxed">
        Créez, modifiez et réordonnez les salons. Le créateur d’un salon reçoit automatiquement
        les droits d’édition, de réordonnancement et de suppression sur ce salon.
      </p>

      <div className={`bg-secondary border border-border rounded-xl p-4 mb-5 ${readOnly || !canCreate ? 'opacity-50 pointer-events-none select-none' : ''}`}>
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
            {(SALON_EMOJIS_LIST || ['💬']).map(em => <option key={em} value={em}>{em}</option>)}
          </select>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description courte (optionnel)..."
            className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40 col-span-2" />
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

      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
        Tous les salons (ordre d’affichage)
      </div>
      <div className="space-y-1.5 mb-5">
        {ordered.map((s, index) => {
          const isCustom = customIds.has(s.id);
          const editing = editingId === s.id;
          return (
            <div key={s.id} className="bg-secondary border border-border rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={readOnly || !(isAdmin || canReorder) || index === 0}
                    onClick={() => void move(s.id, -1)}
                    className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20"
                    title="Monter"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || !(isAdmin || canReorder) || index === ordered.length - 1}
                    onClick={() => void move(s.id, 1)}
                    className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20"
                    title="Descendre"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-lg">{s.emoji || '💬'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground truncate flex items-center gap-1.5">
                    {s.name}
                    {!isCustom && <span className="text-[9px] text-muted-foreground/40 uppercase">intégré</span>}
                    {s.created_by && <span className="text-[9px] text-purple-300/70">par {s.created_by}</span>}
                  </div>
                  {s.description && <div className="text-[10px] text-muted-foreground/50 truncate">{s.description}</div>}
                </div>
                {s.isPrivate && <Lock className="w-3 h-3 text-amber-400" />}
                {isCustom && canEditSalon(s) && (
                  <button
                    type="button"
                    onClick={() => (editing ? setEditingId(null) : startEdit(s))}
                    disabled={readOnly}
                    className="text-muted-foreground/40 hover:text-blue-400 transition-colors disabled:opacity-30"
                    title="Modifier"
                  >
                    {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                )}
                {isCustom && canDeleteSalon(s) && (
                  <button
                    type="button"
                    onClick={() => !readOnly && deleteSalon(s.id)}
                    disabled={readOnly}
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors disabled:opacity-30"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {editing && (
                <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs col-span-2" placeholder="Nom" />
                  <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs">
                    {SALON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs">
                    {SALON_EMOJIS_LIST.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs col-span-2" placeholder="Description" />
                  <input value={editForm.welcome} onChange={e => setEditForm(f => ({ ...f, welcome: e.target.value }))}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs col-span-2" placeholder="Message de bienvenue" />
                  <label className="flex items-center gap-2 text-[11px] col-span-2">
                    <input type="checkbox" checked={editForm.isPrivate}
                      onChange={e => setEditForm(f => ({ ...f, isPrivate: e.target.checked }))} />
                    Privé
                  </label>
                  {editForm.isPrivate && (
                    <input type="password" value={editForm.password}
                      onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs col-span-2" placeholder="Mot de passe" />
                  )}
                  <button type="button" onClick={() => void saveEdit()}
                    className="col-span-2 flex items-center justify-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <Save className="w-3.5 h-3.5" /> Enregistrer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenSalons?.length > 0 && (
        <>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Salons masqués</div>
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
