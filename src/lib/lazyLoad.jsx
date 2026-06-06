import React, { Suspense, lazy } from 'react';

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
 * @param {Function} importFunc - async import function
 * @param {string} componentName - export name (default si omis)
 * @returns {React.Component} - Lazy component wrapped in Suspense
 */
export function createLazyComponent(importFunc, componentName = 'default') {
  const LazyComponent = lazy(async () => {
    const module = await importFunc();
    return componentName === 'default' ? module : { default: module[componentName] };
  });

  return function LazyComponentWrapper(props) {
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
export function createLazyComponentWithErrorBoundary(importFunc, componentName = 'default') {
  const LazyComponent = createLazyComponent(importFunc, componentName);
  
  return function LazyComponentWithErrorBoundary(props) {
    return (
      <ErrorBoundary fallback={<LazyLoadingFallback />}>
        <LazyComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Simple Error Boundary pour les lazy components
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur lors du chargement du composant:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          Erreur lors du chargement du composant. Veuillez rafraîchir la page.
        </div>
      );
    }

    return this.props.children;
  }
}
