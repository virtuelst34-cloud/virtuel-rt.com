/** Liste de base pour la modération (insultes, haine, spam, illégalité). */
export const DEFAULT_BANNED_WORDS: string[] = [
  // Insultes / grossièretés
  'connard',
  'connasse',
  'salope',
  'pute',
  'putain',
  'enculé',
  'encule',
  'enculer',
  'merde',
  'batard',
  'bâtard',
  'fdp',
  'ntm',
  'tg',
  'ta gueule',
  'nique',
  'niquer',
  'nique ta mère',
  'bite',
  'couille',
  'couilles',
  'branleur',
  'branleuse',
  'trou du cul',
  'pd',
  'pédé',
  'tapette',
  'fiotte',
  // Anglais courant
  'fuck',
  'fucking',
  'shit',
  'asshole',
  'bitch',
  'motherfucker',
  'cunt',
  'dickhead',
  // Haine / discriminations
  'nazi',
  'hitler',
  'négro',
  'negro',
  'nègre',
  'sale juif',
  'sale arabe',
  'bamboula',
  'youpin',
  'bougnoule',
  // Spam / arnaques
  'crypto free',
  'free nitro',
  'onlyfans gratuit',
  'gagne de l\'argent facile',
  'clique ici maintenant',
  // Illégalité — drogues
  'dealer',
  'dealers',
  'deal de',
  'je deal',
  'vendre de la drogue',
  'achat de drogue',
  'coke',
  'cocaïne',
  'cocaine',
  'héroïne',
  'heroine',
  'crack',
  'meth',
  'méthamphétamine',
  'mdma',
  'ecstasy',
  'lsd',
  'shit à vendre',
  'weed à vendre',
  'beuh à vendre',
  'joints à vendre',
  'ketamine',
  'kétamine',
  // Illégalité — armes / violence
  'arme à vendre',
  'vendre une arme',
  'pistolet à vendre',
  'kalash',
  'kalashnikov',
  'fusil à vendre',
  'munition à vendre',
  'tuer quelqu\'un',
  'contrat de mort',
  'hitman',
  'tueur à gages',
  // Illégalité — fraude / vol / piratage
  'carte bancaire volée',
  'cb volée',
  'numéro de carte bancaire',
  'phishing',
  'arnaque paypal',
  'faux papiers',
  'faux passeport',
  'carte d\'identité falsifiée',
  'pirater un compte',
  'hack de compte',
  'compte steam volé',
  'ransomware',
  'dossier darkweb',
  // Illégalité — traite / exploitation
  'trafic d\'êtres humains',
  'trafic d\'organes',
  'vente d\'organes',
  'proxénétisme',
  'réseau de prostitution',
  // Illégalité — terrorisme / extrémisme opérationnel
  'fabriquer une bombe',
  'recette bombe',
  'attentat',
  'djihad',
  'rejoindre daesh',
  // Mineurs / exploitation sexuelle (soft filter — contenu interdit)
  'pédophile',
  'pedophile',
  'pédophilie',
  'pedophilie',
  'pedo',
  'pédo',
  'child porn',
  'childporn',
  'porno enfant',
  'porn enfant',
  'pornographie enfant',
  'pornographie infantile',
  'pornographie mineur',
  'sexe avec mineur',
  'sexe mineur',
  'nude mineur',
  'nu mineur',
  'mineur nu',
  'mineure nue',
  'exploitation mineur',
  'exploitation sexuelle mineur',
  'lolicon',
  'shotacon',
  'jailbait',
  'underage porn',
  'underage sex',
  'cp pack',
  'pack cp',
  'preteen',
  'préteen',
];

/** Fusionne la liste sauvegardée avec les nouveaux mots par défaut (sans doublon). */
export function mergeBannedWords(existing: string[] | null | undefined): string[] {
  const current = Array.isArray(existing) ? existing : [];
  const seen = new Set(current.map((w) => w.toLowerCase()));
  const merged = [...current];
  for (const word of DEFAULT_BANNED_WORDS) {
    if (!seen.has(word.toLowerCase())) {
      merged.push(word);
      seen.add(word.toLowerCase());
    }
  }
  return merged;
}

/** Retourne le premier mot interdit trouvé dans le texte, ou null. */
export function findBannedWord(
  text: string,
  words: string[] = DEFAULT_BANNED_WORDS,
): string | null {
  const normalized = text.toLowerCase();
  for (const word of words) {
    const w = word.trim().toLowerCase();
    if (!w) continue;
    if (w.includes(' ')) {
      if (normalized.includes(w)) return word;
      continue;
    }
    // Mot entier (évite de bloquer « chat » dans « achat »)
    const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(w)}(?:$|[^\\p{L}\\p{N}_])`, 'iu');
    if (re.test(text)) return word;
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
