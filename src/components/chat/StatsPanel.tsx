import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { X, TrendingUp, MessageSquare, Clock, Award, Users } from 'lucide-react';
import { useUser, useXP, useMessages } from '@/lib/contexts';
import { presenceService } from '@/lib/presenceService';
import { SALONS } from '@/lib/chatConfig';

interface StatsPanelProps {
  onClose: () => void;
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function StatsPanel({ onClose }: StatsPanelProps) {
  const { user, profiles } = useUser();
  const { monthlyXP } = useXP();
  const { salonMessages } = useMessages();

  const allMessages = useMemo(
    () => Object.values(salonMessages).flat(),
    [salonMessages],
  );

  const activityData = useMemo(() => {
    const buckets = DAY_LABELS.map(day => ({ day, messages: 0, xp: 0 }));
    for (const msg of allMessages) {
      if (!msg.created_date) continue;
      const d = new Date(msg.created_date);
      const dayIndex = d.getDay();
      buckets[dayIndex].messages += 1;
    }
    const userMonthly = user ? (monthlyXP[user.name] || 0) : 0;
    if (userMonthly > 0 && buckets.some(b => b.messages > 0)) {
      const totalMsg = buckets.reduce((s, b) => s + b.messages, 0) || 1;
      for (const b of buckets) {
        b.xp = Math.round((b.messages / totalMsg) * userMonthly);
      }
    }
    return buckets;
  }, [allMessages, monthlyXP, user]);

  const salonDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const msg of allMessages) {
      const salonId = (msg as { salon?: string }).salon || 'unknown';
      counts[salonId] = (counts[salonId] || 0) + 1;
    }
    const colors = ['#8b5cf6', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ec4899'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([salonId, value], i) => ({
        name: SALONS.find(s => s.id === salonId)?.name || salonId,
        value,
        color: colors[i % colors.length],
      }));
  }, [allMessages]);

  const hourlyActivity = useMemo(() => {
    const hours = [0, 6, 12, 18, 21].map(h => ({ hour: `${String(h).padStart(2, '0')}h`, count: 0 }));
    for (const msg of allMessages) {
      if (!msg.created_date) continue;
      const h = new Date(msg.created_date).getHours();
      const bucket = hours.reduce((best, cur) =>
        Math.abs(parseInt(cur.hour) - h) < Math.abs(parseInt(best.hour) - h) ? cur : best,
      );
      bucket.count += 1;
    }
    return hours;
  }, [allMessages]);

  const onlineCount = presenceService.getOnlineUsers().length;
  const totalMessages = allMessages.length;
  const totalXP = user ? (monthlyXP[user.name] || user.monthlyXP || 0) : 0;
  const profileCount = Object.keys(profiles).length;
  const avgMessages = activityData.length
    ? Math.round(activityData.reduce((s, d) => s + d.messages, 0) / activityData.length)
    : 0;
  const peakHour = hourlyActivity.reduce(
    (max, h) => (h.count > max.count ? h : max),
    hourlyActivity[0] || { hour: '-', count: 0 },
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Statistiques d&apos;activité</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">Messages chargés</span>
              </div>
              <div className="text-2xl font-bold">{totalMessages}</div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs">XP mensuel</span>
              </div>
              <div className="text-2xl font-bold">{totalXP}</div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">En ligne</span>
              </div>
              <div className="text-2xl font-bold">{onlineCount}</div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Heure de pointe</span>
              </div>
              <div className="text-2xl font-bold">{peakHour.hour}</div>
              <div className="text-xs text-muted-foreground">{peakHour.count} msgs</div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Profils connus : {profileCount} · Moyenne/jour (messages chargés) : {avgMessages}
          </p>

          {activityData.some(d => d.messages > 0) && (
            <div>
              <h3 className="text-sm font-medium mb-3">Activité par jour</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#8b5cf6" name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {hourlyActivity.some(h => h.count > 0) && (
            <div>
              <h3 className="text-sm font-medium mb-3">Activité horaire</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Messages" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {salonDistribution.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Répartition par salon</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={salonDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {salonDistribution.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
