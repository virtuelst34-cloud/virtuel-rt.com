import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-primary/20 border-t-primary ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Chargement..."
    />
  );
}

export function DotsSpinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  return (
    <div className={`flex gap-1 ${className}`} role="status" aria-label="Chargement...">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-primary rounded-full animate-bounce`}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function PulseSpinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`} role="status" aria-label="Chargement...">
      <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
      <div className="absolute inset-0 bg-primary rounded-full" />
    </div>
  );
}

export function BrandSpinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  };

  return (
    <div className={`animate-bounce ${sizeClasses[size]} ${className}`} role="status" aria-label="Chargement...">
      💬
    </div>
  );
}
