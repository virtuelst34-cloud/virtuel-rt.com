import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';

/**
 * Composant de Fallback pour le chargement
 * Minimaliste pour ne pas bloquer le rendu
 */
export const LazyLoadingFallback = () => (
  <div className="flex items-center justify-center p-4 min-h-[100px]">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" />
      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
    </div>
  </div>
);

/**
 * Helper pour créer des composants lazy loadés avec fallback
 * @param importFunc - async import function
 * @param componentName - export name (default si omis)
 * @returns - Lazy component wrapped in Suspense
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName: string = 'default'
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(async () => {
    const module = await importFunc();
    return componentName === 'default' ? module : { default: module[componentName as keyof typeof module] as T };
  });

  return function LazyComponentWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<LazyLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Helper pour créer des composants lazy avec Error Boundary
 */
export function createLazyComponentWithErrorBoundary<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName: string = 'default'
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = createLazyComponent(importFunc, componentName);
  
  return function LazyComponentWithErrorBoundary(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary fallback={<LazyLoadingFallback />}>
        <LazyComponent {...props} />
      </ErrorBoundary>
    );
  };
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Simple Error Boundary pour les lazy components
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erreur lors du chargement du composant:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          Erreur lors du chargement du composant. Veuillez rafraîchir la page.
        </div>
      );
    }

    return this.props.children;
  }
}
