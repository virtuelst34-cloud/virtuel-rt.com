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
}

export const SALONS: Salon[] = [
  { id: 'musique60', name: 'Musique 60s',   type: 'chat vocal', icon: 'Music',      count: 128, welcome: '🎵 Bienvenue dans le salon Musique 60s ! Partagez vos coups de cœur des années 60.' },
  { id: 'musique80', name: 'Musique 80s',   type: 'chat vocal', icon: 'Music',      count: 84,  welcome: '🎸 Bienvenue dans le salon Musique 80s ! Les synthés et les hits de la décennie vous attendent.' },
  { id: 'karaoke',   name: 'Karaoké',       type: 'vocal',      icon: 'Mic',        live: true, welcome: '🎤 Bienvenue au Karaoké ! Prenez le micro et chantez sans retenue !' },
  { id: 'debat',     name: 'Débat',         type: 'chat vocal', icon: 'Zap',        count: 76,  welcome: '⚡ Bienvenue dans le salon Débat ! Exprimez-vous avec respect et bonne foi.' },
  { id: 'quiz',      name: 'Quiz',          type: 'chat',       icon: 'Bot',        count: 54,  welcome: '🧠 Bienvenue au Quiz ! Testez vos connaissances et défiez les autres membres.' },
  { id: 'jeunes',    name: '18–25 ans',     type: 'chat vocal', icon: 'Users',      count: 52,  welcome: '👋 Bienvenue dans le salon 18–25 ans ! Un espace pour les jeunes adultes.' },
  { id: 'lgbt',      name: 'LGBT+',         type: 'chat vocal', icon: 'Rainbow',    count: 23,  welcome: '🌈 Bienvenue dans le salon LGBT+ ! Espace bienveillant et inclusif.' },
  { id: 'divorce',   name: 'Divorce',       type: 'chat',       icon: 'HeartCrack', count: 15,  welcome: '💙 Bienvenue dans le salon Divorce. Un espace d\'écoute et de soutien.' },
  { id: 'libre',     name: 'Salon libre',   type: 'chat vocal', icon: 'DoorOpen',   count: 67,  welcome: '🚪 Bienvenue dans le Salon libre ! Tous les sujets sont les bienvenus.' },
  { id: 'insulte',   name: 'Insulte libre', type: 'chat',       icon: 'Angry',      count: 89,  welcome: '😤 Bienvenue dans le salon Insulte libre. Défoulez-vous, mais restez fair-play !' },
  { id: 'cameras',   name: 'Caméras live',  type: 'video',      icon: 'Video',      live: true, welcome: '📹 Bienvenue dans le salon Caméras live ! Activez votre caméra pour apparaître sur scène.' },
  { id: 'bar',       name: 'Bar & Détente', type: 'chat vocal', icon: 'Wine',       count: 41,  welcome: '🍷 Bienvenue au Bar & Détente ! Posez-vous, relaxez et discutez tranquillement.' },
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

export const EMOJIS = ['😀','😂','😍','🥰','😎','😢','😮','😡','🤔','👍','👎','❤️','🔥','🎉','✨','💯','🙏','😅','🤣','😭','💀','🥹','😤','🤯','🫡','👀','💪','🫂','🎵','🎶'];
export const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥'];
export const SALON_TYPES = ['chat', 'vocal', 'chat vocal', 'video'];
export const SALON_EMOJIS_LIST = ['💬','🎵','🎸','🎤','⚡','🧠','👋','🌈','💙','🚪','😤','📹','🍷','🎮','📚','🎭','🌍','💼','🎨','🏆'];

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
