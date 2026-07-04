interface UserMessageHistory {
  messages: string[];
  timestamps: number[];
  lastWarning?: number;
}

interface SpamDetectionResult {
  isSpam: boolean;
  reason?: 'duplicate' | 'rate_limit' | 'pattern';
  warningMessage?: string;
}

const USER_HISTORY = new Map<string, UserMessageHistory>();
const MAX_HISTORY_SIZE = 10;
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_MESSAGES_PER_WINDOW = 5;
const DUPLICATE_THRESHOLD = 3; // Same message 3 times
const DUPLICATE_WINDOW = 30000; // 30 seconds

export function detectSpam(username: string, message: string): SpamDetectionResult {
  const now = Date.now();
  let history = USER_HISTORY.get(username);

  if (!history) {
    history = { messages: [], timestamps: [] };
    USER_HISTORY.set(username, history);
  }

  // Clean old messages outside the rate limit window
  history.timestamps = history.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  history.messages = history.messages.slice(-MAX_HISTORY_SIZE);

  // Rate limiting check
  if (history.timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    const timeSinceLastWarning = history.lastWarning ? now - history.lastWarning : Infinity;
    
    // Only warn if not warned in the last minute
    if (timeSinceLastWarning > 60000) {
      history.lastWarning = now;
      return {
        isSpam: true,
        reason: 'rate_limit',
        warningMessage: '⚠️ Vous envoyez des messages trop rapidement. Attendez un peu.'
      };
    }
    
    return {
      isSpam: true,
      reason: 'rate_limit'
    };
  }

  // Duplicate message check
  const recentMessages = history.messages.slice(-DUPLICATE_THRESHOLD);
  const duplicateCount = recentMessages.filter(m => m === message).length;
  
  if (duplicateCount >= DUPLICATE_THRESHOLD - 1) {
    const timeSinceLastWarning = history.lastWarning ? now - history.lastWarning : Infinity;
    
    if (timeSinceLastWarning > 60000) {
      history.lastWarning = now;
      return {
        isSpam: true,
        reason: 'duplicate',
        warningMessage: '⚠️ Évitez de répéter le même message.'
      };
    }
    
    return {
      isSpam: true,
      reason: 'duplicate'
    };
  }

  // Pattern detection (repeated characters)
  if (isRepetitivePattern(message)) {
    return {
      isSpam: true,
      reason: 'pattern',
      warningMessage: '⚠️ Ce message semble être du spam.'
    };
  }

  // Add message to history
  history.messages.push(message);
  history.timestamps.push(now);

  return { isSpam: false };
}

function isRepetitivePattern(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 10) return false;

  // Check for repeated characters (e.g., "aaaaa")
  const repeatedChars = /(.)\1{5,}/.test(trimmed);
  if (repeatedChars) return true;

  // Check for repeated words (e.g., "hello hello hello")
  const words = trimmed.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 5 && uniqueWords.size < words.length / 2) {
    return true;
  }

  return false;
}

export function clearUserHistory(username: string): void {
  USER_HISTORY.delete(username);
}

export function getUserHistory(username: string): UserMessageHistory | undefined {
  return USER_HISTORY.get(username);
}
