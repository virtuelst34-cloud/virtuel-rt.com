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

const normalizeKey = (name: string) => name.trim();

const MOOD_KEY = (name: string) => `virtuel_rt_mood_${normalizeKey(name)}`;
const SIG_KEY = (name: string) => `virtuel_rt_signature_${normalizeKey(name)}`;

export function getMood(name: string | undefined | null): MoodId {
  if (!name) return 'off';
  try {
    const v = localStorage.getItem(MOOD_KEY(name));
    if (MOOD_OPTIONS.some(m => m.id === v)) return v as MoodId;
  } catch { /* ignore */ }
  return 'off';
}

export function setMood(name: string, mood: MoodId) {
  if (!name.trim()) return;
  try {
    localStorage.setItem(MOOD_KEY(name), mood);
  } catch { /* ignore */ }
}

export const SIGNATURE_EVENT = 'virtuel-rt-signature-changed';

export type SignatureDetail = { name: string; signature: string };

export function getSignature(name: string | undefined | null): string {
  if (!name) return '';
  try {
    return localStorage.getItem(SIG_KEY(name)) || '';
  } catch {
    return '';
  }
}

export function setSignature(name: string, signature: string, alsoUnder?: string | null) {
  if (!name.trim()) return;
  const value = signature.slice(0, 40);
  try {
    localStorage.setItem(SIG_KEY(name), value);
    // Keep old username key in sync when the display name changes
    if (alsoUnder && alsoUnder.trim() && normalizeKey(alsoUnder) !== normalizeKey(name)) {
      localStorage.setItem(SIG_KEY(alsoUnder), value);
    }
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    const detail: SignatureDetail = { name: normalizeKey(name), signature: value };
    window.dispatchEvent(new CustomEvent(SIGNATURE_EVENT, { detail }));
  }
}

const DAILY_SPARKS = [
  { title: 'Éclat du jour', text: 'Dis bonjour à quelqu’un que tu n’as jamais croisé.' },
  { title: 'Défi cosmos', text: 'Lance un quiz avec un thème que tu maîtrises peu.' },
  { title: 'Onde positive', text: 'Envoie une réaction ⭐ à un message qui te plaît.' },
  { title: 'Salon secret', text: 'Essaie un salon que tu n’ouvres jamais d’habitude.' },
  { title: 'Micro-poésie', text: 'Écris un message en exactement 7 mots.' },
  { title: 'Compliment flash', text: 'Félicite quelqu’un pour son pseudo ou son avatar.' },
  { title: 'Pause zen', text: 'Active l’ambiance Nébuleuse et reste 2 minutes sans chatter.' },
  { title: 'Fil rouge', text: 'Relance une discussion calme avec une question ouverte.' },
  { title: 'Avatar surprise', text: 'Change ton avatar ou ton humeur pour la journée.' },
  { title: 'Merci express', text: 'Remercie quelqu’un pour un message utile ou drôle.' },
  { title: 'Histoire minute', text: 'Raconte une anecdote en trois phrases max.' },
  { title: 'Voyage salon', text: 'Passe 5 minutes dans un salon hors de ta zone habituelle.' },
  { title: 'Écoute active', text: 'Réponds à quelqu’un en reprenant un détail de son message.' },
  { title: 'Défi emoji', text: 'Envoie un message composé uniquement d’emojis (max 8).' },
  { title: 'Pont amical', text: 'Présente deux personnes du salon l’une à l’autre.' },
  { title: 'Question du soir', text: 'Pose une question légère pour animer le fil.' },
  { title: 'Mode curiosité', text: 'Demande à quelqu’un son salon préféré et pourquoi.' },
  { title: 'Éclat créatif', text: 'Propose un petit défi ou un jeu improvisé au salon.' },
  { title: 'Soft power', text: 'Envoie un message d’encouragement sans raison particulière.' },
  { title: 'Rituel du jour', text: 'Choisis un mot du jour et glisse-le dans un message.' },
  { title: 'Connexion douce', text: 'Réponds à un message ancien encore sans réponse.' },
];

/** Clé date locale YYYY-MM-DD (fuseau du navigateur). */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailySpark(date = new Date()) {
  const key = localDateKey(date);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i) * (i + 1)) >>> 0;
  }
  const index = hash % DAILY_SPARKS.length;
  return { ...DAILY_SPARKS[index], key };
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

const sparkDismissedKey = (dateKey: string) => `virtuel-rt-spark-dismissed-${dateKey}`;

export function isDailySparkDismissed(dateKey = localDateKey()): boolean {
  try {
    return localStorage.getItem(sparkDismissedKey(dateKey)) === '1';
  } catch {
    return false;
  }
}

export function dismissDailySpark(dateKey = localDateKey()) {
  try {
    localStorage.setItem(sparkDismissedKey(dateKey), '1');
  } catch { /* ignore */ }
}

/** ms jusqu’à minuit local suivant (rollover étincelle). */
export function msUntilNextLocalMidnight(from = new Date()): number {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return Math.max(1000, next.getTime() - from.getTime());
}

export const APPLAUSE_EVENT = 'virtuel-rt-applause';

export type ApplauseDetail = { from: string; at: number };

let applauseChannel: BroadcastChannel | null = null;

function getApplauseChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!applauseChannel) {
    applauseChannel = new BroadcastChannel(APPLAUSE_EVENT);
    applauseChannel.onmessage = (ev) => {
      const detail = ev.data as ApplauseDetail;
      if (detail?.from) {
        window.dispatchEvent(new CustomEvent(APPLAUSE_EVENT, { detail }));
      }
    };
  }
  return applauseChannel;
}

