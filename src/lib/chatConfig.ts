export interface Salon {
  id: string;
  name: string;
  type?: string;
  icon?: string;
  count?: number;
  live?: boolean;
  welcome?: string;
  emoji?: string;
  isPrivate?: boolean;
  password?: string;
  category_id?: string;
  subcategory?: string;
  sort_order?: number;
  /** Salon réservé Mode coquin (Premium) */
  isCoquin?: boolean;
}

export const SALONS: Salon[] = [
  // Général — essentiels uniquement
  { id: 'bienvenue', name: 'Bienvenue', type: 'chat', icon: 'DoorOpen', emoji: '👋', count: 0, category_id: 'general', subcategory: 'Accueil', sort_order: 0, welcome: '👋 Bienvenue sur Virtuel-RT ! Lisez les règles et le guide épinglés ci-dessous, puis explorez les salons. (Annonces fondateur uniquement — lecture seule pour les membres.)' },
  { id: 'annonces', name: 'Annonces', type: 'chat', icon: 'Megaphone', emoji: '📢', count: 0, category_id: 'general', subcategory: 'Annonces', sort_order: 5, welcome: '📢 Salon Annonces — infos officielles et nouveautés Virtuel-RT.' },
  { id: 'general', name: 'Salon général', type: 'chat vocal', icon: 'MessagesSquare', emoji: '💬', count: 0, category_id: 'general', subcategory: 'Communauté', sort_order: 8, welcome: '💬 Salon général — le point de rencontre de la communauté Virtuel-RT.' },

  // Divertissement
  { id: 'cameras', name: 'Caméras live', type: 'video', icon: 'Video', emoji: '📹', live: true, category_id: 'divertissement', subcategory: 'Soirée', sort_order: 100, welcome: '📹 Bienvenue dans le salon Caméras live ! Activez votre caméra pour apparaître sur scène.' },
  { id: 'bar', name: 'Bar & Détente', type: 'chat vocal', icon: 'Wine', emoji: '🍷', count: 41, category_id: 'divertissement', subcategory: 'Détente', sort_order: 110, welcome: '🍷 Bienvenue au Bar & Détente ! Posez-vous, relaxez et discutez tranquillement.' },
  { id: 'humour', name: 'Humour', type: 'chat vocal', icon: 'Laugh', emoji: '😂', count: 36, category_id: 'divertissement', subcategory: 'Humour', sort_order: 120, welcome: '😂 Blagues, memes et bonne humeur — gardez le fair-play !' },
  { id: 'cuisine', name: 'Cuisine', type: 'chat', icon: 'Utensils', emoji: '🍳', count: 28, category_id: 'divertissement', subcategory: 'Détente', sort_order: 130, welcome: '🍳 Partagez recettes, tips et fails culinaires !' },
  { id: 'voyage', name: 'Voyage', type: 'chat', icon: 'Plane', emoji: '✈️', count: 33, category_id: 'divertissement', subcategory: 'Détente', sort_order: 140, welcome: '✈️ Destinations, conseils et récits de voyage.' },

  // Musique
  { id: 'musique60', name: 'Musique 60s', type: 'chat vocal', icon: 'Music', emoji: '🎶', count: 128, category_id: 'musique', subcategory: 'Décennies', sort_order: 200, welcome: '🎵 Bienvenue dans le salon Musique 60s ! Partagez vos coups de cœur des années 60.' },
  { id: 'musique80', name: 'Musique 80s', type: 'chat vocal', icon: 'Music', emoji: '🎸', count: 84, category_id: 'musique', subcategory: 'Décennies', sort_order: 210, welcome: '🎸 Bienvenue dans le salon Musique 80s ! Les synthés et les hits de la décennie vous attendent.' },
  { id: 'musique90', name: 'Musique 90s', type: 'chat vocal', icon: 'Music', emoji: '💿', count: 61, category_id: 'musique', subcategory: 'Décennies', sort_order: 220, welcome: '💿 Hits des années 90 — boy bands, eurodance et nostalgie garantie.' },
  { id: 'musique2000', name: 'Années 2000', type: 'chat vocal', icon: 'Music', emoji: '🎧', count: 48, category_id: 'musique', subcategory: 'Décennies', sort_order: 230, welcome: '🎧 Pop, R&B et hits des années 2000 — partagez vos playlists !' },
  { id: 'karaoke', name: 'Karaoké', type: 'vocal', icon: 'Mic', emoji: '🎤', live: true, category_id: 'musique', subcategory: 'Karaoké', sort_order: 240, welcome: '🎤 Bienvenue au Karaoké ! Prenez le micro et chantez sans retenue !' },

  // Rencontres
  { id: 'amical', name: 'Faire connaissance', type: 'chat vocal', icon: 'Handshake', emoji: '🤝', count: 44, category_id: 'rencontres', subcategory: 'Amical', sort_order: 300, welcome: '🤝 Icebreakers et discussions amicales — présentez-vous !' },
  { id: 'jeunes', name: '18–25 ans', type: 'chat vocal', icon: 'Users', emoji: '👋', count: 52, category_id: 'rencontres', subcategory: 'Âge', sort_order: 310, welcome: '👋 Bienvenue dans le salon 18–25 ans ! Un espace pour les jeunes adultes.' },
  { id: 'quarante', name: '40 ans et +', type: 'chat vocal', icon: 'Users', emoji: '☕', count: 27, category_id: 'rencontres', subcategory: 'Âge', sort_order: 320, welcome: '☕ Salon 40 ans et + — échanges posés et bonne compagnie.' },

  // Jeux
  { id: 'quiz', name: 'Quiz', type: 'chat', icon: 'Bot', emoji: '🧠', count: 54, category_id: 'jeux', subcategory: 'Quiz', sort_order: 400, welcome: '🧠 Bienvenue au Quiz ! Testez vos connaissances et défiez les autres membres.' },
  { id: 'blindtest', name: 'Blind test', type: 'chat vocal', icon: 'Headphones', emoji: '🎼', count: 39, category_id: 'jeux', subcategory: 'Défis', sort_order: 410, welcome: '🎼 Blind test — devinez les titres, chantez les refrains !' },
  { id: 'gaming', name: 'Gaming', type: 'chat vocal', icon: 'Gamepad2', emoji: '🎮', count: 72, category_id: 'jeux', subcategory: 'Compétition', sort_order: 420, welcome: '🎮 Looking for group, tips et sessions multi.' },
  { id: 'sport', name: 'Sport', type: 'chat', icon: 'Trophy', emoji: '⚽', count: 45, category_id: 'jeux', subcategory: 'Compétition', sort_order: 430, welcome: '⚽ Foot, JO, résultats et débats sportifs fair-play.' },

  // Aide
  { id: 'divorce', name: 'Divorce', type: 'chat', icon: 'HeartCrack', emoji: '💙', count: 15, category_id: 'aide', subcategory: 'Soutien', sort_order: 500, welcome: '💙 Bienvenue dans le salon Divorce. Un espace d\'écoute et de soutien.' },
  { id: 'aide', name: 'Entraide', type: 'chat', icon: 'HeartHandshake', emoji: '🤲', count: 22, category_id: 'aide', subcategory: 'Conseils', sort_order: 510, welcome: '🤲 Besoin d\'un coup de main ou d\'une oreille attentive ? Vous êtes au bon endroit.' },

  // Régional
  { id: 'france', name: 'France', type: 'chat vocal', icon: 'MapPin', emoji: '🇫🇷', count: 55, category_id: 'regional', subcategory: 'France', sort_order: 600, welcome: '🇫🇷 Salon France — actu, régions et discussions entre Francophones.' },
  { id: 'belgique', name: 'Belgique', type: 'chat vocal', icon: 'MapPin', emoji: '🇧🇪', count: 18, category_id: 'regional', subcategory: 'Belgique', sort_order: 610, welcome: '🇧🇪 Accents, frites et bonne humeur — salon Belgique.' },
  { id: 'quebec', name: 'Québec', type: 'chat vocal', icon: 'MapPin', emoji: '🇨🇦', count: 14, category_id: 'regional', subcategory: 'Québec', sort_order: 620, welcome: '🇨🇦 Bienvenue au salon Québec — discussions et culture québécoise.' },
  { id: 'suisse', name: 'Suisse', type: 'chat vocal', icon: 'MapPin', emoji: '🇨🇭', count: 11, category_id: 'regional', subcategory: 'Suisse', sort_order: 630, welcome: '🇨🇭 Salon Suisse — romandie, traditions et discussions locales.' },

  // LGBT+
  { id: 'lgbt', name: 'LGBT+', type: 'chat vocal', icon: 'Rainbow', emoji: '🌈', count: 23, category_id: 'lgbt', subcategory: 'Communauté', sort_order: 700, welcome: '🌈 Bienvenue dans le salon LGBT+ ! Espace bienveillant et inclusif.' },

  // Libre
  { id: 'libre', name: 'Salon libre', type: 'chat vocal', icon: 'DoorOpen', emoji: '🚪', count: 67, category_id: 'libre', subcategory: 'Libre', sort_order: 800, welcome: '🚪 Bienvenue dans le Salon libre ! Tous les sujets sont les bienvenus.' },
  { id: 'debat', name: 'Débat', type: 'chat vocal', icon: 'Zap', emoji: '⚡', count: 76, category_id: 'libre', subcategory: 'Débat', sort_order: 810, welcome: '⚡ Bienvenue dans le salon Débat ! Exprimez-vous avec respect et bonne foi.' },
  { id: 'insulte', name: 'Insulte libre', type: 'chat', icon: 'Angry', emoji: '😤', count: 89, category_id: 'libre', subcategory: 'Libre', sort_order: 820, welcome: '😤 Bienvenue dans le salon Insulte libre. Défoulez-vous, mais restez fair-play !' },

  // Culture
  { id: 'cinema', name: 'Cinéma', type: 'chat', icon: 'Clapperboard', emoji: '🎬', count: 38, category_id: 'culture', subcategory: 'Cinéma', sort_order: 900, welcome: '🎬 Critiques, recommandations et spoiler alerts (avec spoiler tags SVP).' },
  { id: 'series', name: 'Séries TV', type: 'chat', icon: 'Tv', emoji: '📺', count: 42, category_id: 'culture', subcategory: 'Séries', sort_order: 910, welcome: '📺 Séries du moment, spoiler tags obligatoires et recommandations welcome.' },
  { id: 'livres', name: 'Livres', type: 'chat', icon: 'BookOpen', emoji: '📚', count: 19, category_id: 'culture', subcategory: 'Livres', sort_order: 920, welcome: '📚 Romans, BD, essais — partagez vos lectures du moment.' },

  // Tech
  { id: 'tech', name: 'Tech & Web', type: 'chat', icon: 'Cpu', emoji: '💻', count: 31, category_id: 'tech', subcategory: 'Web', sort_order: 1000, welcome: '💻 Actu tech, outils et discussions geek bienveillantes.' },
  { id: 'ia', name: 'IA & futur', type: 'chat', icon: 'Sparkles', emoji: '🤖', count: 26, category_id: 'tech', subcategory: 'IA', sort_order: 1010, welcome: '🤖 Intelligence artificielle, outils et débats sur le futur — curiosité bienvenue.' },

  // Coquins Premium (masqués hors Mode coquin)
  { id: 'coquin_lounge', name: 'Lounge coquin', type: 'chat vocal', icon: 'Flame', emoji: '🔥', count: 12, category_id: 'coquin', subcategory: 'Soirée', sort_order: 9000, isCoquin: true, welcome: '🔥 Lounge coquin (18+ Premium) — ambiance flirty, respect et consentement avant tout.' },
  { id: 'coquin_flirt', name: 'Flirt soft', type: 'chat', icon: 'Heart', emoji: '💋', count: 9, category_id: 'coquin', subcategory: 'Flirt', sort_order: 9010, isCoquin: true, welcome: '💋 Flirt soft — messages suggestifs OK, harcèlement jamais.' },
  { id: 'coquin_jeux', name: 'Jeux coquins', type: 'chat', icon: 'Sparkles', emoji: '😏', count: 7, category_id: 'coquin', subcategory: 'Jeux', sort_order: 9020, isCoquin: true, welcome: '😏 Jeux coquins — Action ou vérité, défis hot seat… toujours consentants.' },
];

