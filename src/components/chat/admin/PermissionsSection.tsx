import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/contexts';
import { Lock, Shield, Users, Check, X, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { SPECIAL_BADGES } from '@/lib/diamondBadges';

interface Permission {
  id: string;
  section: string;
  action: string;
  user_identifier: string;
  identifier_type: string;
  allowed: boolean;
}

interface SectionConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  actions: string[];
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'chat',
    name: 'Chat',
    description: 'Permissions pour les messages et conversations',
    icon: '💬',
    actions: ['read', 'write', 'delete_own', 'delete_any'],
  },
  {
    id: 'moderation',
    name: 'Modération',
    description: 'Permissions pour la gestion des utilisateurs et signalements',
    icon: '🔨',
    actions: ['view_reports', 'ban_users', 'mute_users', 'unblock_users'],
  },
  {
    id: 'admin',
    name: 'Administration',
    description: 'Permissions pour le panneau d\'administration',
    icon: '⚙️',
    actions: ['access_panel', 'manage_permissions', 'view_analytics'],
  },
  {
    id: 'settings',
    name: 'Paramètres',
    description: 'Permissions pour les paramètres utilisateur',
    icon: '🔧',
    actions: ['view_own', 'edit_own', 'edit_any'],
  },
  {
    id: 'salons',
    name: 'Salons',
    description: 'Permissions pour la gestion des salons',
    icon: '🚪',
    actions: ['view_all', 'create_custom', 'delete_custom'],
  },
  {
    id: 'badges',
    name: 'Badges',
    description: 'Permissions pour les badges',
    icon: '🏆',
    actions: ['view_all', 'assign_special'],
  },
  {
    id: 'xp',
    name: 'XP',
    description: 'Permissions pour le système d\'XP',
    icon: '⭐',
    actions: ['view_own', 'view_all', 'modify_any'],
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Permissions pour la gestion des messages système',
    icon: '📝',
    actions: ['view_settings', 'edit_settings', 'edit_limits'],
  },
  {
    id: 'security',
    name: 'Sécurité',
    description: 'Permissions pour les paramètres de sécurité',
    icon: '🔒',
    actions: ['view_settings', 'edit_settings', 'manage_bans', 'view_logs'],
  },
  {
    id: 'content',
    name: 'Contenu',
    description: 'Permissions pour la modération de contenu',
    icon: '🛡️',
    actions: ['view_settings', 'edit_settings', 'manage_filters', 'review_queue'],
  },
  {
    id: 'logs',
    name: 'Logs',
    description: 'Permissions pour les logs et audit',
    icon: '📊',
    actions: ['view_logs', 'export_logs', 'manage_settings'],
  },
];

const PERMISSION_ENTITIES = [
  { id: 'guest', name: 'Invité', description: 'Utilisateurs non connectés', color: 'bg-gray-500', icon: '👤', type: 'user_type' },
  { id: 'authenticated', name: 'Connecté', description: 'Utilisateurs connectés par email', color: 'bg-blue-500', icon: '✉️', type: 'user_type' },
  ...SPECIAL_BADGES.map(b => ({ id: b.id, name: b.label, description: `Badge spécial: ${b.label}`, color: 'bg-purple-500', icon: b.icon, type: 'badge' })),
];

const ACTION_LABELS: Record<string, string> = {
  read: 'Lire',
  write: 'Écrire',
  delete_own: 'Supprimer ses messages',
  delete_any: 'Supprimer n\'importe quel message',
  view_reports: 'Voir les signalements',
  ban_users: 'Bannir des utilisateurs',
  mute_users: 'Rendre muet des utilisateurs',
  unblock_users: 'Débloquer des utilisateurs',
  access_panel: 'Accéder au panneau admin',
  manage_permissions: 'Gérer les permissions',
  view_analytics: 'Voir les statistiques',
  view_own: 'Voir ses paramètres',
  edit_own: 'Modifier ses paramètres',
  edit_any: 'Modifier n\'importe quel paramètre',
  view_all: 'Voir tous les salons',
  create_custom: 'Créer des salons personnalisés',
  delete_custom: 'Supprimer des salons personnalisés',
  view_all_badges: 'Voir tous les badges',
  assign_special: 'Attribuer des badges spéciaux',
  view_own_xp: 'Voir son XP',
  view_all_xp: 'Voir l\'XP de tous',
  modify_any_xp: 'Modifier l\'XP de n\'importe qui',
  view_settings: 'Voir les paramètres',
  edit_settings: 'Modifier les paramètres',
  edit_limits: 'Modifier les limites',
  manage_bans: 'Gérer les bannissements',
  view_logs: 'Voir les logs',
  manage_filters: 'Gérer les filtres de contenu',
  review_queue: 'Voir la file d\'attente de modération',
  export_logs: 'Exporter les logs',
  manage_settings: 'Gérer les paramètres de logs',
};

