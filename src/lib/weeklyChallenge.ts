/** Défi hebdomadaire léger (local, sans serveur). */

const CHALLENGES = [
  { title: 'Ambassadeur', text: 'Saluez 3 personnes différentes cette semaine.' },
  { title: 'Explorateur', text: 'Visitez au moins 3 salons différents.' },
  { title: 'Conteur', text: 'Envoyez un message utile dans un salon d’aide ou d’accueil.' },
  { title: 'Mélomane', text: 'Passez un moment dans un salon musique ou karaoke.' },
  { title: 'Sociable', text: 'Envoyez un MP amical à quelqu’un en ligne.' },
];

function weekKey(): string {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lundi
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeeklyChallenge(): { key: string; title: string; text: string } {
  const key = weekKey();
  const idx = Math.abs(hash(key)) % CHALLENGES.length;
  return { key, ...CHALLENGES[idx] };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function isWeeklyChallengeDismissed(key: string): boolean {
  try {
    return localStorage.getItem(`virtuel-rt-weekly-dismissed-${key}`) === '1';
  } catch {
    return false;
  }
}

export function dismissWeeklyChallenge(key: string): void {
  try {
    localStorage.setItem(`virtuel-rt-weekly-dismissed-${key}`, '1');
  } catch {
    /* ignore */
  }
}

export function isWeeklyChallengeDone(key: string): boolean {
  try {
    return localStorage.getItem(`virtuel_rt_weekly_${key}`) === '1';
  } catch {
    return false;
  }
}

export function markWeeklyChallengeDone(key: string): void {
  try {
    localStorage.setItem(`virtuel_rt_weekly_${key}`, '1');
  } catch {
    /* ignore */
  }
}
