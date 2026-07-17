import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
const Home = lazy(() => import('@/pages/Home'));

function AppShellFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Chargement de Virtuel-RT…
    </div>
  );
}

function SalonInitializer({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  useEffect(() => {
    // Extraire l'ID du salon depuis l'URL /salon/:id
    const match = location.pathname.match(/^\/salon\/(.+)$/);
    if (match) {
      const salonId = match[1];
      // Déclencher un événement pour que SalonsContext puisse le capter
      window.dispatchEvent(new CustomEvent('set-salon-from-url', { detail: { salonId } }));
    }
  }, [location.pathname]);

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <SalonInitializer>
            <Suspense fallback={<AppShellFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/salon/:id" element={<Home />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </SalonInitializer>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
