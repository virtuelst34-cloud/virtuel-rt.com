import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if ((import.meta as any).env?.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Capture error in Sentry (production only)
    if (import.meta.env.PROD) {
      captureError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        errorId: this.state.errorId,
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Une erreur est survenue
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Désolé, quelque chose s'est mal passé. L'application a rencontré une erreur inattendue.
              </p>

              { (import.meta as any).env?.DEV && this.state.error && (
                <div className="bg-secondary border border-border rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Détails de l'erreur (dev only):
                  </p>
                  <pre className="text-xs text-red-400 overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-muted-foreground mt-2 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              { import.meta.env.PROD && this.state.errorId && (
                <p className="text-xs text-muted-foreground mb-4">
                  ID de l'erreur: {this.state.errorId}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 font-medium hover:bg-primary/90 transition-colors"
                >
                  Réessayer
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-secondary text-secondary-foreground rounded-lg px-4 py-2.5 font-medium hover:bg-secondary/90 transition-colors"
                >
                  Recharger
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
