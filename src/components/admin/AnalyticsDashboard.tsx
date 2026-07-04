import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, MessageSquare, Clock, Activity } from 'lucide-react';

interface ActivityData {
  date: string;
  messages: number;
  activeUsers: number;
  newUsers: number;
}

interface HourData {
  hour: number;
  count: number;
}

interface RetentionData {
  period: string;
  retained: number;
  total: number;
  percentage: number;
}

export function AnalyticsDashboard() {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [hourData, setHourData] = useState<HourData[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler le chargement des données
    setTimeout(() => {
      setActivityData(generateActivityData());
      setHourData(generateHourData());
      setRetentionData(generateRetentionData());
      setLoading(false);
    }, 1000);
  }, []);

  const generateActivityData = (): ActivityData[] => {
    const data: ActivityData[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        messages: Math.floor(Math.random() * 500) + 100,
        activeUsers: Math.floor(Math.random() * 100) + 20,
        newUsers: Math.floor(Math.random() * 20) + 1
      });
    }
    
    return data;
  };

  const generateHourData = (): HourData[] => {
    const data: HourData[] = [];
    
    for (let i = 0; i < 24; i++) {
      data.push({
        hour: i,
        count: Math.floor(Math.random() * 100) + 10
      });
    }
    
    return data;
  };

  const generateRetentionData = (): RetentionData[] => {
    return [
      { period: 'Jour 1', retained: 850, total: 1000, percentage: 85 },
      { period: 'Jour 7', retained: 600, total: 1000, percentage: 60 },
      { period: 'Jour 30', retained: 400, total: 1000, percentage: 40 },
      { period: 'Jour 90', retained: 250, total: 1000, percentage: 25 },
      { period: 'Jour 180', retained: 150, total: 1000, percentage: 15 },
      { period: 'Jour 365', retained: 100, total: 1000, percentage: 10 }
    ];
  };

  const getHeatmapColor = (value: number) => {
    const max = Math.max(...hourData.map(d => d.count));
    const intensity = value / max;
    
    if (intensity < 0.2) return '#e0f2fe';
    if (intensity < 0.4) return '#7dd3fc';
    if (intensity < 0.6) return '#38bdf8';
    if (intensity < 0.8) return '#0284c7';
    return '#0369a1';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Messages (30j)"
          value={activityData.reduce((sum, d) => sum + d.messages, 0).toLocaleString()}
          trend="+12%"
          positive
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Utilisateurs actifs"
          value={activityData.reduce((sum, d) => sum + d.activeUsers, 0).toLocaleString()}
          trend="+8%"
          positive
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Nouveaux utilisateurs"
          value={activityData.reduce((sum, d) => sum + d.newUsers, 0).toLocaleString()}
          trend="+15%"
          positive
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Rétention (30j)"
          value="40%"
          trend="-2%"
          positive={false}
        />
      </div>

      {/* Graphique d'activité temporelle */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Activité temporelle (30 jours)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
            <XAxis dataKey="date" stroke="rgba(128, 128, 128, 0.5)" />
            <YAxis stroke="rgba(128, 128, 128, 0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Messages"
            />
            <Line
              type="monotone"
              dataKey="activeUsers"
              stroke="#10b981"
              strokeWidth={2}
              name="Utilisateurs actifs"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap des heures actives */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Heatmap des heures actives
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {hourData.map((data, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: getHeatmapColor(data.count) }}
                title={`${data.hour}h: ${data.count} messages`}
              >
                {data.hour}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e0f2fe' }} />
              <span>Peu actif</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0369a1' }} />
              <span>Très actif</span>
            </div>
          </div>
        </div>

        {/* Statistiques de rétention */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Taux de rétention</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
              <XAxis dataKey="period" stroke="rgba(128, 128, 128, 0.5)" />
              <YAxis stroke="rgba(128, 128, 128, 0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="percentage" fill="#8b5cf6" name="Taux de rétention (%)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {retentionData.map((data, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{data.period}</span>
                <span className="font-medium">
                  {data.retained}/{data.total} ({data.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}

function StatCard({ icon, label, value, trend, positive }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-secondary rounded-lg">{icon}</div>
        <span className={`text-sm font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