// Membres simulés sur scène (micro actif) par salon
export interface SceneMember {
  name: string;
  avatar: string;
  initials: string;
  speaking: boolean;
}

export const SCENE_MEMBERS: Record<string, SceneMember[]> = {
  musique60: [
    { name: 'Cantique',  avatar: 'av6', initials: 'CA', speaking: true  },
    { name: 'PiCanna',   avatar: 'av3', initials: 'PC', speaking: false },
    { name: 'Coeur',     avatar: 'av2', initials: 'CO', speaking: true  },
  ],
  karaoke: [
    { name: 'Thierry',   avatar: 'av5', initials: 'TH', speaking: true  },
    { name: 'Mélanie',   avatar: 'av1', initials: 'ME', speaking: false },
  ],
  debat: [
    { name: 'Cantique',  avatar: 'av6', initials: 'CA', speaking: true  },
    { name: 'Coeur',     avatar: 'av2', initials: 'CO', speaking: false },
    { name: 'Thierry',   avatar: 'av5', initials: 'TH', speaking: true  },
    { name: 'PiCanna',   avatar: 'av3', initials: 'PC', speaking: false },
  ],
  libre: [
    { name: 'Mélanie',   avatar: 'av1', initials: 'ME', speaking: true  },
  ],
};

export const EMOJIS = ['😀','😂','😍','🥰','😎','😢','😮','😡','🤔','👍','👎','❤️','🔥','🎉','✨','💯','🙏','😅','🤣','😭','💀','🥹','😤','🤯','🫡','👀','💪','🫂','🎵','🎶','💋','😏','🍷','🌶️'];
export const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥'];
/** Réactions rapides Mode coquin (Premium) — fusionnées dans le picker si actif */
export const COQUIN_QUICK_REACTIONS = ['🔥','💋','😏','🍷'];
export const SALON_TYPES = ['chat', 'vocal', 'chat vocal', 'video'];
export const SALON_EMOJIS_LIST = ['💬','🎵','🎸','🎤','⚡','🧠','👋','🌈','💙','🚪','😤','📹','🍷','🎮','📚','🎭','🌍','💼','🎨','🏆','🔥','💋','📢','🍳','✈️','🇧🇪','🇨🇦','🇫🇷','🇨🇭','🎬','📺','💻','🤖','⚽','🤝','😏','😂','🎧','🎼','☕','🤲'];

