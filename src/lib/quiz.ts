/**
 * Système de Quiz en temps réel
 *
 * Permet de créer et gérer des quiz interactifs dans les salons
 * avec des points XP et des classements.
 */

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number; // en secondes
  points: number;
}

export interface Quiz {
  id: string;
  salonId: string;
  createdBy: string;
  title: string;
  questions: QuizQuestion[];
  isActive: boolean;
  currentQuestionIndex: number;
  startedAt?: Date;
  endsAt?: Date;
}

export interface QuizAnswer {
  userId: string;
  questionId: string;
  answer: number;
  timestamp: Date;
  isCorrect: boolean;
  pointsEarned: number;
}

/** Réponse visible par tous les participants (persistée en base) */
export interface QuizLiveAnswer {
  questionId: string;
  userId: string;
  userName: string;
  answerIndex: number;
  answerLabel: string;
  isCorrect: boolean;
  pointsEarned: number;
  createdAt: string;
}

export interface QuizParticipant {
  userId: string;
  userName: string;
  totalPoints: number;
  correctAnswers: number;
  totalAnswers: number;
}

export interface QuizResult {
  quizId: string;
  participants: QuizParticipant[];
  winner?: QuizParticipant;
}

export type QuizPresetId =
  | 'general'
  | 'tech'
  | 'culture'
  | 'musique'
  | 'sport'
  | 'histoire'
  | 'cinema'
  | 'geographie'
  | 'coquin';

export const QUIZ_THEMES: {
  id: QuizPresetId;
  label: string;
  emoji: string;
  description: string;
  premiumOnly?: boolean;
}[] = [
  { id: 'general', label: 'Général', emoji: '🧠', description: 'Culture G variée' },
  { id: 'tech', label: 'Tech', emoji: '💻', description: 'Web & informatique' },
  { id: 'culture', label: 'Culture', emoji: '🎨', description: 'Art & patrimoine' },
  { id: 'musique', label: 'Musique', emoji: '🎵', description: 'Hits & artistes' },
  { id: 'sport', label: 'Sport', emoji: '⚽', description: 'Foot, JO & co' },
  { id: 'histoire', label: 'Histoire', emoji: '📜', description: 'Dates & événements' },
  { id: 'cinema', label: 'Cinéma', emoji: '🎬', description: 'Films & réalisateurs' },
  { id: 'geographie', label: 'Géo', emoji: '🌍', description: 'Pays & capitales' },
  { id: 'coquin', label: 'Coquin', emoji: '💋', description: 'Quiz flirty 18+', premiumOnly: true },
];

function q(
  question: string,
  options: [string, string, string, string],
  correctAnswer: number,
  points = 100,
  timeLimit = 20,
): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    question,
    options,
    correctAnswer,
    timeLimit,
    points,
  };
}

