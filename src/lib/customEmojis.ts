import { Salon } from './chatConfig';

export interface CustomEmojiSet {
  salonId: string;
  emojis: string[];
  name: string;
}

// Emojis personnalisés par salon
export const CUSTOM_EMOJI_SETS: CustomEmojiSet[] = [
  {
    salonId: 'musique60',
    emojis: ['🎵', '🎸', '🎹', '🥁', '🎷', '🎺', '🎻', '🎤', '🎧', '💿', '📀', '🎼'],
    name: 'Musique 60s',
  },
  {
    salonId: 'musique80',
    emojis: ['🎸', '🎹', '🥁', '🎤', '🎧', '💿', '📀', '🎼', '🎵', '🎶', '🔊', '🔉'],
    name: 'Musique 80s',
  },
  {
    salonId: 'karaoke',
    emojis: ['🎤', '🎵', '🎶', '🎼', '🎹', '🎸', '🥁', '🎷', '🎺', '🎻', '🎧', '⭐'],
    name: 'Karaoké',
  },
  {
    salonId: 'debat',
    emojis: ['💬', '🗣️', '🤔', '💡', '📝', '📚', '🎯', '⚖️', '🏆', '🤝', '👍', '👎'],
    name: 'Débat',
  },
  {
    salonId: 'quiz',
    emojis: ['🧠', '❓', '💡', '🎯', '🏆', '🥇', '🥈', '🥉', '📚', '✅', '❌', '⏰'],
    name: 'Quiz',
  },
  {
    salonId: 'jeunes',
    emojis: ['👋', '😊', '🎉', '🎮', '📱', '🎵', '🎬', '📸', '🏀', '⚽', '🍕', '🍔'],
    name: '18-25 ans',
  },
  {
    salonId: 'lgbt',
    emojis: ['🌈', '🏳️‍🌈', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '🤝', '💪'],
    name: 'LGBT+',
  },
  {
    salonId: 'divorce',
    emojis: ['💙', '💪', '🤝', '❤️', '🌱', '🌻', '☀️', '🌈', '🦋', '🕊️', '🧘', '💆'],
    name: 'Divorce',
  },
  {
    salonId: 'libre',
    emojis: ['💬', '🎉', '🎊', '🎭', '🎪', '🎨', '🎬', '🎵', '📚', '🎮', '🍕', '☕'],
    name: 'Salon libre',
  },
  {
    salonId: 'insulte',
    emojis: ['😤', '💢', '🤬', '😡', '👊', '💪', '🔥', '⚡', '💥', '🎭', '😈', '👿'],
    name: 'Insulte libre',
  },
  {
    salonId: 'cameras',
    emojis: ['📹', '🎥', '📸', '🎬', '🎞️', '📽️', '🎞️', '🎭', '🎪', '🎨', '🎵', '🎤'],
    name: 'Caméras live',
  },
  {
    salonId: 'bar',
    emojis: ['🍷', '🍺', '🍸', '🍹', '🥂', '🍾', '🍽️', '🍴', '🧀', '🥖', '🍕', '☕'],
    name: 'Bar & Détente',
  },
];

// Emojis par défaut pour les salons sans configuration personnalisée
const DEFAULT_EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '🤔', '👀'];

/**
 * Récupère les emojis personnalisés pour un salon
 */
export function getCustomEmojis(salonId: string): string[] {
  const customSet = CUSTOM_EMOJI_SETS.find(set => set.salonId === salonId);
  return customSet?.emojis || DEFAULT_EMOJIS;
}

/**
 * Récupère le nom du set d'emojis pour un salon
 */
export function getEmojiSetName(salonId: string): string {
  const customSet = CUSTOM_EMOJI_SETS.find(set => set.salonId === salonId);
  return customSet?.name || 'Par défaut';
}
