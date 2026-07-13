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

class QuizService {
  private activeQuizzes: Map<string, Quiz> = new Map();
  private quizAnswers: Map<string, QuizAnswer[]> = new Map();
  private liveAnswers: Map<string, QuizLiveAnswer[]> = new Map();
  private quizParticipants: Map<string, Map<string, QuizParticipant>> = new Map();

  /**
   * Hydrate l'état local depuis une session Supabase (multi-clients / rechargement page)
   */
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

  /**
   * Crée un nouveau quiz
   */
  createQuiz(quiz: Omit<Quiz, 'id' | 'isActive' | 'currentQuestionIndex'>): Quiz {
    const newQuiz: Quiz = {
      ...quiz,
      id: crypto.randomUUID(),
      isActive: false,
      currentQuestionIndex: 0
    };

    this.activeQuizzes.set(newQuiz.id, newQuiz);
    this.quizAnswers.set(newQuiz.id, []);
    this.liveAnswers.set(newQuiz.id, []);
    this.quizParticipants.set(newQuiz.id, new Map());

    return newQuiz;
  }

  /**
   * Démarre un quiz
   */
  startQuiz(quizId: string): Quiz | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) return null;

    quiz.isActive = true;
    quiz.startedAt = new Date();
    const duration = quiz.questions.reduce((sum, q) => sum + q.timeLimit, 0);
    quiz.endsAt = new Date(Date.now() + duration * 1000);

    this.activeQuizzes.set(quizId, quiz);
    return quiz;
  }

  /**
   * Obtient le quiz actif d'un salon
   */
  getActiveQuiz(salonId: string): Quiz | null {
    for (const quiz of this.activeQuizzes.values()) {
      if (quiz.salonId === salonId && quiz.isActive) {
        return quiz;
      }
    }
    return null;
  }

  /**
   * Obtient la question actuelle d'un quiz
   */
  getCurrentQuestion(quizId: string): QuizQuestion | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz || !quiz.isActive) return null;

    return quiz.questions[quiz.currentQuestionIndex];
  }

  /**
   * Enregistre une réponse à une question
   */
  submitAnswer(
    quizId: string,
    userId: string,
    userName: string,
    questionId: string,
    answer: number
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

    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) {
      return { isCorrect: false, pointsEarned: 0, isLate: false, alreadyAnswered: false };
    }

    if (this.hasUserAnswered(quizId, userId, questionId)) {
      return { isCorrect: false, pointsEarned: 0, isLate: false, alreadyAnswered: true };
    }

    const now = new Date();
    const questionStartTime = new Date(quiz.startedAt!);
    const questionIndex = quiz.questions.findIndex(q => q.id === questionId);
    
    // Calculer le temps de début de cette question
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

    // Enregistrer la réponse
    const quizAnswer: QuizAnswer = {
      userId,
      questionId,
      answer,
      timestamp: now,
      isCorrect,
      pointsEarned
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

    // Mettre à jour le participant
    const participants = this.quizParticipants.get(quizId) || new Map();
    const participant = participants.get(userId) || {
      userId,
      userName,
      totalPoints: 0,
      correctAnswers: 0,
      totalAnswers: 0
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

  /**
   * Passe à la question suivante
   */
  nextQuestion(quizId: string): QuizQuestion | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz || !quiz.isActive) return null;

    quiz.currentQuestionIndex++;

    if (quiz.currentQuestionIndex >= quiz.questions.length) {
      // Quiz terminé
      quiz.isActive = false;
      this.activeQuizzes.set(quizId, quiz);
      return null;
    }

    this.activeQuizzes.set(quizId, quiz);
    return quiz.questions[quiz.currentQuestionIndex];
  }

  /**
   * Termine un quiz
   */
  endQuiz(quizId: string): QuizResult | null {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) return null;

    quiz.isActive = false;
    this.activeQuizzes.set(quizId, quiz);

    const participants = this.quizParticipants.get(quizId) || new Map();
    const participantArray = Array.from(participants.values());
    
    // Trier par points
    participantArray.sort((a, b) => b.totalPoints - a.totalPoints);

    const result: QuizResult = {
      quizId,
      participants: participantArray,
      winner: participantArray.length > 0 ? participantArray[0] : undefined
    };

    return result;
  }

  /**
   * Obtient le classement actuel d'un quiz
   */
  getLeaderboard(quizId: string): QuizParticipant[] {
    const participants = this.quizParticipants.get(quizId);
    if (!participants) return [];

    return Array.from(participants.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  /**
   * Obtient les résultats d'un utilisateur pour un quiz
   */
  getUserResults(quizId: string, userId: string): QuizParticipant | null {
    const participants = this.quizParticipants.get(quizId);
    if (!participants) return null;

    return participants.get(userId) || null;
  }

  /**
   * Obtient les réponses d'un utilisateur pour un quiz
   */
  getUserAnswers(quizId: string, userId: string): QuizAnswer[] {
    const answers = this.quizAnswers.get(quizId);
    if (!answers) return [];

    return answers.filter(a => a.userId === userId);
  }

  /**
   * Supprime un quiz
   */
  deleteQuiz(quizId: string): boolean {
    this.activeQuizzes.delete(quizId);
    this.quizAnswers.delete(quizId);
    this.liveAnswers.delete(quizId);
    this.quizParticipants.delete(quizId);
    return true;
  }

  /**
   * Obtient tous les quiz actifs
   */
  getAllActiveQuizzes(): Quiz[] {
    return Array.from(this.activeQuizzes.values()).filter(q => q.isActive);
  }

  /**
   * Crée un quiz prédéfini
   */
  createPresetQuiz(salonId: string, createdBy: string, preset: 'general' | 'tech' | 'culture'): Quiz {
    const presets: Record<string, QuizQuestion[]> = {
      general: [
        {
          id: crypto.randomUUID(),
          question: 'Quelle est la capitale de la France?',
          options: ['Londres', 'Berlin', 'Paris', 'Madrid'],
          correctAnswer: 2,
          timeLimit: 15,
          points: 100
        },
        {
          id: crypto.randomUUID(),
          question: 'Combien de continents y a-t-il?',
          options: ['5', '6', '7', '8'],
          correctAnswer: 2,
          timeLimit: 15,
          points: 100
        },
        {
          id: crypto.randomUUID(),
          question: 'Quelle planète est appelée la planète rouge?',
          options: ['Vénus', 'Mars', 'Jupiter', 'Saturne'],
          correctAnswer: 1,
          timeLimit: 15,
          points: 100
        }
      ],
      tech: [
        {
          id: crypto.randomUUID(),
          question: 'Que signifie HTML?',
          options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlinks Text Mark Language'],
          correctAnswer: 0,
          timeLimit: 20,
          points: 150
        },
        {
          id: crypto.randomUUID(),
          question: 'Quel langage est utilisé pour le styling web?',
          options: ['JavaScript', 'Python', 'CSS', 'PHP'],
          correctAnswer: 2,
          timeLimit: 15,
          points: 100
        }
      ],
      culture: [
        {
          id: crypto.randomUUID(),
          question: 'Qui a peint la Joconde?',
          options: ['Van Gogh', 'Picasso', 'Léonard de Vinci', 'Michel-Ange'],
          correctAnswer: 2,
          timeLimit: 20,
          points: 150
        },
        {
          id: crypto.randomUUID(),
          question: 'En quelle année le Titanic a-t-il coulé?',
          options: ['1905', '1912', '1920', '1898'],
          correctAnswer: 1,
          timeLimit: 20,
          points: 150
        }
      ]
    };

    return this.createQuiz({
      salonId,
      createdBy,
      title: `Quiz ${preset}`,
      questions: presets[preset]
    });
  }
}

export const quizService = new QuizService();