export interface AvatarStyle {
  bg: string;
  text: string;
  border: string;
  styleType?: 'human' | 'minimal' | 'robot' | 'animal' | 'emoji' | 'abstract' | 'pixel' | 'neon' | 'geometric' | 'glass' | 'wave' | 'holo' | 'wireframe';
  skin?: string;
  hair?: string;
  look?: 'short' | 'long' | 'curly' | 'bun' | 'bald' | 'afro' | 'mohawk' | 'braids' | 'wavy' | 'ponytail' | 'undercut' | 'pixie' | 'dreads' | 'slicked';
  blush?: boolean;
  glasses?: boolean;
  animalType?: 'cat' | 'dog' | 'fox' | 'owl' | 'bear' | 'rabbit' | 'panda' | 'lion' | 'penguin' | 'frog';
  emojiType?: 'happy' | 'cool' | 'love' | 'surprised' | 'thinking' | 'wink' | 'sad' | 'angry' | 'sleepy';
  modernType?: 'cyan' | 'magenta' | 'electric' | 'hex' | 'prism' | 'diamond' | 'orb' | 'bubbles' | 'fluid' | 'ripple' | 'rainbow' | 'shards' | 'sphere' | 'globe';
}

const sortAvatarIds = (ids: string[]) =>
  [...ids].sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10));

