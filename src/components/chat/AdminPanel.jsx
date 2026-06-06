import React, { useState } from 'react';
import { useUI, useUser, useMessages, useSalons, useModeration, useBadges, useXP } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { X, ShieldAlert, LayoutDashboard, Users, Gavel, Ban, CheckCircle, VolumeX, Volume2, Trash2, Search, Plus, DoorOpen, BarChart2, Circle, Diamond, Star, Award } from 'lucide-react';
import { SALONS, SALON_TYPES, SALON_EMOJIS_LIST } from '@/lib/chatConfig';
import { DIAMOND_BADGES_DEFAULT, getMergedBadges, SPECIAL_BADGES } from '@/lib/diamondBadges';

const TABS = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'stats',      label: 'Statistiques',    icon: BarChart2 },
  { id: 'salons',     label: 'Salons',           icon: DoorOpen },
  { id: 'users',      label: 'Utilisateurs',     icon: Users },
  { id: 'moderation', label: 'Modération',       icon: Gavel },
  { id: 'badges',     label: 'Badges',           icon: Diamond },
  { id: 'special',    label: 'Badges spéciaux',  icon: Award },
];

const STATUS_OPTIONS = [
  { id: 'online',  label: 'En ligne',       color: 'bg-emerald-500' },
  { id: 'away',    label: 'Absent',         color: 'bg-amber-500' },
  { id: 'busy',    label: 'Ne pas déranger',color: 'bg-red-500' },
  { id: 'offline', label: 'Invisible',      color: 'bg-muted-foreground/40' },
];

