import React from 'react';
import { User, Venus, Mars, CircleHelp } from 'lucide-react';

interface GenderIconProps {
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  size?: number;
  className?: string;
}

export default function GenderIcon({ gender, size = 12, className = '' }: GenderIconProps) {
  if (!gender || gender === 'prefer_not_to_say') {
    return null;
  }

  const Icon = gender === 'male' ? Mars : gender === 'female' ? Venus : CircleHelp;
  const color = gender === 'male' ? 'text-blue-400' : gender === 'female' ? 'text-pink-400' : 'text-purple-400';

  return <Icon className={`${color} ${className}`} style={{ width: size, height: size }} />;
}
