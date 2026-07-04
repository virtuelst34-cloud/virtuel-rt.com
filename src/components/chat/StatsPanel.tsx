import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { X, TrendingUp, MessageSquare, Clock, Award } from 'lucide-react';

interface StatsPanelProps {
  onClose: () => void;
}

// Données simulées pour l'exemple
const activityData = [
  { day: 'Lun', messages: 45, xp: 120 },
  { day: 'Mar', messages: 52, xp: 145 },
  { day: 'Mer', messages: 38, xp: 98 },
  { day: 'Jeu', messages: 65, xp: 180 },
  { day: 'Ven', messages: 72, xp: 195 },
  { day: 'Sam', messages: 85, xp: 220 },
  { day: 'Dim', messages: 48, xp: 130 },
];

const hourlyActivity = [
  { hour: '00h', count: 5 },
  { hour: '06h', count: 12 },
  { hour: '12h', count: 45 },
  { hour: '18h', count: 78 },
  { hour: '21h', count: 65 },
];

const salonDistribution = [
  { name: 'Musique', value: 35, color: '#8b5cf6' },
  { name: 'Débat', value: 25, color: '#3b82f6' },
  { name: 'Karaoké', value: 20, color: '#ef4444' },
  { name: 'Quiz', value: 15, color: '#10b981' },
  { name: 'Autres', value: 5, color: '#f59e0b' },
];

export function StatsPanel({ onClose }: StatsPanelProps) {
  const totalMessages = activityData.reduce((sum, d) => sum + d.messages, 0);
  const totalXP = activityData.reduce((sum, d) => sum + d.xp, 0);
  const avgMessages = Math.round(totalMessages / activityData.length);
  const peakHour = hourlyActivity.reduce((max, h) => h.count > max.count ? h : max, hourlyActivity[0]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Statistiques d'activité</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">Messages</span>
              </div>
              <div className="text-2xl font-bold">{totalMessages}</div>
              <div className="text-xs text-muted-foreground">Total cette semaine</div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs">XP gagné</span>
              </div>
              <div className="text-2xl font-bold">{totalXP}</div>
              <div className="text-xs text-muted-foreground">Total cette semaine</div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Moyenne</span>
              </div>
              <div className="text-2xl font-bold">{avgMessages}</div>
              <div className="text-xs text-muted-foreground">Messages/jour</div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Pic d'activité</span>
              </div>
              <div className="text-2xl font-bold">{peakHour.hour}</div>
              <div className="text-xs text-muted-foreground">{peakHour.count} messages</div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-semibold mb-4">Activité hebdomadaire</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                />
                <Bar dataKey="messages" fill="#8b5cf6" name="Messages" />
                <Bar dataKey="xp" fill="#3b82f6" name="XP" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hourly Activity */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-semibold mb-4">Activité horaire</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Salon Distribution */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-semibold mb-4">Distribution par salon</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={salonDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salonDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {salonDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-xs text-muted-foreground text-center">
          Statistiques mises à jour en temps réel
        </div>
      </div>
    </div>
  );
}
