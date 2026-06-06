/**
 * Sanitiser le contenu pour prévenir les attaques XSS
 * Supprime tous les HTML et scripts potentiellement dangereux
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';
  
  // Créer un élément temporaire
  const temp = document.createElement('div');
  temp.textContent = html; // textContent échapper automatiquement
  return temp.innerHTML;
}

/**
 * Sanitiser le texte des messages
 * Supprime les balises HTML dangereuses et les scripts
 */
export function sanitizeMessageText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Remplacer les caractères spéciaux HTML
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valider une URL pour prévenir les attaques javascript:
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url, window.location.href);
    // Accepter seulement http, https, et data URLs
    return ['http:', 'https:', 'data:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitiser une URL d'image
 */
export function sanitizeImageUrl(url) {
  if (!url || !isValidUrl(url)) return null;
  return url;
}
