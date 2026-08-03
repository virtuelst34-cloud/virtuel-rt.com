import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useUI, useUser, useSalons, useMessages, useXP, useModeration, useBadges } from '@/lib/contexts';
import { hasAdminAccess, hasStaffAccess } from '@/lib/utils/founderCheck';
import { X, ShieldAlert, LayoutDashboard, Users, Gavel, DoorOpen, Diamond, Award, BarChart2, Lock, EyeOff, LucideIcon, Settings, Bell, MessageSquare, Shield, FileText, Activity, Siren, Folders, KeyRound } from 'lucide-react';
import DashboardSection from './admin/DashboardSection';
import StatsSection from './admin/StatsSection';
import SalonsSection from './admin/SalonsSection';
import CategoriesSection from './admin/CategoriesSection';
import UsersSection from './admin/UsersSection';
import ModerationSection from './admin/ModerationSection';
import ModerationHubSection from './admin/ModerationHubSection';
import BadgesSection from './admin/BadgesSection';
import SpecialBadgesSection from './admin/SpecialBadgesSection';
import PermissionsSection from './admin/PermissionsSection';
import GlobalSettingsSection from './admin/GlobalSettingsSection';
import NotificationsSettingsSection from './admin/NotificationsSettingsSection';
import MessageSettingsSection from './admin/MessageSettingsSection';
import SecuritySettingsSection from './admin/SecuritySettingsSection';
import ContentModerationSection from './admin/ContentModerationSection';
import LogsAuditSection from './admin/LogsAuditSection';
import PremiumCodesSection from './admin/PremiumCodesSection';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'dashboard',   label: 'Tableau de bord',  icon: LayoutDashboard },
  { id: 'stats',       label: 'Statistiques',     icon: BarChart2 },
  { id: 'salons',      label: 'Salons',           icon: DoorOpen },
  { id: 'categories',  label: 'Catégories',       icon: Folders },
  { id: 'users',       label: 'Utilisateurs',     icon: Users },
  { id: 'premiumcodes', label: 'Codes Premium',   icon: KeyRound },
  { id: 'modhub',      label: 'Centre modo',      icon: Siren },
  { id: 'moderation',  label: 'Modération',       icon: Gavel },
  { id: 'badges',      label: 'Badges',           icon: Diamond },
  { id: 'special',     label: 'Badges spéciaux',  icon: Award },
  { id: 'permissions', label: 'Permissions',      icon: Lock },
  { id: 'settings',    label: 'Paramètres',       icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'messages',    label: 'Messages',         icon: MessageSquare },
  { id: 'security',    label: 'Sécurité',         icon: Shield },
  { id: 'content',     label: 'Contenu',          icon: FileText },
  { id: 'logs',        label: 'Logs',             icon: Activity },
];