const PRESET_QUESTIONS: Record<QuizPresetId, QuizQuestion[]> = {
  general: [
    q('Quelle est la capitale de la France ?', ['Londres', 'Berlin', 'Paris', 'Madrid'], 2),
    q('Combien de continents y a-t-il ?', ['5', '6', '7', '8'], 2),
    q('Quelle planète est appelée la planète rouge ?', ['Vénus', 'Mars', 'Jupiter', 'Saturne'], 1),
    q('Combien de jours compte une année bissextile ?', ['364', '365', '366', '367'], 2),
    q('Quel animal est le plus rapide sur terre ?', ['Léopard', 'Guépard', 'Lion', 'Antilope'], 1),
    q('Combien y a-t-il de couleurs dans un arc-en-ciel ?', ['5', '6', '7', '8'], 2),
    q('Quel est le plus grand océan ?', ['Atlantique', 'Indien', 'Arctique', 'Pacifique'], 3),
    q('Combien de côtés a un hexagone ?', ['5', '6', '7', '8'], 1),
    q('Quel gaz respirons-nous principalement ?', ['Azote', 'Oxygène', 'CO₂', 'Hélium'], 1),
    q('Combien de lettres compte l’alphabet français ?', ['24', '25', '26', '27'], 2),
    q('Quel fruit est traditionnellement associé à Newton ?', ['Poire', 'Pomme', 'Banane', 'Orange'], 1),
    q('Quel est le symbole chimique de l’eau ?', ['O2', 'H2O', 'CO2', 'NaCl'], 1),
  ],
  tech: [
    q('Que signifie HTML ?', ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlinks Text Mark Language'], 0, 150),
    q('Quel langage sert au styling web ?', ['JavaScript', 'Python', 'CSS', 'PHP'], 2),
    q('Qui a créé Linux ?', ['Bill Gates', 'Steve Jobs', 'Linus Torvalds', 'Mark Zuckerberg'], 2, 150),
    q('Que signifie CPU ?', ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Process Utility'], 0),
    q('Quel protocole sécurise le web (HTTPS) ?', ['FTP', 'SSH', 'SSL/TLS', 'SMTP'], 2, 150),
    q('React est principalement utilisé pour…', ['Bases de données', 'Interfaces utilisateur', 'Systèmes d’exploitation', 'Réseaux'], 1),
    q('Que signifie API ?', ['Application Programming Interface', 'Advanced Program Integration', 'Automatic Process Input', 'App Protocol Index'], 0),
    q('Git sert principalement à…', ['Compiler du code', 'Versionner le code', 'Dessiner des UI', 'Héberger des sites'], 1),
  ],
  culture: [
    q('Qui a peint la Joconde ?', ['Van Gogh', 'Picasso', 'Léonard de Vinci', 'Michel-Ange'], 2, 150),
    q('En quelle année le Titanic a-t-il coulé ?', ['1905', '1912', '1920', '1898'], 1, 150),
    q('Qui a écrit Les Misérables ?', ['Zola', 'Hugo', 'Balzac', 'Flaubert'], 1),
    q('Quel musée abrite la Joconde ?', ['Orsay', 'Louvre', 'Pompidou', 'British Museum'], 1),
    q('Quelle ville a inventé les Jeux olympiques antiques ?', ['Rome', 'Athènes', 'Sparte', 'Troie'], 1),
    q('Combien de cordes a un violon ?', ['3', '4', '5', '6'], 1),
    q('Qui a sculpté Le Penseur ?', ['Rodin', 'Michel-Ange', 'Bernini', 'Donatello'], 0),
    q('Molière est surtout connu comme…', ['Peintre', 'Dramaturge', 'Compositeur', 'Architecte'], 1),
  ],
  musique: [
    q('Qui a chanté « Billie Jean » ?', ['Prince', 'Michael Jackson', 'Madonna', 'Bruno Mars'], 1),
    q('Combien de notes dans une gamme majeure ?', ['5', '6', '7', '8'], 2),
    q('Quel instrument a 88 touches ?', ['Guitare', 'Piano', 'Harpe', 'Orgue'], 1),
    q('Qui est surnommé le Roi du Rock’n’Roll ?', ['Chuck Berry', 'Elvis Presley', 'Buddy Holly', 'Johnny Cash'], 1),
    q('Quel groupe a sorti « Bohemian Rhapsody » ?', ['The Beatles', 'Queen', 'Pink Floyd', 'ABBA'], 1),
    q('La clé de sol se place sur quelle ligne ?', ['1re', '2e', '3e', '4e'], 1, 150),
    q('Quel hit des années 80 commence par « Take on me » ?', ['A-ha', 'Duran Duran', 'Wham!', 'Europe'], 0),
    q('Johnny Hallyday est une icône de quelle scène ?', ['Opéra', 'Rock français', 'Jazz', 'Rap'], 1),
    q('Combien de membres dans les Beatles (classique) ?', ['3', '4', '5', '6'], 1),
  ],
  sport: [
    q('Combien de joueurs sur un terrain de football (par équipe) ?', ['9', '10', '11', '12'], 2),
    q('En quelle année la France a-t-elle gagné sa 1re Coupe du monde ?', ['1994', '1998', '2002', '2006'], 1),
    q('Combien de sets max pour un match de tennis messieurs (Grand Chelem) ?', ['1', '2', '3', '5'], 3),
    q('Quel sport utilise un panier ?', ['Volley', 'Basket', 'Handball', 'Rugby'], 1),
    q('Les JO d’été 2024 se sont déroulés à…', ['Tokyo', 'Los Angeles', 'Paris', 'Londres'], 2),
    q('Combien de trous sur un parcours de golf standard ?', ['9', '12', '18', '21'], 2),
    q('Un marathon mesure environ…', ['21 km', '32 km', '42 km', '50 km'], 2),
  ],
  histoire: [
    q('En quelle année a eu lieu la Révolution française ?', ['1776', '1789', '1815', '1848'], 1),
    q('Qui était le premier président de la Ve République ?', ['Pompidou', 'De Gaulle', 'Mitterrand', 'Chirac'], 1),
    q('La chute du mur de Berlin a eu lieu en…', ['1985', '1989', '1991', '1995'], 1),
    q('Qui a découvert l’Amérique en 1492 ?', ['Magellan', 'Vasco de Gama', 'Christophe Colomb', 'Cook'], 2),
    q('Napoléon a perdu à Waterloo en…', ['1804', '1812', '1815', '1821'], 2),
    q('La Première Guerre mondiale a commencé en…', ['1912', '1914', '1916', '1918'], 1),
    q('Qui a inventé l’imprimerie en Europe ?', ['Gutenberg', 'Galilée', 'Copernic', 'Newton'], 0),
  ],
  cinema: [
    q('Qui a réalisé « Inception » ?', ['Spielberg', 'Nolan', 'Tarantino', 'Scorsese'], 1),
    q('Quel film a pour héros un hobbit nommé Frodon ?', ['Harry Potter', 'Le Seigneur des Anneaux', 'Narnia', 'Star Wars'], 1),
    q('Qui joue Jack dans Titanic ?', ['Brad Pitt', 'Leonardo DiCaprio', 'Tom Cruise', 'Matt Damon'], 1),
    q('Quelle saga commence par « Un nouvel espoir » ?', ['Star Trek', 'Star Wars', 'Dune', 'Alien'], 1),
    q('Combien d’Oscars a remporté « Titanic » ?', ['5', '8', '11', '14'], 2, 150),
    q('Qui a co-fondé Pixar (figure célèbre) ?', ['Walt Disney', 'Steve Jobs', 'George Lucas', 'James Cameron'], 1),
    q('Quel film français a pour héros Amélie Poulain ?', ['Les Choristes', 'Le Fabuleux Destin d’Amélie Poulain', 'Intouchables', 'La Haine'], 1),
  ],
  geographie: [
    q('Quelle est la capitale de l’Italie ?', ['Milan', 'Naples', 'Rome', 'Florence'], 2),
    q('Le Nil traverse principalement quel continent ?', ['Asie', 'Afrique', 'Europe', 'Amérique'], 1),
    q('Quel est le plus grand pays du monde (superficie) ?', ['Chine', 'Canada', 'USA', 'Russie'], 3),
    q('Quelle est la capitale du Japon ?', ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], 2),
    q('Quel désert est le plus grand du monde ?', ['Gobi', 'Sahara', 'Antarctique', 'Kalahari'], 2, 150),
    q('Combien de pays bordent la France métropolitaine ?', ['6', '7', '8', '9'], 2),
    q('Quelle est la capitale de la Belgique ?', ['Anvers', 'Liège', 'Bruxelles', 'Gand'], 2),
    q('Le mont Blanc se situe principalement en…', ['Espagne', 'Italie/France', 'Allemagne', 'Portugal'], 1),
  ],
  coquin: [
    q('Quelle est la couleur traditionnelle de la Saint-Valentin ?', ['Bleu', 'Vert', 'Rouge', 'Jaune'], 2),
    q('« Trouver l’âme sœur » évoque surtout…', ['Un plat', 'L’amour', 'Un métier', 'Un sport'], 1),
    q('Quel emoji est le plus « flirty » parmi ceux-ci ?', ['📎', '💋', '📁', '🧮'], 1),
    q('Un toast au bar se dit souvent en levant…', ['Un livre', 'Un verre', 'Un chapeau', 'Un stylo'], 1),
    q('« Coup de foudre » désigne…', ['Un orage', 'Une attraction soudaine', 'Une panne', 'Un dessert'], 1),
    q('Quelle chanson évoque souvent une romance nocturne ?', ['Happy Birthday', 'La Vie en rose', 'Frère Jacques', 'Marseillaise'], 1),
    q('En soirée, « icebreaker » sert à…', ['Casser la glace', 'Refroidir des boissons', 'Couper le gâteau', 'Régler la clim'], 0),
    q('Le consentement en flirt, c’est…', ['Optionnel', 'Obligatoire et révocable', 'Réservé aux Premium', 'Automatique'], 1, 150),
  ],
};

class QuizService {
  private activeQuizzes: Map<string, Quiz> = new Map();
  private quizAnswers: Map<string, QuizAnswer[]> = new Map();
  private liveAnswers: Map<string, QuizLiveAnswer[]> = new Map();
  private quizParticipants: Map<string, Map<string, QuizParticipant>> = new Map();

  syncSession(
    quiz: Quiz,
    participants?: Record<string, QuizParticipant> | null,
    answers?: QuizLiveAnswer[] | null,
  ): void {
    this.activeQuizzes.set(quiz.id, {
      ...quiz,
      startedAt: quiz.startedAt ? new Date(quiz.startedAt) : undefined,
      endsAt: quiz.endsAt ? new Date(quiz.endsAt) : undefined,
    });

    if (participants) {
      this.quizParticipants.set(
        quiz.id,
        new Map(Object.entries(participants as Record<string, QuizParticipant>)),
      );
    }

    if (answers) {
      this.liveAnswers.set(quiz.id, answers);
      this.quizAnswers.set(
        quiz.id,
        answers.map(a => ({
          userId: a.userId,
          questionId: a.questionId,
          answer: a.answerIndex,
          timestamp: new Date(a.createdAt),
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned,
        })),
      );
    }
  }

  getQuizById(quizId: string): Quiz | null {
    return this.activeQuizzes.get(quizId) ?? null;
  }

  hasUserAnswered(quizId: string, userId: string, questionId: string): boolean {
    return (this.liveAnswers.get(quizId) || []).some(
      a => a.userId === userId && a.questionId === questionId,
    );
  }

  getAnswersForQuestion(quizId: string, questionId: string): QuizLiveAnswer[] {
    return (this.liveAnswers.get(quizId) || []).filter(a => a.questionId === questionId);
  }

  createQuiz(quiz: Omit<Quiz, 'id' | 'isActive' | 'currentQuestionIndex'>): Quiz {
    const newQuiz: Quiz = {
      ...quiz,
      id: crypto.randomUUID(),
      isActive: false,
      currentQuestionIndex: 0,
    };

    this.activeQuizzes.set(newQuiz.id, newQuiz);
    this.quizAnswers.set(newQuiz.id, []);
    this.liveAnswers.set(newQuiz.id, []);
    this.quizParticipants.set(newQuiz.id, new Map());

    return newQuiz;
  }

  startQuiz(quizId: string): Quiz | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) return null;

    quiz.isActive = true;
    quiz.startedAt = new Date();
    const duration = quiz.questions.reduce((sum, qq) => sum + qq.timeLimit, 0);
    quiz.endsAt = new Date(Date.now() + duration * 1000);

    this.activeQuizzes.set(quizId, quiz);
    return quiz;
  }

  getActiveQuiz(salonId: string): Quiz | null {
    for (const quiz of this.activeQuizzes.values()) {
      if (quiz.salonId === salonId && quiz.isActive) {
        return quiz;
      }
    }
    return null;
  }

  getCurrentQuestion(quizId: string): QuizQuestion | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz || !quiz.isActive) return null;

    return quiz.questions[quiz.currentQuestionIndex];
  }

  submitAnswer(
    quizId: string,
    userId: string,
    userName: string,
    questionId: string,
    answer: number,
  ): {
    isCorrect: boolean;
    pointsEarned: number;
    isLate: boolean;
    alreadyAnswered: boolean;
    liveAnswer?: QuizLiveAnswer;
  } {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz || !quiz.isActive) {
      return { isCorrect: false, pointsEarned: 0, isLate: true, alreadyAnswered: false };
    }

    const question = quiz.questions.find(qq => qq.id === questionId);
    if (!question) {
      return { isCorrect: false, pointsEarned: 0, isLate: false, alreadyAnswered: false };
    }

    if (this.hasUserAnswered(quizId, userId, questionId)) {
      return { isCorrect: false, pointsEarned: 0, isLate: false, alreadyAnswered: true };
    }

    const now = new Date();
    const questionStartTime = new Date(quiz.startedAt!);
    const questionIndex = quiz.questions.findIndex(qq => qq.id === questionId);

    for (let i = 0; i < questionIndex; i++) {
      questionStartTime.setSeconds(questionStartTime.getSeconds() + quiz.questions[i].timeLimit);
    }

    const timeElapsed = (now.getTime() - questionStartTime.getTime()) / 1000;
    const isLate = timeElapsed > question.timeLimit;

    if (isLate) {
      return { isCorrect: false, pointsEarned: 0, isLate: true, alreadyAnswered: false };
    }

    const isCorrect = answer === question.correctAnswer;
    const pointsEarned = isCorrect ? question.points : 0;

    const quizAnswer: QuizAnswer = {
      userId,
      questionId,
      answer,
      timestamp: now,
      isCorrect,
      pointsEarned,
    };

    const answers = this.quizAnswers.get(quizId) || [];
    answers.push(quizAnswer);
    this.quizAnswers.set(quizId, answers);

    const liveAnswer: QuizLiveAnswer = {
      questionId,
      userId,
      userName,
      answerIndex: answer,
      answerLabel: question.options[answer] ?? String(answer),
      isCorrect,
      pointsEarned,
      createdAt: now.toISOString(),
    };
    const live = this.liveAnswers.get(quizId) || [];
    live.push(liveAnswer);
    this.liveAnswers.set(quizId, live);

    const participants = this.quizParticipants.get(quizId) || new Map();
    const participant = participants.get(userId) || {
      userId,
      userName,
      totalPoints: 0,
      correctAnswers: 0,
      totalAnswers: 0,
    };

    participant.totalPoints += pointsEarned;
    participant.totalAnswers++;
    if (isCorrect) {
      participant.correctAnswers++;
    }

    participants.set(userId, participant);
    this.quizParticipants.set(quizId, participants);

    return { isCorrect, pointsEarned, isLate: false, alreadyAnswered: false, liveAnswer };
  }

  nextQuestion(quizId: string): QuizQuestion | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz || !quiz.isActive) return null;

    quiz.currentQuestionIndex++;

    if (quiz.currentQuestionIndex >= quiz.questions.length) {
      quiz.isActive = false;
      this.activeQuizzes.set(quizId, quiz);
      return null;
    }

    this.activeQuizzes.set(quizId, quiz);
    return quiz.questions[quiz.currentQuestionIndex];
  }

  endQuiz(quizId: string): QuizResult | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) return null;

    quiz.isActive = false;
    this.activeQuizzes.set(quizId, quiz);

    const participants = this.quizParticipants.get(quizId) || new Map();
    const participantArray = Array.from(participants.values());

    participantArray.sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      quizId,
      participants: participantArray,
      winner: participantArray.length > 0 ? participantArray[0] : undefined,
    };
  }

  getLeaderboard(quizId: string): QuizParticipant[] {
    const participants = this.quizParticipants.get(quizId);
    if (!participants) return [];

    return Array.from(participants.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  getUserResults(quizId: string, userId: string): QuizParticipant | null {
    const participants = this.quizParticipants.get(quizId);
    if (!participants) return null;

    return participants.get(userId) || null;
  }

  getUserAnswers(quizId: string, userId: string): QuizAnswer[] {
    const answers = this.quizAnswers.get(quizId);
    if (!answers) return [];

    return answers.filter(a => a.userId === userId);
  }

  deleteQuiz(quizId: string): boolean {
    this.activeQuizzes.delete(quizId);
    this.quizAnswers.delete(quizId);
    this.liveAnswers.delete(quizId);
    this.quizParticipants.delete(quizId);
    return true;
  }

  getAllActiveQuizzes(): Quiz[] {
    return Array.from(this.activeQuizzes.values()).filter(q => q.isActive);
  }

  createPresetQuiz(salonId: string, createdBy: string, preset: QuizPresetId): Quiz {
    const theme = QUIZ_THEMES.find(t => t.id === preset);
    const questions = (PRESET_QUESTIONS[preset] || PRESET_QUESTIONS.general).map(question => ({
      ...question,
      id: crypto.randomUUID(),
    }));

    return this.createQuiz({
      salonId,
      createdBy,
      title: theme ? `Quiz ${theme.label}` : `Quiz ${preset}`,
      questions,
    });
  }
}

export const quizService = new QuizService();
