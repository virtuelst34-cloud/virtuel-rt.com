import { Salon } from './chatConfig';

// Interfaces locales pour éviter les dépendances circulaires
export interface Message {
  id: string;
  salon: string;
  author_name: string;
  author_avatar: string;
  author_initials: string;
  text: string;
  timestamp?: string;
  created_date: string;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  is_system?: boolean;
  is_announcement?: boolean;
  replyTo?: Message;
  image_url?: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  initials: string;
  bio: string;
  xp: number;
  level: number;
  monthlyXP: number;
  isBanned: boolean;
  isMuted: boolean;
  banReason: string;
  isPremium: boolean;
  isAdmin: boolean;
  status: 'online' | 'away' | 'busy' | 'offline';
  joinedAt: string;
  statusText?: string;
  email?: string;
  emailVerified?: boolean;
}

export interface SearchResult {
  type: 'message' | 'user' | 'salon';
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  timestamp?: string;
  relevance: number;
}

export interface SearchFilters {
  query: string;
  type?: 'all' | 'messages' | 'users' | 'salons';
  dateFrom?: string;
  dateTo?: string;
  salonId?: string;
  authorName?: string;
}

/**
 * Recherche avancée dans les messages
 */
export function searchMessages(
  messages: Message[],
  filters: SearchFilters
): SearchResult[] {
  const { query, dateFrom, dateTo, authorName, salonId } = filters;
  
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  messages.forEach(message => {
    // Filtrer par salon
    if (salonId && message.salon !== salonId) {
      return;
    }

    // Filtrer par auteur
    if (authorName && message.author_name.toLowerCase() !== authorName.toLowerCase()) {
      return;
    }

    // Filtrer par date
    if (dateFrom || dateTo) {
      const msgDate = new Date(message.created_date);
      if (dateFrom && msgDate < new Date(dateFrom)) return;
      if (dateTo && msgDate > new Date(dateTo)) return;
    }

    // Recherche dans le texte
    const textMatch = message.text.toLowerCase().includes(queryLower);
    const authorMatch = message.author_name.toLowerCase().includes(queryLower);
    
    if (textMatch || authorMatch) {
      const relevance = textMatch ? 1 : 0.5;
      results.push({
        type: 'message',
        id: message.id,
        title: message.author_name,
        subtitle: message.author_initials,
        content: message.text,
        timestamp: message.created_date,
        relevance
      });
    }
  });

  // Trier par pertinence
  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Recherche dans les utilisateurs
 */
export function searchUsers(
  users: Record<string, UserProfile>,
  query: string
): SearchResult[] {
  if (!query.trim()) return [];

  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  Object.entries(users).forEach(([name, user]) => {
    const nameMatch = name.toLowerCase().includes(queryLower);
    const bioMatch = user.bio?.toLowerCase().includes(queryLower);

    if (nameMatch || bioMatch) {
      const relevance = nameMatch ? 1 : 0.5;
      results.push({
        type: 'user',
        id: name,
        title: name,
        subtitle: user.initials,
        content: user.bio,
        relevance
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Recherche dans les salons
 */
export function searchSalons(
  salons: Salon[],
  query: string
): SearchResult[] {
  if (!query.trim()) return [];

  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  salons.forEach(salon => {
    const nameMatch = salon.name.toLowerCase().includes(queryLower);
    const welcomeMatch = salon.welcome?.toLowerCase().includes(queryLower);
    const typeMatch = salon.type?.toLowerCase().includes(queryLower);

    if (nameMatch || welcomeMatch || typeMatch) {
      const relevance = nameMatch ? 1 : (welcomeMatch ? 0.7 : 0.5);
      results.push({
        type: 'salon',
        id: salon.id,
        title: salon.name,
        subtitle: salon.type,
        content: salon.welcome,
        relevance
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Recherche globale combinée
 */
export function globalSearch(
  messages: Record<string, Message[]>,
  users: Record<string, UserProfile>,
  salons: Salon[],
  filters: SearchFilters
): SearchResult[] {
  const { type = 'all', query } = filters;

  if (!query.trim()) return [];

  const allResults: SearchResult[] = [];

  // Recherche messages
  if (type === 'all' || type === 'messages') {
    const allMessages = Object.values(messages).flat();
    const messageResults = searchMessages(allMessages, filters);
    allResults.push(...messageResults);
  }

  // Recherche utilisateurs
  if (type === 'all' || type === 'users') {
    const userResults = searchUsers(users, query);
    allResults.push(...userResults);
  }

  // Recherche salons
  if (type === 'all' || type === 'salons') {
    const salonResults = searchSalons(salons, query);
    allResults.push(...salonResults);
  }

  // Trier par pertinence globale
  return allResults.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Filtre les messages par critères
 */
export function filterMessages(
  messages: Message[],
  filters: {
    dateFrom?: string;
    dateTo?: string;
    authorName?: string;
    type?: 'all' | 'system' | 'announcement' | 'normal';
  }
): Message[] {
  return messages.filter(message => {
    // Filtre par date
    if (filters.dateFrom || filters.dateTo) {
      const msgDate = new Date(message.created_date);
      if (filters.dateFrom && msgDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && msgDate > new Date(filters.dateTo)) return false;
    }

    // Filtre par auteur
    if (filters.authorName && message.author_name !== filters.authorName) {
      return false;
    }

    // Filtre par type
    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'system' && !message.is_system) return false;
      if (filters.type === 'announcement' && !message.is_announcement) return false;
      if (filters.type === 'normal' && (message.is_system || message.is_announcement)) return false;
    }

    return true;
  });
}