export default function AdminPanel() {
  const { setShowAdmin } = useUI();
  const [activeTab, setActiveTab] = useState('dashboard');
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[2000] animate-in fade-in duration-300 p-4">
      <div className="bg-card border border-red-500/30 rounded-3xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0 bg-red-500/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400"><ShieldAlert className="w-4 h-4" /></div>
          <span className="text-[15px] font-semibold text-foreground flex-1">Panneau d'administration</span>
          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5 font-semibold tracking-wide">ADMIN</span>
          <button onClick={() => setShowAdmin(false)} className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex overflow-hidden flex-1">
          <div className="w-[170px] bg-secondary border-r border-border p-1.5 flex flex-col gap-0.5 shrink-0">
            {TABS.map(tab => { const Icon = tab.icon; return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border ${activeTab === tab.id ? 'bg-red-500/12 border-red-500/25 text-red-400' : 'border-transparent text-muted-foreground/60 hover:bg-white/[0.04] hover:text-muted-foreground'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            ); })}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
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

function SectionTitle({ icon: Icon, children }) {
  return <h3 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-red-400" />{children}</h3>;
}
function StatCard({ value, label, color }) {
  const colors = { 
    red: 'text-red-400', green: 'text-emerald-400', yellow: 'text-amber-400', 
    blue: 'text-blue-400', purple: 'text-purple-400', emerald: 'text-emerald-400',
    amber: 'text-amber-400', indigo: 'text-indigo-400', pink: 'text-pink-400'
  };
  return (
    <div className="bg-secondary border border-border rounded-xl p-3 text-center">
      <div className={`text-[18px] font-bold ${colors[color]}`}>{value}</div>
      <div className="text-[9px] text-muted-foreground/50 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function DashboardSection() {
  const { profiles } = useUser();
  const { customSalons } = useSalons();
  const { salonMessages } = useMessages();
  const { monthlyXP } = useXP();
  const all = Object.values(profiles);
  const top = [...all].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
  const totalSalons = SALONS.length + (customSalons?.length || 0);
  const totalMessages = Object.values(salonMessages || {}).reduce((acc, msgs) => acc + msgs.length, 0);

  return (
    <div>
      <SectionTitle icon={LayoutDashboard}>Tableau de bord</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <StatCard value={all.length}                                        label="Profils"         color="blue" />
        <StatCard value={all.filter(p => !p.isBanned && !p.isMuted).length} label="Actifs"          color="green" />
        <StatCard value={totalSalons}                                        label="Salons"          color="purple" />
        <StatCard value={totalMessages}                                      label="Messages total"  color="yellow" />
        <StatCard value={all.filter(p => p.isBanned).length}                label="Bannis"          color="red" />
        <StatCard value={all.filter(p => p.isMuted).length}                 label="Mutés"           color="yellow" />
      </div>
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Top XP</div>
      {top.length === 0 && <p className="text-[11px] text-muted-foreground/40 italic">Aucun profil enregistré.</p>}
      <div className="space-y-1.5">
        {top.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2.5 bg-secondary border border-border rounded-xl px-3 py-2">
            <span className="text-[11px] text-muted-foreground/40 w-4">#{i+1}</span>
            <Avatar avatarClass={p.avatar} initials={p.initials} size="xs" />
            <span className="text-xs text-foreground flex-1 truncate">{p.name}</span>
            <DiamondBadge level={p.level || 1} size="xs" />
            <span className="text-[10px] text-purple-400 font-bold">Nv.{p.level||1}</span>
            <span className="text-[10px] text-muted-foreground/50">{(p.xp||0).toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSection() {
  const { profiles } = useUser();
  const { salonMessages } = useMessages();
  const { monthlyXP } = useXP();
  const { customSalons } = useSalons();
  const all = Object.values(profiles);
  const totalSalons = SALONS.length + (customSalons?.length || 0);
  const allSalons = [...SALONS, ...(customSalons || [])];

  // Messages par salon
  const salonStats = allSalons.map(s => ({
    name: s.name,
    count: (salonMessages?.[s.id] || []).length,
  })).sort((a, b) => b.count - a.count);

  // Classement mensuel
  const monthlyRanked = Object.entries(monthlyXP || {})
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  const totalMessages = salonStats.reduce((acc, s) => acc + s.count, 0);
  const avgLevel = all.length ? Math.round(all.reduce((acc, p) => acc + (p.level || 1), 0) / all.length) : 0;
  const premiumCount = all.filter(p => p.isPremium).length;
  const totalXP = all.reduce((acc, p) => acc + (p.xp || 0), 0);
  const onlineUsers = all.filter(p => p.status === 'online').length;
  const activeUsers = all.filter(p => !p.isBanned && !p.isMuted).length;

  return (
    <div>
      <SectionTitle icon={BarChart2}>Statistiques détaillées</SectionTitle>
      
      {/* Statistiques générales */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <StatCard value={all.length}        label="Profils"         color="blue" />
        <StatCard value={onlineUsers}      label="En ligne"        color="green" />
        <StatCard value={activeUsers}      label="Actifs"          color="emerald" />
        <StatCard value={premiumCount}     label="Premium"         color="yellow" />
      </div>
      
      <div className="grid grid-cols-4 gap-2 mb-6">
        <StatCard value={totalMessages.toLocaleString()}  label="Messages"        color="purple" />
        <StatCard value={totalXP.toLocaleString()}        label="XP total"        color="amber" />
        <StatCard value={avgLevel}                       label="Niveau moyen"    color="indigo" />
        <StatCard value={totalSalons}                    label="Salons"          color="pink" />
      </div>

      {/* Messages par salon */}
      <div className="mb-6">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Activité par salon</div>
        <div className="space-y-2">
          {salonStats.filter(s => s.count > 0).length === 0 && (
            <p className="text-[11px] text-muted-foreground/40 italic">Aucun message envoyé.</p>
          )}
          {salonStats.filter(s => s.count > 0).map(s => (
            <div key={s.name} className="flex items-center gap-2.5">
              <span className="text-[11px] text-muted-foreground/70 w-28 truncate">{s.name}</span>
              <div className="flex-1 bg-secondary rounded-full h-[6px] overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all"
                  style={{ width: totalMessages ? `${Math.round((s.count / totalMessages) * 100)}%` : '0%' }} />
              </div>
              <span className="text-[10px] text-muted-foreground/50 w-8 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top mensuel */}
      <div>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Top XP ce mois</div>
        {monthlyRanked.length === 0 && <p className="text-[11px] text-muted-foreground/40 italic">Aucune activité ce mois.</p>}
        <div className="space-y-1.5">
          {monthlyRanked.map((r, i) => {
            const p = profiles[r.name] || {};
            return (
              <div key={r.name} className="flex items-center gap-2.5 bg-secondary border border-border rounded-xl px-3 py-2">
                <span className="text-[11px] text-muted-foreground/40 w-4">#{i+1}</span>
                <Avatar avatarClass={p.avatar || 'av1'} initials={p.initials || r.name.slice(0,2).toUpperCase()} size="xs" />
                <span className="text-xs text-foreground flex-1 truncate">{r.name}</span>
                <span className="text-[10px] text-amber-400 font-bold">{r.xp.toLocaleString()} XP</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SalonsSection() {
  const { customSalons, addSalon, deleteSalon, hiddenSalons, setHiddenSalons } = useSalons();
  const [form, setForm] = useState({ name: '', type: 'chat vocal', emoji: '💬', welcome: '' });
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    const id = 'custom_' + Date.now();
    addSalon({ id, name: form.name.trim(), type: form.type, emoji: form.emoji, welcome: form.welcome.trim() || `Bienvenue dans ${form.name.trim()} !`, custom: true });
    setForm({ name: '', type: 'chat vocal', emoji: '💬', welcome: '' });
    setError('');
  };

  const handleRestoreSalon = (id) => {
    setHiddenSalons(prev => prev.filter(s => s !== id));
  };

  const SALON_EMOJI_MAP = {'musique60':'🎵','musique80':'🎸','karaoke':'🎤','debat':'⚡','quiz':'🧠','jeunes':'👋','lgbt':'🌈','divorce':'💙','libre':'🚪','insulte':'😤','cameras':'📹','bar':'🍷'};

  return (
    <div>
      <SectionTitle icon={DoorOpen}>Gestion des salons</SectionTitle>

      {/* Formulaire création */}
      <div className="bg-secondary border border-border rounded-xl p-4 mb-5">
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
        {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
        <button onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Créer
        </button>
      </div>

      {/* Salons fixes */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Salons par défaut ({SALONS.length})</div>
      <div className="space-y-1.5 mb-5">
        {SALONS.map(s => {
          const hidden = (hiddenSalons || []).includes(s.id);
          return (
            <div key={s.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${hidden ? 'opacity-40 bg-secondary border-border' : 'bg-secondary border-border'}`}>
              <span className="text-base">{SALON_EMOJI_MAP[s.id] || '💬'}</span>
              <span className="text-xs text-foreground flex-1">{s.name}</span>
              <span className="text-[10px] text-muted-foreground/40 bg-secondary border border-border rounded px-1.5 py-px">{s.type}</span>
              {hidden
                ? <button onClick={() => handleRestoreSalon(s.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] hover:bg-emerald-500/25 transition-colors">
                    Restaurer
                  </button>
                : <button onClick={() => { if (!confirm(`Masquer « ${s.name} » ?`)) return; deleteSalon(s.id); }}
                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
              }
            </div>
          );
        })}
      </div>

      {/* Salons custom */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Salons créés ({(customSalons || []).length})</div>
      {(customSalons || []).length === 0 && <p className="text-[11px] text-muted-foreground/40 italic">Aucun salon personnalisé.</p>}
      <div className="space-y-1.5">
        {(customSalons || []).map(s => (
          <div key={s.id} className="flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
            <span className="text-base">{s.emoji || '💬'}</span>
            <span className="text-xs text-foreground flex-1">{s.name}</span>
            <span className="text-[10px] text-muted-foreground/40 bg-secondary border border-border rounded px-1.5 py-px">{s.type}</span>
            <button onClick={() => { if (!confirm(`Supprimer « ${s.name} » ?`)) return; deleteSalon(s.id); }}
              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersSection() {
  const { profiles, setProfiles, setUserStatusAdmin } = useUser();
  const { banUser, unbanUser, muteUser, unmuteUser } = useModeration();
  const [search, setSearch]       = useState('');
  const [banReason, setBanReason] = useState({});
  const all = Object.values(profiles).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionTitle icon={Users}>Gestion des utilisateurs</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard value={Object.values(profiles).filter(p => !p.isBanned).length} label="Actifs"  color="green" />
        <StatCard value={Object.values(profiles).filter(p => p.isBanned).length}  label="Bannis"  color="red" />
        <StatCard value={Object.keys(profiles).length}                             label="Total"   color="blue" />
      </div>
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
          className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40" />
      </div>
      {all.length === 0 && <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
        {all.map(profile => (
          <div key={profile.name} className={`rounded-xl border px-3 py-2.5 ${profile.isBanned ? 'bg-red-500/5 border-red-500/25' : profile.isMuted ? 'bg-amber-500/5 border-amber-500/20' : 'bg-secondary border-border'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Avatar avatarClass={profile.avatar} initials={profile.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate">{profile.name}</span>
                  {profile.isBanned && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-px">BANNI</span>}
                  {profile.isMuted  && <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-px">MUTÉ</span>}
                </div>
                <div className="text-[10px] text-muted-foreground/50">Nv.{profile.level||1} · {(profile.xp||0).toLocaleString()} XP</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!profile.isBanned
                  ? <button onClick={() => banUser(profile.name, banReason[profile.name] || 'Violation des règles')} title="Bannir" className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"><Ban className="w-3 h-3" /></button>
                  : <button onClick={() => unbanUser(profile.name)} title="Débannir" className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"><CheckCircle className="w-3 h-3" /></button>
                }
                {!profile.isMuted
                  ? <button onClick={() => muteUser(profile.name)} title="Muter" className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors"><VolumeX className="w-3 h-3" /></button>
                  : <button onClick={() => unmuteUser(profile.name)} title="Démuter" className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"><Volume2 className="w-3 h-3" /></button>
                }
                <button onClick={() => { if (!confirm(`Supprimer ${profile.name} ?`)) return; setProfiles(p => { const n={...p}; delete n[profile.name]; return n; }); }}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Gestion statut */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-muted-foreground/40 mr-1">Statut :</span>
              {STATUS_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setUserStatusAdmin(profile.name, s.id)}
                  title={s.label}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] border transition-all ${(profile.status || 'online') === s.id ? 'border-white/30 bg-white/10 text-foreground' : 'border-transparent text-muted-foreground/40 hover:text-muted-foreground/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />{s.label}
                </button>
              ))}
            </div>

            {!profile.isBanned && (
              <input value={banReason[profile.name] || ''} onChange={e => setBanReason(r => ({ ...r, [profile.name]: e.target.value }))}
                placeholder="Raison du ban (optionnel)..."
                className="w-full bg-background border border-border/50 rounded-md px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-red-500/30" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModerationSection() {
  const { profiles } = useUser();
  const { unbanUser, unmuteUser } = useModeration();
  const banned = Object.values(profiles).filter(p => p.isBanned);
  const muted  = Object.values(profiles).filter(p => p.isMuted);
  return (
    <div>
      <SectionTitle icon={Gavel}>Résumé de modération</SectionTitle>
      <div className="mb-5">
        <div className="text-[11px] font-semibold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> Bannis ({banned.length})</div>
        {banned.length === 0 ? <p className="text-[11px] text-muted-foreground/40 italic">Aucun utilisateur banni.</p>
          : banned.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2 mb-1.5">
              <Avatar avatarClass={p.avatar} initials={p.initials} size="xs" />
              <div className="flex-1 min-w-0"><span className="text-xs font-medium text-foreground">{p.name}</span>{p.banReason && <span className="text-[10px] text-red-400/70 ml-2">· {p.banReason}</span>}</div>
              <button onClick={() => unbanUser(p.name)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] hover:bg-emerald-500/25 transition-colors"><CheckCircle className="w-3 h-3" /> Débannir</button>
            </div>
          ))
        }
      </div>
      <div>
        <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><VolumeX className="w-3.5 h-3.5" /> Mutés ({muted.length})</div>
        {muted.length === 0 ? <p className="text-[11px] text-muted-foreground/40 italic">Aucun utilisateur muté.</p>
          : muted.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 mb-1.5">
              <Avatar avatarClass={p.avatar} initials={p.initials} size="xs" />
              <span className="text-xs font-medium text-foreground flex-1">{p.name}</span>
              <button onClick={() => unmuteUser(p.name)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-500/25 transition-colors"><Volume2 className="w-3 h-3" /> Démuter</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function BadgesSection() {
  const { customBadges, setCustomBadges } = useBadges();
  const badges = getMergedBadges(customBadges || []);
  const [editing, setEditing] = useState(null); // id du badge en cours d'édition
  const [draft, setDraft] = useState({});

  const handleEdit = (badge) => {
    setEditing(badge.id);
    setDraft({ label: badge.label, color: badge.color, minLevel: badge.minLevel });
  };

  const handleSave = (id) => {
    setCustomBadges(prev => {
      const existing = prev.find(b => b.id === id);
      if (existing) return prev.map(b => b.id === id ? { ...b, ...draft } : b);
      return [...prev, { id, ...draft }];
    });
    setEditing(null);
  };

  const handleReset = (id) => {
    setCustomBadges(prev => prev.filter(b => b.id !== id));
    setEditing(null);
  };

  return (
    <div>
      <SectionTitle icon={Diamond}>Gestion des badges</SectionTitle>
      <p className="text-[11px] text-muted-foreground/50 mb-4">Modifiez le nom, la couleur et le niveau requis de chaque badge diamant.</p>

      {/* Aperçu global */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-secondary border border-border rounded-xl">
        {badges.map(b => (
          <span key={b.id} className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold"
            style={{ color: b.color, borderColor: b.color + '50', background: b.color + '15' }}>
            <Diamond className="w-3 h-3" style={{ color: b.color, filter: `drop-shadow(0 0 3px ${b.glow})` }} />
            {b.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {badges.map(badge => {
          const isEditing = editing === badge.id;
          const isCustomized = (customBadges || []).some(b => b.id === badge.id);
          return (
            <div key={badge.id} className="bg-secondary border border-border rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-3">
                {/* Aperçu diamant */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: badge.color + '18', border: `1px solid ${badge.color}40` }}>
                  <Diamond className="w-4 h-4" style={{ color: badge.color, filter: `drop-shadow(0 0 4px ${badge.glow})` }} />
                </div>

                {isEditing ? (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                      placeholder="Nom du badge"
                      className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50" />
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                        className="w-7 h-7 rounded cursor-pointer border border-border bg-background" />
                      <input value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                        className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">Nv.</span>
                      <input type="number" min="1" max="99" value={draft.minLevel}
                        onChange={e => setDraft(d => ({ ...d, minLevel: parseInt(e.target.value) || 1 }))}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50" />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{badge.label}</span>
                      {isCustomized && <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 rounded px-1.5 py-px">modifié</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground/50">Niveau {badge.minLevel}+ · {badge.color}</div>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSave(badge.id)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] hover:bg-emerald-500/25 transition-colors">
                        Sauver
                      </button>
                      {isCustomized && (
                        <button onClick={() => handleReset(badge.id)}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] hover:bg-amber-500/25 transition-colors">
                          Reset
                        </button>
                      )}
                      <button onClick={() => setEditing(null)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground/50 hover:bg-white/10 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleEdit(badge)}
                      className="px-2 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[10px] hover:bg-primary/25 transition-colors">
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpecialBadgesSection() {
  const { profiles, setProfiles } = useUser();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const all = Object.values(profiles).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSpecialBadge = (userName, badgeId) => {
    setProfiles(prev => {
      const user = prev[userName];
      if (!user) return prev;
      const currentBadges = user.specialBadges || [];
      const newBadges = currentBadges.includes(badgeId)
        ? currentBadges.filter(b => b !== badgeId)
        : [...currentBadges, badgeId];
      return { ...prev, [userName]: { ...user, specialBadges: newBadges } };
    });
  };

  return (
    <div>
      <SectionTitle icon={Award}>Badges spéciaux</SectionTitle>
      <p className="text-[11px] text-muted-foreground/50 mb-4">Assignez des badges spéciaux (fondateur, modérateur, VIP) aux utilisateurs.</p>

      {/* Liste des badges spéciaux disponibles */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
        {SPECIAL_BADGES.map(badge => (
          <span key={badge.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold"
            style={{ color: badge.color, borderColor: badge.color + '40', background: badge.color + '15' }}>
            <span className="text-sm">{badge.icon}</span>
            {badge.label}
          </span>
        ))}
      </div>

      {/* Recherche utilisateur */}
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
          className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40" />
      </div>

      {all.length === 0 && <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>}

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5">
        {all.map(profile => (
          <div key={profile.name} className="bg-secondary border border-border rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Avatar avatarClass={profile.avatar} initials={profile.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate">{profile.name}</span>
                  {(profile.specialBadges || []).map(badgeId => {
                    const badge = SPECIAL_BADGES.find(b => b.id === badgeId);
                    return badge ? <span key={badgeId} className="text-sm" title={badge.label}>{badge.icon}</span> : null;
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground/50">Nv.{profile.level||1} · {(profile.xp||0).toLocaleString()} XP</div>
              </div>
            </div>

            {/* Boutons d'assignation */}
            <div className="flex gap-1.5 flex-wrap">
              {SPECIAL_BADGES.map(badge => {
                const hasBadge = (profile.specialBadges || []).includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggleSpecialBadge(profile.name, badge.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      hasBadge
                        ? 'bg-primary/20 border border-primary/40 text-primary'
                        : 'bg-white/5 border border-white/10 text-muted-foreground/60 hover:bg-white/10'
                    }`}
                  >
                    <span>{badge.icon}</span>
                    {badge.label}
                    {hasBadge && <CheckCircle className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
