import React, { useState, useEffect } from 'react';
import { UserCircle2, Save, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { SectionTitle } from './AdminComponents';
import { hasAdminAccess } from '@/lib/utils/founderCheck';
import {
  ALL_STAFF_PROFILE_ROLES,
  DEFAULT_STAFF_PROFILE_ACTIONS,
  STAFF_PROFILE_ACTION_META,
  STAFF_PROFILE_ROLE_LABELS,
  loadStaffProfileActions,
  saveStaffProfileActions,
  type StaffProfileActionId,
  type StaffProfileActionsSettings,
  type StaffProfileRole,
} from '@/lib/staffProfileActions';

interface Props {
  readOnly?: boolean;
  user: any;
}

const ACTION_IDS = Object.keys(STAFF_PROFILE_ACTION_META) as StaffProfileActionId[];

export default function StaffProfileActionsSection({ readOnly = false, user }: Props) {
  const [settings, setSettings] = useState<StaffProfileActionsSettings>(DEFAULT_STAFF_PROFILE_ACTIONS);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const canModify = hasAdminAccess(user, readOnly);

  useEffect(() => {
    setSettings(loadStaffProfileActions());
  }, []);

  const updateAction = (id: StaffProfileActionId, patch: Partial<StaffProfileActionsSettings[StaffProfileActionId]>) => {
    setSettings((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
    setHasChanges(true);
    setSavedFlash(false);
  };

  const toggleRole = (id: StaffProfileActionId, role: StaffProfileRole) => {
    const current = settings[id].roles;
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    updateAction(id, { roles: next.length ? next : current });
  };

  const save = () => {
    saveStaffProfileActions(settings);
    setHasChanges(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const reset = () => {
    setSettings({ ...DEFAULT_STAFF_PROFILE_ACTIONS });
    setHasChanges(true);
    setSavedFlash(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <SectionTitle icon={UserCircle2}>Profils / Actions staff</SectionTitle>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Choisissez quelles actions apparaissent sur la fiche profil d’un utilisateur, et quels rôles staff peuvent les utiliser.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={!canModify}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-white/[0.04] transition-colors flex items-center gap-2 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Défaut
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canModify || !hasChanges}
            className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {savedFlash ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {ACTION_IDS.map((id) => {
          const meta = STAFF_PROFILE_ACTION_META[id];
          const cfg = settings[id];
          return (
            <div
              key={id}
              className="rounded-xl border border-border bg-secondary/40 px-3 py-3 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{meta.label}</div>
                  <p className="text-[11px] text-muted-foreground/70">{meta.description}</p>
                </div>
                <button
                  type="button"
                  disabled={!canModify}
                  onClick={() => updateAction(id, { enabled: !cfg.enabled })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs shrink-0 transition-all ${
                    !canModify
                      ? 'opacity-40 cursor-not-allowed'
                      : cfg.enabled
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/25 text-red-400'
                  }`}
                >
                  {cfg.enabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  {cfg.enabled ? 'Visible' : 'Masqué'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STAFF_PROFILE_ROLES.map((role) => {
                  const on = cfg.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={!canModify || !cfg.enabled}
                      onClick={() => toggleRole(id, role)}
                      className={`px-2 py-1 rounded-md text-[10px] border transition-colors ${
                        !canModify || !cfg.enabled
                          ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                          : on
                            ? 'bg-primary/15 border-primary/35 text-primary'
                            : 'bg-white/5 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {STAFF_PROFILE_ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/50">
        Le fondateur contourne toujours les restrictions de rôles. Les permissions Admin (mute, ban, badges, premium) restent en vigueur.
      </p>
    </div>
  );
}