export function broadcastApplause(from: string, at = Date.now()) {
  if (typeof window === 'undefined' || !from) return;
  const detail: ApplauseDetail = { from, at };
  window.dispatchEvent(new CustomEvent(APPLAUSE_EVENT, { detail }));
  try {
    getApplauseChannel()?.postMessage(detail);
  } catch { /* ignore */ }
  return detail;
}

/* ── Favoris messages ── */

export type MessageBookmark = {
  id: string;
  salonId: string;
  salonName?: string;
  author_name: string;
  text: string;
  created_date?: string;
  savedAt: number;
};

const BOOKMARKS_KEY = (name: string) => `virtuel_rt_bookmarks_${normalizeKey(name)}`;
export const BOOKMARKS_EVENT = 'virtuel-rt-bookmarks-changed';

export function getBookmarks(userName: string | undefined | null): MessageBookmark[] {
  if (!userName) return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY(userName));
    return raw ? (JSON.parse(raw) as MessageBookmark[]) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(userName: string | undefined | null, messageId: string): boolean {
  return getBookmarks(userName).some(b => b.id === messageId);
}

export function toggleBookmark(
  userName: string,
  bookmark: Omit<MessageBookmark, 'savedAt'>,
): boolean {
  if (!userName.trim()) return false;
  const list = getBookmarks(userName);
  const exists = list.some(b => b.id === bookmark.id);
  const next = exists
    ? list.filter(b => b.id !== bookmark.id)
    : [{ ...bookmark, savedAt: Date.now() }, ...list].slice(0, 80);
  try {
    localStorage.setItem(BOOKMARKS_KEY(userName), JSON.stringify(next));
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT));
  }
  return !exists;
}

/* ── Réponses rapides ── */

export type QuickReply = { id: string; label: string; text: string };

const QUICK_REPLIES_KEY = (name: string) => `virtuel_rt_quick_replies_${normalizeKey(name)}`;

export const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: 'salut', label: 'Salut', text: 'Salut ! 👋' },
  { id: 'merci', label: 'Merci', text: 'Merci beaucoup ! 🙏' },
  { id: 'bravo', label: 'Bravo', text: 'Bravo, bien joué ! 🎉' },
  { id: 'plus-tard', label: 'Plus tard', text: 'Je reviens plus tard 👋' },
];

export function getQuickReplies(userName: string | undefined | null): QuickReply[] {
  if (!userName) return DEFAULT_QUICK_REPLIES;
  try {
    const raw = localStorage.getItem(QUICK_REPLIES_KEY(userName));
    if (!raw) return DEFAULT_QUICK_REPLIES;
    const parsed = JSON.parse(raw) as QuickReply[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_QUICK_REPLIES;
  } catch {
    return DEFAULT_QUICK_REPLIES;
  }
}

export function setQuickReplies(userName: string, replies: QuickReply[]) {
  if (!userName.trim()) return;
  try {
    localStorage.setItem(QUICK_REPLIES_KEY(userName), JSON.stringify(replies.slice(0, 12)));
  } catch { /* ignore */ }
}

/* ── Mute notifications salon ── */

const MUTED_SALONS_KEY = (name: string) => `virtuel_rt_muted_salons_${normalizeKey(name)}`;
export const MUTED_SALONS_EVENT = 'virtuel-rt-muted-salons';

export function getMutedSalons(userName: string | undefined | null): string[] {
  if (!userName) return [];
  try {
    const raw = localStorage.getItem(MUTED_SALONS_KEY(userName));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isSalonMuted(userName: string | undefined | null, salonId: string): boolean {
  return getMutedSalons(userName).includes(salonId);
}

export function toggleSalonMute(userName: string, salonId: string): boolean {
  if (!userName.trim() || !salonId) return false;
  const list = getMutedSalons(userName);
  const muted = list.includes(salonId);
  const next = muted ? list.filter(id => id !== salonId) : [...list, salonId];
  try {
    localStorage.setItem(MUTED_SALONS_KEY(userName), JSON.stringify(next));
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MUTED_SALONS_EVENT, { detail: { salonId, muted: !muted } }));
  }
  return !muted;
}

/* ── Dés virtuels ── */

export function rollDice(sides = 6, count = 1): number[] {
  const n = Math.min(5, Math.max(1, count));
  const s = Math.min(100, Math.max(2, sides));
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * s));
}

export function formatDiceResult(rolls: number[], sides: number): string {
  const total = rolls.reduce((a, b) => a + b, 0);
  if (rolls.length === 1) return `🎲 Dé ${sides} → ${rolls[0]}`;
  return `🎲 ${rolls.length}d${sides} → ${rolls.join(' + ')} = ${total}`;
}

/* ── Pluie de réactions ── */

export const REACTION_RAIN_EVENT = 'virtuel-rt-reaction-rain';
export type ReactionRainDetail = { from: string; emoji: string; at: number };

export function broadcastReactionRain(from: string, emoji = '✨') {
  if (typeof window === 'undefined' || !from) return;
  const detail: ReactionRainDetail = { from, emoji, at: Date.now() };
  window.dispatchEvent(new CustomEvent(REACTION_RAIN_EVENT, { detail }));
  return detail;
}

/* ── Mémoire cosmique (mini-jeu) ── */

export const MEMORY_EMOJIS = ['🌙', '⭐', '🪐', '☄️', '🌌', '🔮', '💎', '🚀'];

export function shuffleMemoryDeck(pairs = 6): string[] {
  const chosen = MEMORY_EMOJIS.slice(0, Math.min(pairs, MEMORY_EMOJIS.length));
  const deck = [...chosen, ...chosen];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