interface Props { readOnly?: boolean; }

export default function PermissionsSection({ readOnly = false }: Props) {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Le fondateur/admin peut tout modifier, contournant le système de permissions
  const canModify = user?.isFounder || user?.isAdmin || !readOnly;
  const [selectedSection, setSelectedSection] = useState<string>('chat');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['chat']));
  const [changes, setChanges] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('section', { ascending: true })
        .order('action', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des permissions:', error);
        setPermissions([]);
        return;
      }
      setPermissions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string, newValue: boolean) => {
    setPermissions(prev =>
      prev.map(p =>
        p.id === permissionId ? { ...p, allowed: newValue } : p
      )
    );
    setChanges(prev => new Set([...prev, permissionId]));
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const changesArray = Array.from(changes);

      for (const permissionId of changesArray) {
        const permission = permissions.find(p => p.id === permissionId);
        if (permission) {
          const { error } = await supabase
            .from('permissions')
            .update({ allowed: permission.allowed })
            .eq('id', permissionId);

          if (error) throw error;
        }
      }

      setChanges(new Set());
      alert('Permissions sauvegardées avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des permissions');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getPermission = (section: string, action: string, identifier: string) => {
    return permissions.find(
      p => p.section === section && p.action === action && p.user_identifier === identifier
    );
  };

  const filteredPermissions = permissions.filter(p => p.section === selectedSection);
  const sectionConfig = SECTIONS.find(s => s.id === selectedSection);
  const hasChanges = changes.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gestion des Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les accès par section et par type d'utilisateur
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPermissions}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-white/[0.04] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
          <button
            onClick={saveChanges}
            disabled={readOnly || !hasChanges || saving}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            {changes.size} modification(s) non sauvegardée(s)
          </span>
        </div>
      )}

      {/* Section selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedSection === section.id
                ? 'bg-red-500/12 border-red-500/30'
                : 'border-border hover:bg-white/[0.04]'
            }`}
          >
            <div className="text-lg mb-1">{section.icon}</div>
            <div className="text-sm font-medium text-foreground">{section.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{section.description}</div>
          </button>
        ))}
      </div>

      {/* Permissions table */}
      {sectionConfig && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-secondary/50 px-4 py-3 border-b border-border">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <span>{sectionConfig.icon}</span>
              {sectionConfig.name}
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Action</th>
                  {PERMISSION_ENTITIES.map(entity => (
                    <th key={entity.id} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{entity.icon}</span>
                        <span>{entity.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sectionConfig.actions.map(action => (
                  <tr key={action} className="border-b border-border hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-sm text-foreground">
                      {ACTION_LABELS[action] || action}
                    </td>
                    {PERMISSION_ENTITIES.map(entity => {
                      const permission = getPermission(selectedSection, action, entity.id);
                      const isChanged = permission && changes.has(permission.id);
                      return (
                        <td key={entity.id} className="px-3 py-2 text-center">
                          <button
                            onClick={() => !readOnly && permission && togglePermission(permission.id, !permission.allowed)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              permission?.allowed
                                ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                                : 'bg-red-500/15 border border-red-500/30 text-red-400'
                            } ${isChanged ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-card' : ''}`}
                            title={permission?.allowed ? 'Autorisé' : 'Non autorisé'}
                          >
                            {permission?.allowed ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permission entity descriptions */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Entités de permissions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERMISSION_ENTITIES.map(entity => (
            <div key={entity.id} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/30">
              <span className="text-lg mt-1">{entity.icon}</span>
              <div>
                <div className="text-sm font-medium text-foreground">{entity.name}</div>
                <div className="text-xs text-muted-foreground">{entity.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
