/** Fonctionnalités ludiques côté client (sans migration DB obligatoire). */

export type MoodId = 'off' | 'zen' | 'fire' | 'cosmic' | 'heart' | 'focus';

export const MOOD_OPTIONS: {
  id: MoodId;
  label: string;
  emoji: string;
  ring: string;
}[] = [
  { id: 'off', label: 'Neutre', emoji: '◯', ring: '' },
  { id: 'zen', label: 'Zen', emoji: '🌊', ring: 'ring-2 ring-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.45)]' },
  { id: 'fire', label: 'En feu', emoji: '🔥', ring: 'ring-2 ring-orange-400/80 shadow-[0_0_14px_rgba(251,146,60,0.5)]' },
  { id: 'cosmic', label: 'Cosmos', emoji: '✨', ring: 'ring-2 ring-violet-400/80 shadow-[0_0_14px_rgba(167,139,250,0.55)]' },
  { id: 'heart', label: 'Cœur', emoji: '💖', ring: 'ring-2 ring-pink-400/80 shadow-[0_0_14px_rgba(244,114,182,0.5)]' },
  { id: 'focus', label: 'Focus', emoji: '🎯', ring: 'ring-2 ring-emerald-400/70 shadow-[0_0_12px_rgba(52,211,153,0.45)]' },
];

const MOOD_KEY = (name: string) => `virtuel_rt_mood_${name}`;
const SIG_KEY = (name: string) => `virtuel_rt_signature_${name}`;

export function getMood(name: string | undefined | null): MoodId {
  if (!name) return 'off';
  try {
    const v = localStorage.getItem(MOOD_KEY(name));
    if (MOOD_OPTIONS.some(m => m.id === v)) return v as MoodId;
  } catch { /* ignore */ }
  return 'off';
}

export function setMood(name: string, mood: MoodId) {
  try {
    localStorage.setItem(MOOD_KEY(name), mood);
  } catch { /* ignore */ }
}

export function getSignature(name: string | undefined | null): string {
  if (!name) return '';
  try {
    return localStorage.getItem(SIG_KEY(name)) || '';
  } catch {
    return '';
  }
}

export function setSignature(name: string, signature: string) {
  try {
    localStorage.setItem(SIG_KEY(name), signature.slice(0, 40));
  } catch { /* ignore */ }
}

const DAILY_SPARKS = [
  { title: 'Éclat du jour', text: 'Dis bonjour à quelqu’un que tu n’as jamais croisé.' },
  { title: 'Défi cosmos', text: 'Lance un quiz avec un thème que tu maîtrises peu.' },
  { title: 'Onde positive', text: 'Envoie une réaction ⭐ à un message qui te plaît.' },
  { title: 'Salon secret', text: 'Essaie un salon que tu n’ouvres jamais d’habitude.' },
  { title: 'Micro-poésie', text: 'Écris un message en exactement 7 mots.' },
  { title: 'Compliment flash', text: 'Félicite quelqu’un pour son pseudo ou son avatar.' },
  { title: 'Pause zen', text: 'Active l’ambiance Nébuleuse et reste 2 minutes sans chatter.' },
];

export function getDailySpark(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % DAILY_SPARKS.length;
  return { ...DAILY_SPARKS[hash], key };
}

export function isDailySparkDone(key: string): boolean {
  try {
    return localStorage.getItem(`virtuel_rt_spark_${key}`) === '1';
  } catch {
    return false;
  }
}

export function markDailySparkDone(key: string) {
  try {
    localStorage.setItem(`virtuel_rt_spark_${key}`, '1');
  } catch { /* ignore */ }
}

export const APPLAUSE_EVENT = 'virtuel-rt-applause';

export type ApplauseDetail = { from: string; at: number };

export function broadcastApplause(from: string) {
  if (typeof window === 'undefined') return;
  const detail: ApplauseDetail = { from, at: Date.now() };
  window.dispatchEvent(new CustomEvent(APPLAUSE_EVENT, { detail }));
}
