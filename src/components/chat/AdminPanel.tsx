import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useUI } from '@/lib/contexts';
import { X, ShieldAlert, LayoutDashboard, Users, Gavel, DoorOpen, Diamond, Award, BarChart2, LucideIcon } from 'lucide-react';
import DashboardSection from './admin/DashboardSection';
import StatsSection from './admin/StatsSection';
import SalonsSection from './admin/SalonsSection';
import UsersSection from './admin/UsersSection';
import ModerationSection from './admin/ModerationSection';
import BadgesSection from './admin/BadgesSection';
import SpecialBadgesSection from './admin/SpecialBadgesSection';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'stats',      label: 'Statistiques',    icon: BarChart2 },
  { id: 'salons',     label: 'Salons',           icon: DoorOpen },
  { id: 'users',      label: 'Utilisateurs',     icon: Users },
  { id: 'moderation', label: 'Modération',       icon: Gavel },
  { id: 'badges',     label: 'Badges',           icon: Diamond },
  { id: 'special',    label: 'Badges spéciaux',  icon: Award },
];

export default function AdminPanel() {
  const { setShowAdmin } = useUI();
  const [activeTab, setActiveTab] = useState('dashboard');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstTabRef = useRef<HTMLButtonElement>(null);
  const lastTabRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (panelRef.current) {
      closeButtonRef.current?.focus();
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setShowAdmin(false);
    }
  };

  // Tab navigation with arrow keys
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[nextIndex].id);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[prevIndex].id);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[2000] animate-in fade-in duration-300 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
      onKeyDown={handleKeyDown}
    >
      <div 
        ref={panelRef}
        className="bg-card border border-red-500/30 rounded-3xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
        tabIndex={-1}
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0 bg-red-500/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400" aria-hidden="true">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h2 id="admin-panel-title" className="text-[15px] font-semibold text-foreground flex-1">Panneau d'administration</h2>
          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5 font-semibold tracking-wide" aria-label="Mode administrateur">ADMIN</span>
          <button 
            ref={closeButtonRef}
            onClick={() => setShowAdmin(false)} 
            className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
            aria-label="Fermer le panneau d'administration"
            title="Fermer (Échap)">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex overflow-hidden flex-1">
          <div 
            className="w-[170px] bg-secondary border-r border-border p-1.5 flex flex-col gap-0.5 shrink-0"
            role="tablist"
            aria-label="Onglets d'administration"
          >
            {TABS.map((tab, index) => { 
              const Icon = tab.icon;
              const isFirst = index === 0;
              const isLast = index === TABS.length - 1;
              return (
                <button 
                  key={tab.id} 
                  ref={isFirst ? firstTabRef : isLast ? lastTabRef : null}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border ${activeTab === tab.id ? 'bg-red-500/12 border-red-500/25 text-red-400' : 'border-transparent text-muted-foreground/60 hover:bg-white/[0.04] hover:text-muted-foreground'}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-5" role="tabpanel" aria-live="polite">
            {activeTab === 'dashboard'  && <DashboardSection />}
            {activeTab === 'stats'      && <StatsSection />}
            {activeTab === 'salons'     && <SalonsSection />}
            {activeTab === 'users'      && <UsersSection />}
            {activeTab === 'moderation' && <ModerationSection />}
            {activeTab === 'badges'     && <BadgesSection />}
            {activeTab === 'special'    && <SpecialBadgesSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