export const AVATAR_STYLES: Record<string, AvatarStyle> = {
  // Human avatars
  av1:  { bg: 'bg-purple-900',  text: 'text-purple-200',  border: 'border-purple-500',  styleType: 'human', skin: '#f5d0b0', hair: '#3b2a4a', look: 'long',     blush: true },
  av2:  { bg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-500', styleType: 'human', skin: '#c98a5e', hair: '#1f2e28', look: 'short' },
  av3:  { bg: 'bg-red-900',     text: 'text-red-300',     border: 'border-red-500',     styleType: 'human', skin: '#e8c8a8', hair: '#7a1f1f', look: 'curly' },
  av4:  { bg: 'bg-blue-900',    text: 'text-blue-300',    border: 'border-blue-500',    styleType: 'human', skin: '#d4a878', hair: '#23344a', look: 'wavy',     glasses: true },
  av5:  { bg: 'bg-amber-900',   text: 'text-amber-300',   border: 'border-amber-500',   styleType: 'human', skin: '#8a5a3c', hair: '#171210', look: 'afro' },
  av6:  { bg: 'bg-pink-900',    text: 'text-pink-300',    border: 'border-pink-500',    styleType: 'human', skin: '#fbe0c8', hair: '#a3456b', look: 'bun',      blush: true },
  
  // Minimal avatars
  av7:  { bg: 'bg-cyan-900',    text: 'text-cyan-300',    border: 'border-cyan-500',    styleType: 'minimal' },
  av8:  { bg: 'bg-lime-900',    text: 'text-lime-300',    border: 'border-lime-500',    styleType: 'minimal' },
  av9:  { bg: 'bg-violet-900',  text: 'text-violet-300',  border: 'border-violet-500',  styleType: 'minimal' },
  
  // Robot avatars
  av10: { bg: 'bg-slate-900',   text: 'text-slate-300',   border: 'border-slate-500',   styleType: 'robot' },
  av11: { bg: 'bg-zinc-900',    text: 'text-zinc-300',    border: 'border-zinc-500',    styleType: 'robot' },
  av12: { bg: 'bg-stone-900',   text: 'text-stone-300',   border: 'border-stone-500',   styleType: 'robot' },
  
  // Animal avatars
  av13: { bg: 'bg-orange-900',  text: 'text-orange-300',  border: 'border-orange-500',  styleType: 'animal', animalType: 'cat' },
  av14: { bg: 'bg-rose-900',    text: 'text-rose-300',    border: 'border-rose-500',    styleType: 'animal', animalType: 'dog' },
  av15: { bg: 'bg-indigo-900',  text: 'text-indigo-300',  border: 'border-indigo-500',  styleType: 'animal', animalType: 'fox' },
  av16: { bg: 'bg-teal-900',    text: 'text-teal-300',    border: 'border-teal-500',    styleType: 'animal', animalType: 'owl' },
  av17: { bg: 'bg-fuchsia-900', text: 'text-fuchsia-300', border: 'border-fuchsia-500', styleType: 'animal', animalType: 'bear' },
  av18: { bg: 'bg-sky-900',     text: 'text-sky-300',     border: 'border-sky-500',     styleType: 'animal', animalType: 'rabbit' },
  
  // Emoji avatars
  av19: { bg: 'bg-yellow-500',  text: 'text-yellow-900',  border: 'border-yellow-400',  styleType: 'emoji', emojiType: 'happy' },
  av20: { bg: 'bg-blue-500',    text: 'text-blue-900',    border: 'border-blue-400',    styleType: 'emoji', emojiType: 'cool' },
  av21: { bg: 'bg-pink-500',    text: 'text-pink-900',    border: 'border-pink-400',    styleType: 'emoji', emojiType: 'love' },
  av22: { bg: 'bg-green-500',   text: 'text-green-900',   border: 'border-green-400',   styleType: 'emoji', emojiType: 'surprised' },
  av23: { bg: 'bg-purple-500',  text: 'text-purple-900',  border: 'border-purple-400',  styleType: 'emoji', emojiType: 'thinking' },
  
  // Abstract avatars
  av24: { bg: 'bg-gradient-to-br from-purple-600 to-pink-600', text: 'text-white', border: 'border-white/30', styleType: 'abstract' },
  av25: { bg: 'bg-gradient-to-br from-blue-600 to-cyan-600',   text: 'text-white', border: 'border-white/30', styleType: 'abstract' },
  av26: { bg: 'bg-gradient-to-br from-orange-600 to-red-600',  text: 'text-white', border: 'border-white/30', styleType: 'abstract' },
  
  // Pixel avatars
  av27: { bg: 'bg-green-900',   text: 'text-green-300',   border: 'border-green-500',   styleType: 'pixel' },
  av28: { bg: 'bg-red-900',     text: 'text-red-300',     border: 'border-red-500',     styleType: 'pixel' },
  av29: { bg: 'bg-blue-900',    text: 'text-blue-300',    border: 'border-blue-500',    styleType: 'pixel' },
  av30: { bg: 'bg-yellow-900',  text: 'text-yellow-300',  border: 'border-yellow-500',  styleType: 'pixel' },

  // Extended human avatars
  av31: { bg: 'bg-neutral-800',  text: 'text-neutral-200',  border: 'border-neutral-500',  styleType: 'human', skin: '#e0b896', hair: '#2a2a2a', look: 'bald',    glasses: true },
  av32: { bg: 'bg-orange-800',   text: 'text-orange-200',   border: 'border-orange-500',   styleType: 'human', skin: '#d4a574', hair: '#c0392b', look: 'mohawk' },
  av33: { bg: 'bg-rose-800',     text: 'text-rose-200',     border: 'border-rose-500',     styleType: 'human', skin: '#f5d0b0', hair: '#4a3728', look: 'braids',  blush: true },
  av34: { bg: 'bg-cyan-800',     text: 'text-cyan-200',     border: 'border-cyan-500',     styleType: 'human', skin: '#c98a5e', hair: '#1a3a4a', look: 'ponytail' },
  av35: { bg: 'bg-slate-800',    text: 'text-slate-200',    border: 'border-slate-500',    styleType: 'human', skin: '#8a5a3c', hair: '#0f172a', look: 'undercut' },
  av36: { bg: 'bg-lime-800',     text: 'text-lime-200',     border: 'border-lime-500',     styleType: 'human', skin: '#fbe0c8', hair: '#6b4423', look: 'pixie',   blush: true },
  av37: { bg: 'bg-amber-800',    text: 'text-amber-200',    border: 'border-amber-500',    styleType: 'human', skin: '#5c4033', hair: '#1a1a1a', look: 'dreads' },
  av38: { bg: 'bg-indigo-800',   text: 'text-indigo-200',   border: 'border-indigo-500',   styleType: 'human', skin: '#d4a878', hair: '#2c1810', look: 'slicked', glasses: true },

  // Extended animal avatars
  av39: { bg: 'bg-gray-800',     text: 'text-gray-200',     border: 'border-gray-500',     styleType: 'animal', animalType: 'panda' },
  av40: { bg: 'bg-yellow-800',   text: 'text-yellow-200',   border: 'border-yellow-500',   styleType: 'animal', animalType: 'lion' },
  av41: { bg: 'bg-sky-800',      text: 'text-sky-200',      border: 'border-sky-500',      styleType: 'animal', animalType: 'penguin' },
  av42: { bg: 'bg-green-800',    text: 'text-green-200',    border: 'border-green-500',    styleType: 'animal', animalType: 'frog' },

  // Extended emoji avatars
  av43: { bg: 'bg-amber-500',    text: 'text-amber-900',    border: 'border-amber-400',    styleType: 'emoji', emojiType: 'wink' },
  av44: { bg: 'bg-blue-400',     text: 'text-blue-900',     border: 'border-blue-300',     styleType: 'emoji', emojiType: 'sad' },
  av45: { bg: 'bg-red-500',      text: 'text-red-900',      border: 'border-red-400',      styleType: 'emoji', emojiType: 'angry' },
  av46: { bg: 'bg-indigo-500',   text: 'text-indigo-900',   border: 'border-indigo-400',   styleType: 'emoji', emojiType: 'sleepy' },

  // Extended abstract avatars
  av47: { bg: 'bg-gradient-to-br from-emerald-600 to-teal-600',  text: 'text-white', border: 'border-white/30', styleType: 'abstract' },
  av48: { bg: 'bg-gradient-to-br from-violet-600 to-indigo-600', text: 'text-white', border: 'border-white/30', styleType: 'abstract' },

  // Modern neon avatars
  av49: { bg: 'bg-black',        text: 'text-cyan-300',    border: 'border-cyan-400',    styleType: 'neon',     modernType: 'cyan' },
  av50: { bg: 'bg-black',        text: 'text-fuchsia-300', border: 'border-fuchsia-400', styleType: 'neon',     modernType: 'magenta' },
  av51: { bg: 'bg-slate-950',    text: 'text-blue-300',    border: 'border-blue-400',    styleType: 'neon',     modernType: 'electric' },

  // Modern geometric avatars
  av52: { bg: 'bg-zinc-900',     text: 'text-amber-300',   border: 'border-amber-500',   styleType: 'geometric', modernType: 'hex' },
  av53: { bg: 'bg-neutral-900',  text: 'text-rose-300',    border: 'border-rose-500',    styleType: 'geometric', modernType: 'prism' },
  av54: { bg: 'bg-stone-900',    text: 'text-teal-300',    border: 'border-teal-500',    styleType: 'geometric', modernType: 'diamond' },

  // Modern glass avatars
  av55: { bg: 'bg-gradient-to-br from-slate-700/80 to-slate-900', text: 'text-white', border: 'border-white/40', styleType: 'glass', modernType: 'orb' },
  av56: { bg: 'bg-gradient-to-br from-indigo-900/80 to-purple-950', text: 'text-white', border: 'border-white/30', styleType: 'glass', modernType: 'bubbles' },

  // Modern wave/fluid avatars
  av57: { bg: 'bg-gradient-to-br from-pink-600 to-orange-500', text: 'text-white', border: 'border-white/30', styleType: 'wave', modernType: 'fluid' },
  av58: { bg: 'bg-gradient-to-br from-cyan-600 to-blue-700',   text: 'text-white', border: 'border-white/30', styleType: 'wave', modernType: 'ripple' },

  // Modern holographic avatars
  av59: { bg: 'bg-gradient-to-br from-violet-700 via-fuchsia-600 to-cyan-500', text: 'text-white', border: 'border-white/40', styleType: 'holo', modernType: 'rainbow' },
  av60: { bg: 'bg-gradient-to-br from-rose-600 via-amber-500 to-lime-500',      text: 'text-white', border: 'border-white/40', styleType: 'holo', modernType: 'shards' },

  // Modern wireframe avatars
  av61: { bg: 'bg-slate-950',    text: 'text-emerald-300', border: 'border-emerald-500', styleType: 'wireframe', modernType: 'sphere' },
  av62: { bg: 'bg-gray-950',     text: 'text-sky-300',     border: 'border-sky-500',     styleType: 'wireframe', modernType: 'globe' },
};

export const AVATAR_IDS = sortAvatarIds(Object.keys(AVATAR_STYLES));
