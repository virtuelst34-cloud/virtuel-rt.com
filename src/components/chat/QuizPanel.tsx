import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Brain, Play, Trophy, X, Users } from 'lucide-react';
import { useUser } from '@/lib/contexts';
import {
  quizRealtimeService,
  QuizEvent,
  formatQuizAnswerMessage,
} from '@/lib/quizRealtimeService';
import type { Quiz, QuizQuestion, QuizParticipant, QuizLiveAnswer } from '@/lib/quiz';

interface QuizPanelProps {
  salonId: string;
  onClose?: () => void;
  onAnswerPosted?: (text: string) => void;
}

function mergeAnswers(existing: QuizLiveAnswer[], incoming: QuizLiveAnswer[]): QuizLiveAnswer[] {
  const map = new Map(existing.map(a => [`${a.userId}:${a.questionId}`, a]));
  for (const a of incoming) map.set(`${a.userId}:${a.questionId}`, a);
  return Array.from(map.values());
}

export default function QuizPanel({ salonId, onClose, onAnswerPosted }: QuizPanelProps) {
  const { user } = useUser();
  const userId = user?.name || '';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [displayQuestion, setDisplayQuestion] = useState<QuizQuestion | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizParticipant[]>([]);
  const [liveAnswers, setLiveAnswers] = useState<QuizLiveAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const questionIndexRef = useRef<number>(-1);
  const postedAnswersRef = useRef<Set<string>>(new Set());

  const applyQuestion = useCallback((activeQuiz: Quiz, answers?: QuizLiveAnswer[]) => {
    const idx = activeQuiz.currentQuestionIndex;
    const q = activeQuiz.questions[idx];
    if (!q) return;

    if (idx !== questionIndexRef.current) {
      questionIndexRef.current = idx;
      setDisplayQuestion(q);
      setSelected(null);
      setHasSubmitted(false);
      setFeedback(null);
      postedAnswersRef.current = new Set();
    }

    const questionAnswers =
      answers?.filter(a => a.questionId === q.id) ??
      quizRealtimeService.getAnswersForQuestion(activeQuiz.id, q.id);
    setLiveAnswers(questionAnswers);

    if (userId && quizRealtimeService.hasUserAnswered(activeQuiz.id, userId, q.id)) {
      const mine = questionAnswers.find(a => a.userId === userId);
      if (mine) {
        setSelected(mine.answerIndex);
        setHasSubmitted(true);
      }
    }
  }, [userId]);

  const refreshQuiz = useCallback(async () => {
    const active = await quizRealtimeService.getActiveQuiz(salonId);
    setQuiz(active);
    if (active) {
      applyQuestion(active);
      setLeaderboard(quizRealtimeService.getLeaderboard(active.id));
    } else {
      setDisplayQuestion(null);
      setLiveAnswers([]);
      questionIndexRef.current = -1;
    }
  }, [salonId, applyQuestion]);

  useEffect(() => { void refreshQuiz(); }, [refreshQuiz]);

  const postAnswerToSalon = useCallback((answer: QuizLiveAnswer) => {
    const key = `${answer.userId}:${answer.questionId}`;
    if (postedAnswersRef.current.has(key)) return;
    postedAnswersRef.current.add(key);
    onAnswerPosted?.(formatQuizAnswerMessage(answer));
  }, [onAnswerPosted]);

  useEffect(() => {
    return quizRealtimeService.subscribe(salonId, (event: QuizEvent) => {
      if (event.type === 'quiz_started') {
        setQuiz(event.quiz);
        applyQuestion(event.quiz);
        setLeaderboard(quizRealtimeService.getLeaderboard(event.quiz.id));
      }

      if (event.type === 'quiz_updated') {
        setQuiz(event.quiz);
        setLeaderboard(quizRealtimeService.getLeaderboard(event.quiz.id));

        if (event.quiz.isActive) {
          const idxChanged = event.questionIndex !== questionIndexRef.current;
          if (idxChanged) {
            applyQuestion(event.quiz);
          } else if (displayQuestion) {
            const answers = quizRealtimeService.getAnswersForQuestion(
              event.quiz.id,
              displayQuestion.id,
            );
            setLiveAnswers(prev => mergeAnswers(prev, answers));
            for (const a of answers) postAnswerToSalon(a);
          }
        }
      }

      if (event.type === 'quiz_ended') {
        setLeaderboard(event.result.participants);
        setFeedback(`Gagnant : ${event.result.winner?.userName ?? '—'}`);
        setQuiz(null);
        setDisplayQuestion(null);
        setLiveAnswers([]);
        questionIndexRef.current = -1;
      }

      if (event.type === 'answer_submitted') {
        setLiveAnswers(prev => mergeAnswers(prev, [event.answer]));
        if (quiz) {
          setLeaderboard(quizRealtimeService.getLeaderboard(quiz.id));
        }
        postAnswerToSalon(event.answer);
      }
    });
  }, [salonId, quiz, displayQuestion, applyQuestion, postAnswerToSalon]);

  const startPreset = async (preset: 'general' | 'tech' | 'culture') => {
    if (!user?.name || quiz) return;
    setCreating(true);
    const created = await quizRealtimeService.createPresetQuiz(salonId, user.name, preset);
    if (created) await quizRealtimeService.startQuiz(created.id);
    setCreating(false);
  };

  const submitAnswer = async () => {
    if (!quiz || !displayQuestion || selected === null || !user?.name || hasSubmitted) return;

    const result = await quizRealtimeService.submitAnswer(
      quiz.id, salonId, user.name, user.name, displayQuestion.id, selected,
    );

    if (result.alreadyAnswered) {
      setHasSubmitted(true);
      return;
    }

    setHasSubmitted(true);
    if (result.liveAnswer) {
      setLiveAnswers(prev => mergeAnswers(prev, [result.liveAnswer!]));
      postAnswerToSalon(result.liveAnswer);
    }
    setFeedback(
      result.isCorrect
        ? `✓ +${result.pointsEarned} pts`
        : result.isLate
          ? 'Trop tard !'
          : '✗ Incorrect',
    );
  };

  return (
    <div className="border-b border-border bg-card/80 px-4 py-3 shrink-0" data-testid="quiz-panel">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Brain className="w-4 h-4 text-primary" /> Quiz en direct
          {quiz && (
            <span className="text-[10px] font-normal text-muted-foreground">
              — {quiz.title}
            </span>
          )}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!quiz && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-muted-foreground w-full mb-0.5">Choisir un thème :</span>
          {(['general', 'tech', 'culture'] as const).map(preset => (
            <button
              key={preset}
              type="button"
              disabled={creating || !user}
              onClick={() => startPreset(preset)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-xs text-primary hover:bg-primary/25 disabled:opacity-50">
              <Play className="w-3 h-3" /> {preset}
            </button>
          ))}
        </div>
      )}

      {quiz && displayQuestion && (
        <div className="space-y-2">
          <p className="text-sm text-foreground font-medium">{displayQuestion.question}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {displayQuestion.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={hasSubmitted}
                onClick={() => !hasSubmitted && setSelected(i)}
                className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors disabled:cursor-not-allowed ${
                  selected === i
                    ? 'bg-primary/20 border-primary/50 text-foreground'
                    : 'bg-secondary border-border text-muted-foreground'
                } ${hasSubmitted ? 'opacity-70' : ''}`}>
                {opt}
              </button>
            ))}
          </div>
          {!hasSubmitted && (
            <button
              type="button"
              onClick={submitAnswer}
              disabled={selected === null}
              className="w-full py-2 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50">
              Valider
            </button>
          )}
          {hasSubmitted && (
            <p className="text-[10px] text-muted-foreground text-center">Réponse enregistrée — en attente des autres joueurs</p>
          )}
        </div>
      )}

      {liveAnswers.length > 0 && (
        <div className="mt-2 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Users className="w-3 h-3" /> Réponses
          </div>
          {liveAnswers.map(a => (
            <div key={`${a.userId}-${a.createdAt}`} className="flex justify-between text-xs py-0.5">
              <span className="text-foreground truncate">{a.userName}</span>
              <span className={a.isCorrect ? 'text-emerald-400' : 'text-muted-foreground'}>
                {a.answerLabel} {a.isCorrect ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      {feedback && <p className="text-xs text-emerald-400 mt-2">{feedback}</p>}

      {leaderboard.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Trophy className="w-3 h-3" /> Classement
          </div>
          {leaderboard.slice(0, 5).map((p, i) => (
            <div key={p.userId} className="flex justify-between text-xs py-0.5">
              <span className="text-foreground">{i + 1}. {p.userName}</span>
              <span className="text-primary font-medium">{p.totalPoints} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
