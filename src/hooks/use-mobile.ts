import * as React from "react"

/** Aligné Tailwind `md` — usages génériques (drawers, etc.). */
const MOBILE_BREAKPOINT = 768

/**
 * Aligné Tailwind `sm` + MobileBottomNav (`sm:hidden`) / Sidebar (`hidden sm:flex`).
 * Utiliser pour le shell « 1 écran = 1 job » téléphone.
 */
const PHONE_BREAKPOINT = 640

function useMatchMaxWidth(maxExclusive: number): boolean {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined)
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxExclusive - 1}px)`)
    const onChange = () => {
      setMatches(window.innerWidth < maxExclusive)
    }
    mql.addEventListener("change", onChange)
    setMatches(window.innerWidth < maxExclusive)
    return () => mql.removeEventListener("change", onChange)
  }, [maxExclusive])
  return !!matches
}

export function useIsMobile(): boolean {
  return useMatchMaxWidth(MOBILE_BREAKPOINT)
}

/** Téléphone étroit : nav bas visible, sidebar desktop masquée. */
export function useIsPhone(): boolean {
  return useMatchMaxWidth(PHONE_BREAKPOINT)
}
