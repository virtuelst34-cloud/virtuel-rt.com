import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-card border border-border text-foreground',
        },
      }}
    />
  );
}
