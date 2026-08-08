/** Mock `virtual:pwa-register` for Vitest (module absent hors build PWA). */
export function registerSW(_opts?: unknown): (reloadPage?: boolean) => Promise<void> {
  return async () => {}
}
