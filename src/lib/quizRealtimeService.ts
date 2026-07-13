import { supabase } from './supabase';
import { ensureGuestSessionContext } from './guestAuthService';
import {
  quizService,
  Quiz,
  QuizQuestion,
  QuizParticipant,
  QuizResult,
  QuizLiveAnswer,
} from './quiz';

export type QuizEvent =
  | { type: 'quiz_started'; quiz: Quiz }
  | { type: 'quiz_updated'; quiz: Quiz; questionIndex: number }
  | { type: 'answer_submitted'; answer: QuizLiveAnswer }
  | { type: 'quiz_ended'; result: QuizResult };

type QuizListener = (event: QuizEvent) => void;

function rowToQuiz(row: Record<string, unknown>): Quiz {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    createdBy: row.created_by as string,
    title: row.title as string,
    questions: (row.questions as QuizQuestion[]) || [],
    isActive: !!row.is_active,
    currentQuestionIndex: (row.current_question_index as number) || 0,
    startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
    endsAt: row.ends_at ? new Date(row.ends_at as string) : undefined,
  };
}

function parseLiveAnswers(row: Record<string, unknown>): QuizLiveAnswer[] {
  return (row.answers as QuizLiveAnswer[]) || [];
}

function parseParticipants(row: Record<string, unknown>): Record<string, QuizParticipant> {
  return (row.participants as Record<string, QuizParticipant>) || {};
}

function syncFromRow(row: Record<string, unknown>): Quiz {
  const quiz = rowToQuiz(row);
  quizService.syncSession(quiz, parseParticipants(row), parseLiveAnswers(row));
  return quiz;
}

class QuizRealtimeService {
  private channels = new Map<string, ReturnType<typeof supabase.channel>>();
  private listeners = new Map<string, Set<QuizListener>>();

  subscribe(salonId: string, listener: QuizListener): () => void {
    this.ensureChannel(salonId);
    if (!this.listeners.has(salonId)) this.listeners.set(salonId, new Set());
    this.listeners.get(salonId)!.add(listener);
    return () => this.listeners.get(salonId)?.delete(listener);
  }

  private emit(salonId: string, event: QuizEvent): void {
    for (const listener of this.listeners.get(salonId) || []) {
      listener(event);
    }
  }

