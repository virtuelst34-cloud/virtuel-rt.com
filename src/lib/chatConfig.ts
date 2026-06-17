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
  skin: string;
  hair: string;
  look: 'short' | 'long' | 'curly' | 'bun' | 'bald' | 'cap' | 'mohawk' | 'braids' | 'beanie' | 'afro' | 'bob' | 'spiky';
  blush?: boolean;
  glasses?: boolean;
}

export const AVATAR_STYLES: Record<string, AvatarStyle> = {
  av1:  { bg: 'bg-purple-900',  text: 'text-purple-200',  border: 'border-purple-500',  skin: '#f0c9a0', hair: '#3b2a4a', look: 'long',   blush: true },
  av2:  { bg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-500', skin: '#c98a5e', hair: '#1f2e28', look: 'short' },
  av3:  { bg: 'bg-red-900',     text: 'text-red-300',     border: 'border-red-500',     skin: '#f5d6b8', hair: '#7a1f1f', look: 'curly' },
  av4:  { bg: 'bg-blue-900',    text: 'text-blue-300',    border: 'border-blue-500',    skin: '#e8b48c', hair: '#23344a', look: 'cap',    glasses: true },
  av5:  { bg: 'bg-amber-900',   text: 'text-amber-300',   border: 'border-amber-500',   skin: '#8a5a3c', hair: '#171210', look: 'afro' },
  av6:  { bg: 'bg-pink-900',    text: 'text-pink-300',    border: 'border-pink-500',    skin: '#fbe0c8', hair: '#a3456b', look: 'bun',    blush: true },
  av7:  { bg: 'bg-cyan-900',    text: 'text-cyan-300',    border: 'border-cyan-500',    skin: '#d8a877', hair: '#0e3a3f', look: 'mohawk' },
  av8:  { bg: 'bg-lime-900',    text: 'text-lime-300',    border: 'border-lime-500',    skin: '#f3cda3', hair: '#4a3a1f', look: 'braids' },
  av9:  { bg: 'bg-violet-900',  text: 'text-violet-300',  border: 'border-violet-500',  skin: '#caa17a', hair: '#2c2c54', look: 'beanie' },
  av10: { bg: 'bg-orange-900',  text: 'text-orange-300',  border: 'border-orange-500',  skin: '#f6e2c6', hair: '#5e3a1a', look: 'bob',    glasses: true },
  av11: { bg: 'bg-teal-900',    text: 'text-teal-300',    border: 'border-teal-500',    skin: '#9c6b46', hair: '#111111', look: 'bald',   blush: true },
  av12: { bg: 'bg-fuchsia-900', text: 'text-fuchsia-300', border: 'border-fuchsia-500', skin: '#eccab0', hair: '#d4546e', look: 'spiky' },
};