export default function AdminPanel() {
  const { setShowAdmin, adminInitialTab, setAdminInitialTab } = useUI();
  const { user, supabaseUser, profiles, setProfiles, setUserStatusAdmin } = useUser();
  const { customSalons, addSalon, updateSalon, deleteSalon, reorderSalons, displayOrder, hiddenSalons, setHiddenSalons } = useSalons();
  const { salonMessages } = useMessages();
  const { monthlyXP } = useXP();
  const { banUser, unbanUser, muteUser, unmuteUser } = useModeration();
  const { customBadges, setCustomBadges } = useBadges();
  const [activeTab, setActiveTab] = useState(() =>
    adminInitialTab && TABS.some((t) => t.id === adminInitialTab) ? adminInitialTab : 'dashboard',
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstTabRef = useRef<HTMLButtonElement>(null);
  const lastTabRef = useRef<HTMLButtonElement>(null);

  // Un invité (pas de session Supabase) ne peut qu'observer
  const isReadOnly = !supabaseUser;

  useEffect(() => {
    if (adminInitialTab && TABS.some((t) => t.id === adminInitialTab)) {
      setActiveTab(adminInitialTab);
      setAdminInitialTab(null);
    }
  }, [adminInitialTab, setAdminInitialTab]);

  // Sécurité : fermer si l'utilisateur n'a pas les droits staff/admin
  useEffect(() => {
    if (user && !hasStaffAccess(user) && !hasAdminAccess(user)) {
      setShowAdmin(false);
    }
  }, [user, setShowAdmin]);

  // Focus management
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') setShowAdmin(false);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveTab(TABS[(currentIndex + 1) % TABS.length].id);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveTab(TABS[(currentIndex - 1 + TABS.length) % TABS.length].id);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center z-[2000] animate-in fade-in duration-300 p-0 sm:p-4 safe-area-pad"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className="bg-card border border-red-500/30 rounded-t-3xl sm:rounded-3xl w-full max-w-[800px] h-[min(100dvh,100%)] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0 bg-red-500/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400" aria-hidden="true">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h2 id="admin-panel-title" className="text-[15px] font-semibold text-foreground flex-1">
            Panneau d'administration
          </h2>
          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5 font-semibold tracking-wide hidden sm:inline" aria-label="Mode administrateur">
            ADMIN
          </span>
          <button
            ref={closeButtonRef}
            onClick={() => setShowAdmin(false)}
            className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
            aria-label="Fermer le panneau d'administration"
            title="Fermer (Échap)"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Bannière lecture seule pour les invités */}
        {isReadOnly && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
            <EyeOff className="w-3.5 h-3.5 shrink-0" />
            <span>Mode lecture seule — connectez-vous avec un compte pour modifier les paramètres.</span>
          </div>
        )}

        <div className="flex overflow-hidden flex-1 flex-col sm:flex-row min-h-0">
          {/* Sidebar tabs */}
          <div
            className="w-full sm:w-[170px] bg-secondary border-b sm:border-b-0 sm:border-r border-border p-1.5 flex flex-row sm:flex-col gap-0.5 shrink-0 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto"
            role="tablist"
            aria-label="Onglets d'administration"
          >
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  ref={index === 0 ? firstTabRef : index === TABS.length - 1 ? lastTabRef : null}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  title={tab.label}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-red-500/12 border-red-500/25 text-red-400'
                      : 'border-transparent text-muted-foreground/60 hover:bg-white/[0.04] hover:text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="text-[11px] sm:text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0" role="tabpanel" aria-live="polite">
            {activeTab === 'dashboard'      && <DashboardSection profiles={profiles} customSalons={customSalons} salonMessages={salonMessages} monthlyXP={monthlyXP} />}
            {activeTab === 'stats'          && <StatsSection profiles={profiles} customSalons={customSalons} salonMessages={salonMessages} monthlyXP={monthlyXP} />}
            {activeTab === 'salons'         && <SalonsSection readOnly={isReadOnly} customSalons={customSalons} addSalon={addSalon} updateSalon={updateSalon} deleteSalon={deleteSalon} reorderSalons={reorderSalons} displayOrder={displayOrder} hiddenSalons={hiddenSalons} setHiddenSalons={setHiddenSalons} />}
            {activeTab === 'categories'     && <CategoriesSection readOnly={isReadOnly} />}
            {activeTab === 'users'          && <UsersSection readOnly={isReadOnly} profiles={profiles} setProfiles={setProfiles} setUserStatusAdmin={setUserStatusAdmin} banUser={banUser} unbanUser={unbanUser} muteUser={muteUser} unmuteUser={unmuteUser} />}
            {activeTab === 'premiumcodes'   && <PremiumCodesSection readOnly={isReadOnly} />}
            {activeTab === 'modhub'         && <ModerationHubSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'moderation'     && <ModerationSection readOnly={isReadOnly} profiles={profiles} unbanUser={unbanUser} unmuteUser={unmuteUser} />}
            {activeTab === 'badges'         && <BadgesSection readOnly={isReadOnly} customBadges={customBadges} setCustomBadges={setCustomBadges} />}
            {activeTab === 'special'        && <SpecialBadgesSection readOnly={isReadOnly} profiles={profiles} setProfiles={setProfiles} />}
            {activeTab === 'permissions'    && <PermissionsSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'settings'       && <GlobalSettingsSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'notifications'  && <NotificationsSettingsSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'messages'       && <MessageSettingsSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'security'       && <SecuritySettingsSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'content'        && <ContentModerationSection readOnly={isReadOnly} user={user} />}
            {activeTab === 'logs'           && <LogsAuditSection readOnly={isReadOnly} user={user} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
