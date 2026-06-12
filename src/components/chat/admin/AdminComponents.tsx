import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionTitleProps {
  icon: LucideIcon;
  children: React.ReactNode;
}

export function SectionTitle({ icon: Icon, children }: SectionTitleProps) {
  return <h3 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-red-400" />{children}</h3>;
}

interface StatCardProps {
  value: string | number;
  label: string;
  color: string;
}

export function StatCard({ value, label, color }: StatCardProps) {
  const colors: Record<string, string> = { 
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
