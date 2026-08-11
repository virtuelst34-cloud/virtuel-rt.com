/** Contenu Mode coquin (Premium, 18+) — flirty / party, jamais illégal. */

export const COQUIN_REACTIONS = ['🔥', '💋', '😏', '🍷', '✨'] as const;

export const COQUIN_ICEBREAKERS = [
  'Si on était en soirée, quelle chanson te ferait sortir sur la piste ?',
  'Compliment coquin mais respectueux : qu’est-ce qui te plaît chez quelqu’un au premier regard ?',
  'Raconte un flirt raté… qui est devenu une bonne blague.',
  'Action douce : envoie un emoji 🔥 à quelqu’un qui t’a fait sourire aujourd’hui.',
  'Vérité light : quel est ton type de soirée idéal (bar, danse, discussion) ?',
  'Propose un défi karaoké sensuel… sans casser les oreilles du salon.',
];

export const COQUIN_TRUTH_OR_DARE = {
  truths: [
    'Quelle est la chose la plus flirty que tu aies jamais écrite en chat ?',
    'As-tu déjà eu un crush sur quelqu’un d’un salon Virtuel-RT ?',
    'Préfères-tu les regards en silence ou les messages bien sentis ?',
    'Quel emoji te représente le mieux en mode coquin ?',
    'Quelle chanson te met immédiatement dans l’ambiance ?',
    'As-tu déjà envoyé un message… puis regretté 2 minutes après ?',
  ],
  dares: [
    'Envoie un compliment sincère (et un peu coquin) à quelqu’un du salon.',
    'Écris un message de 5 mots maximum… très suggestif mais respectueux.',
    'Change ton statut pour quelque chose de flirty pendant 10 minutes.',
    'Lance une pluie de réactions 💋 dans le salon.',
    'Propose un toast 🍷 au salon avec une phrase d’introducteur.',
    'Décris ton look idéal de soirée en 3 emojis.',
  ],
};

export const COQUIN_HOT_SEAT = [
  { prompt: 'Hot seat', text: 'Tu es au centre : tout le monde pose une question flirty (respectueuse).' },
  { prompt: 'Défi coquin', text: 'Raconte ta pire (ou meilleure) anecdote de soirée en 4 phrases.' },
  { prompt: 'Carte rose', text: 'Choisis quelqu’un et dis-lui ce que tu apprécies chez son énergie.' },
  { prompt: 'Micro ouvert', text: 'Improvisation : invente un toast de bar pour le salon.' },
  { prompt: 'Regard virtuel', text: 'Décris le regard que tu lancerais à quelqu’un qui te plaît.' },
  { prompt: 'Playlist secrète', text: 'Cite 3 titres qui passeraient dans ta soirée privée idéale.' },
  { prompt: 'Dare soft', text: 'Écris « je te challenge » + un défi léger à la personne de ton choix.' },
  { prompt: 'Vérité express', text: 'Réponds en une phrase : flirt ou amitié d’abord ?' },
];

export const COQUIN_DAILY_SPARKS = [
  { title: 'Étincelle coquine', text: 'Envoie un 🔥 à un message qui t’a fait sourire aujourd’hui.' },
  { title: 'Flirt soft', text: 'Pose une question légère et flirty dans un salon (avec respect).' },
  { title: 'Toast du soir', text: 'Propose un toast virtuel 🍷 au salon avec une phrase d’intro.' },
  { title: 'Dare minute', text: 'Lance un petit défi coquin (consentant) à quelqu’un du chat.' },
  { title: 'Playlist rose', text: 'Partage une chanson qui met l’ambiance… sans spoiler le reste.' },
];

export function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function drawTruthOrDare(mode: 'truth' | 'dare' | 'random' = 'random'): {
  kind: 'truth' | 'dare';
  text: string;
} {
  const kind =
    mode === 'random'
      ? (Math.random() < 0.5 ? 'truth' : 'dare')
      : mode;
  const pool = kind === 'truth' ? COQUIN_TRUTH_OR_DARE.truths : COQUIN_TRUTH_OR_DARE.dares;
  return { kind, text: pickRandom(pool) };
}

export function drawHotSeatCard() {
  return pickRandom(COQUIN_HOT_SEAT);
}

export function drawCoquinIcebreaker() {
  return pickRandom(COQUIN_ICEBREAKERS);
}

export function getCoquinDailySpark(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i) * (i + 1)) >>> 0;
  }
  const item = COQUIN_DAILY_SPARKS[hash % COQUIN_DAILY_SPARKS.length];
  return { ...item, key: `coquin-${key}` };
}