  private ensureChannel(salonId: string): void {
    if (this.channels.has(salonId)) return;

    const channel = supabase
      .channel(`quiz:${salonId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_sessions', filter: `salon_id=eq.${salonId}` },
        (payload) => {
          const row = (payload.new || payload.old) as Record<string, unknown>;
          if (!row?.id) return;
          const quiz = syncFromRow(row);
          if (payload.eventType === 'DELETE') {
            const result = quizService.endQuiz(quiz.id);
            if (result) this.emit(salonId, { type: 'quiz_ended', result });
            return;
          }
          if (quiz.isActive && payload.eventType === 'INSERT') {
            this.emit(salonId, { type: 'quiz_started', quiz });
          } else {
            this.emit(salonId, {
              type: 'quiz_updated',
              quiz,
              questionIndex: quiz.currentQuestionIndex,
            });
          }
        },
      )
      .on('broadcast', { event: 'quiz_answer' }, ({ payload }) => {
        const p = payload as QuizLiveAnswer;
        if (!p?.userId || !p?.questionId) return;
        this.emit(salonId, { type: 'answer_submitted', answer: p });
      })
      .subscribe();

    this.channels.set(salonId, channel);
  }

  async getActiveQuiz(salonId: string): Promise<Quiz | null> {
    await ensureGuestSessionContext();
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return syncFromRow(data);
  }

  async createPresetQuiz(
    salonId: string,
    createdBy: string,
    preset: 'general' | 'tech' | 'culture',
  ): Promise<Quiz | null> {
    await ensureGuestSessionContext();

    const existing = await this.getActiveQuiz(salonId);
    if (existing) return existing;

    const local = quizService.createPresetQuiz(salonId, createdBy, preset);

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        id: local.id,
        salon_id: salonId,
        created_by: createdBy,
        title: local.title,
        questions: local.questions,
        is_active: false,
        current_question_index: 0,
        answers: [],
      })
      .select()
      .single();

    if (error) {
      console.error('createPresetQuiz:', error);
      return null;
    }
    return syncFromRow(data);
  }

  async startQuiz(quizId: string): Promise<Quiz | null> {
    await ensureGuestSessionContext();

    const { data: row, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', quizId)
      .single();

    if (fetchError || !row) return null;
    syncFromRow(row);

    const local = quizService.startQuiz(quizId);
    if (!local) return null;

    const { data, error } = await supabase
      .from('quiz_sessions')
      .update({
        is_active: true,
        started_at: local.startedAt?.toISOString(),
        ends_at: local.endsAt?.toISOString(),
        current_question_index: 0,
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) return null;
    const quiz = syncFromRow(data);
    this.emit(quiz.salonId, { type: 'quiz_started', quiz });
    return quiz;
  }

  async submitAnswer(
    quizId: string,
    salonId: string,
    userId: string,
    userName: string,
    questionId: string,
    answer: number,
  ): Promise<{
    isCorrect: boolean;
    pointsEarned: number;
    isLate: boolean;
    alreadyAnswered: boolean;
    liveAnswer?: QuizLiveAnswer;
  }> {
    await ensureGuestSessionContext();

    const { data: row, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', quizId)
      .single();

    if (fetchError || !row) {
      return { isCorrect: false, pointsEarned: 0, isLate: true, alreadyAnswered: false };
    }
    syncFromRow(row);

    const result = quizService.submitAnswer(quizId, userId, userName, questionId, answer);
    if (result.alreadyAnswered || !result.liveAnswer) return result;

    const participants = quizService.getLeaderboard(quizId);
    const participantsMap = Object.fromEntries(participants.map(p => [p.userId, p]));
    const existingAnswers = parseLiveAnswers(row);
    const answers = [...existingAnswers, result.liveAnswer];

    await supabase
      .from('quiz_sessions')
      .update({ participants: participantsMap, answers })
      .eq('id', quizId);

    const channel = this.channels.get(salonId);
    void channel?.send({
      type: 'broadcast',
      event: 'quiz_answer',
      payload: result.liveAnswer,
    });

    this.emit(salonId, { type: 'answer_submitted', answer: result.liveAnswer });

    return result;
  }

  async nextQuestion(quizId: string, salonId: string): Promise<QuizQuestion | null> {
    await ensureGuestSessionContext();

    const { data: row } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', quizId)
      .single();

    if (row) syncFromRow(row);

    const next = quizService.nextQuestion(quizId);
    const quiz = quizService.getQuizById(quizId);

    await supabase
      .from('quiz_sessions')
      .update({
        current_question_index: quiz?.currentQuestionIndex ?? 0,
        is_active: !!quiz?.isActive,
      })
      .eq('id', quizId);

    return next;
  }

  async endQuiz(quizId: string, salonId: string): Promise<QuizResult | null> {
    await ensureGuestSessionContext();

    const { data: row } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', quizId)
      .single();

    if (row) syncFromRow(row);

    const result = quizService.endQuiz(quizId);
    if (!result) return null;

    await supabase
      .from('quiz_sessions')
      .update({ is_active: false })
      .eq('id', quizId);

    this.emit(salonId, { type: 'quiz_ended', result });
    return result;
  }

  getLeaderboard(quizId: string): QuizParticipant[] {
    return quizService.getLeaderboard(quizId);
  }

  getCurrentQuestion(quizId: string): QuizQuestion | null {
    return quizService.getCurrentQuestion(quizId);
  }

  getAnswersForQuestion(quizId: string, questionId: string): QuizLiveAnswer[] {
    return quizService.getAnswersForQuestion(quizId, questionId);
  }

  hasUserAnswered(quizId: string, userId: string, questionId: string): boolean {
    return quizService.hasUserAnswered(quizId, userId, questionId);
  }
}

export const quizRealtimeService = new QuizRealtimeService();

export function formatQuizAnswerMessage(answer: QuizLiveAnswer): string {
  const mark = answer.isCorrect ? '✓' : '✗';
  const pts = answer.isCorrect ? ` (+${answer.pointsEarned} pts)` : '';
  return `📝 ${answer.userName} a répondu : ${answer.answerLabel} ${mark}${pts}`;
}
